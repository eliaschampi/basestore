-- Migration: create product transfers
-- Created: 2026-03-06T09:45:00.000Z

-- ==================== UP ====================
CREATE TABLE public.product_transfers (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  source_branch_code UUID NOT NULL,
  destination_branch_code UUID NOT NULL,
  user_code UUID NOT NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_transfers_pk PRIMARY KEY (code),
  CONSTRAINT product_transfers_source_branch_fk FOREIGN KEY (source_branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT product_transfers_destination_branch_fk FOREIGN KEY (destination_branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT product_transfers_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT product_transfers_distinct_branches_check CHECK (source_branch_code <> destination_branch_code)
);

CREATE TABLE public.product_transfer_items (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  transfer_code UUID NOT NULL,
  product_code UUID NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_transfer_items_pk PRIMARY KEY (code),
  CONSTRAINT product_transfer_items_transfer_fk FOREIGN KEY (transfer_code) REFERENCES public.product_transfers (code) ON DELETE CASCADE,
  CONSTRAINT product_transfer_items_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE RESTRICT,
  CONSTRAINT product_transfer_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT product_transfer_items_transfer_product_uq UNIQUE (transfer_code, product_code)
);

ALTER TABLE public.inventory_movements
  ADD COLUMN transfer_code UUID NULL;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_transfer_fk FOREIGN KEY (transfer_code) REFERENCES public.product_transfers (code) ON DELETE SET NULL;

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT inventory_movements_reason_check,
  DROP CONSTRAINT inventory_movements_reason_direction_check,
  DROP CONSTRAINT inventory_movements_reference_check;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_reason_check CHECK (reason IN ('purchase', 'sale', 'purchase_refund', 'manual_adjustment', 'transfer')),
  ADD CONSTRAINT inventory_movements_reason_direction_check CHECK (
    (reason = 'purchase' AND direction = 'in')
    OR (reason = 'sale' AND direction = 'out')
    OR (reason = 'purchase_refund' AND direction = 'out')
    OR (reason = 'transfer')
    OR (reason = 'manual_adjustment')
  ),
  ADD CONSTRAINT inventory_movements_reference_check CHECK (
    (reason = 'purchase' AND purchase_code IS NOT NULL)
    OR (reason = 'sale' AND sale_code IS NOT NULL)
    OR (reason = 'purchase_refund' AND purchase_code IS NOT NULL)
    OR (reason = 'transfer' AND transfer_code IS NOT NULL)
    OR (reason = 'manual_adjustment')
  );

CREATE INDEX product_transfers_source_branch_transferred_idx
  ON public.product_transfers (source_branch_code, transferred_at DESC);
CREATE INDEX product_transfers_destination_branch_transferred_idx
  ON public.product_transfers (destination_branch_code, transferred_at DESC);
CREATE INDEX product_transfers_transferred_at_idx
  ON public.product_transfers (transferred_at DESC);
CREATE INDEX product_transfer_items_transfer_idx
  ON public.product_transfer_items (transfer_code);
CREATE INDEX product_transfer_items_product_idx
  ON public.product_transfer_items (product_code);
CREATE INDEX product_transfer_items_product_transfer_idx
  ON public.product_transfer_items (product_code, transfer_code);
CREATE INDEX inventory_movements_transfer_idx
  ON public.inventory_movements (transfer_code);

CREATE TRIGGER product_transfers_updated_at_tg
BEFORE UPDATE ON public.product_transfers
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER product_transfer_items_updated_at_tg
BEFORE UPDATE ON public.product_transfer_items
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE OR REPLACE FUNCTION public.inventory_create_product_transfer(
  p_source_branch_code UUID,
  p_destination_branch_code UUID,
  p_user_code UUID,
  p_transferred_at TIMESTAMPTZ,
  p_note TEXT,
  p_items JSONB
)
RETURNS public.product_transfers
LANGUAGE plpgsql
AS $$
DECLARE
  v_transfer public.product_transfers%ROWTYPE;
  v_item RECORD;
  v_items_count INTEGER := 0;
  v_transferred_at TIMESTAMPTZ := COALESCE(p_transferred_at, CURRENT_TIMESTAMP);
  v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
  v_source_branch_name TEXT;
  v_destination_branch_name TEXT;
  v_outbound_note TEXT;
  v_inbound_note TEXT;
BEGIN
  IF p_source_branch_code IS NULL OR p_destination_branch_code IS NULL THEN
    RAISE EXCEPTION 'Debes indicar sede origen y sede destino'
      USING ERRCODE = '23514';
  END IF;

  IF p_source_branch_code = p_destination_branch_code THEN
    RAISE EXCEPTION 'La sede origen y la sede destino deben ser distintas'
      USING ERRCODE = '23514';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de transferencia'
      USING ERRCODE = '23514';
  END IF;

  SELECT b.name
  INTO v_source_branch_name
  FROM public.branches b
  WHERE b.code = p_source_branch_code
  LIMIT 1;

  IF v_source_branch_name IS NULL THEN
    RAISE EXCEPTION 'Sede origen no encontrada'
      USING ERRCODE = '23503';
  END IF;

  SELECT b.name
  INTO v_destination_branch_name
  FROM public.branches b
  WHERE b.code = p_destination_branch_code
  LIMIT 1;

  IF v_destination_branch_name IS NULL THEN
    RAISE EXCEPTION 'Sede destino no encontrada'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.product_transfers (
    source_branch_code,
    destination_branch_code,
    user_code,
    transferred_at,
    note
  ) VALUES (
    p_source_branch_code,
    p_destination_branch_code,
    p_user_code,
    v_transferred_at,
    v_note
  )
  RETURNING * INTO v_transfer;

  FOR v_item IN
    SELECT
      item.product_code,
      item.quantity
    FROM jsonb_to_recordset(p_items) AS item(
      product_code UUID,
      quantity INTEGER
    )
  LOOP
    IF v_item.product_code IS NULL THEN
      RAISE EXCEPTION 'Cada item debe incluir product_code'
        USING ERRCODE = '23514';
    END IF;

    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'La cantidad de cada item debe ser mayor a 0'
        USING ERRCODE = '23514';
    END IF;

    v_items_count := v_items_count + 1;
    v_outbound_note := CASE
      WHEN v_note IS NULL THEN FORMAT('Transferencia a %s', v_destination_branch_name)
      ELSE FORMAT('Transferencia a %s: %s', v_destination_branch_name, v_note)
    END;
    v_inbound_note := CASE
      WHEN v_note IS NULL THEN FORMAT('Transferencia desde %s', v_source_branch_name)
      ELSE FORMAT('Transferencia desde %s: %s', v_source_branch_name, v_note)
    END;

    INSERT INTO public.product_transfer_items (
      transfer_code,
      product_code,
      quantity
    ) VALUES (
      v_transfer.code,
      v_item.product_code,
      v_item.quantity
    );

    INSERT INTO public.inventory_movements (
      product_code,
      branch_code,
      user_code,
      quantity,
      direction,
      reason,
      purchase_code,
      sale_code,
      transfer_code,
      occurred_at,
      note
    ) VALUES (
      v_item.product_code,
      v_transfer.source_branch_code,
      v_transfer.user_code,
      v_item.quantity,
      'out',
      'transfer',
      NULL,
      NULL,
      v_transfer.code,
      v_transferred_at,
      v_outbound_note
    );

    INSERT INTO public.inventory_movements (
      product_code,
      branch_code,
      user_code,
      quantity,
      direction,
      reason,
      purchase_code,
      sale_code,
      transfer_code,
      occurred_at,
      note
    ) VALUES (
      v_item.product_code,
      v_transfer.destination_branch_code,
      v_transfer.user_code,
      v_item.quantity,
      'in',
      'transfer',
      NULL,
      NULL,
      v_transfer.code,
      v_transferred_at,
      v_inbound_note
    );
  END LOOP;

  IF v_items_count = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un item de transferencia'
      USING ERRCODE = '23514';
  END IF;

  RETURN v_transfer;
END;
$$;

CREATE OR REPLACE VIEW public.inventory_product_transfer_feed AS
SELECT
  pt.code,
  pt.source_branch_code,
  pt.destination_branch_code,
  pt.user_code,
  pt.transferred_at,
  pt.note,
  pt.created_at,
  pt.updated_at,
  COALESCE(items.item_count, 0) AS item_count,
  COALESCE(items.total_quantity, 0) AS total_quantity,
  COALESCE(items.products_summary, '') AS products_summary,
  items.primary_product_code,
  items.primary_product_name,
  items.primary_product_sku,
  COALESCE(items.items, '[]'::jsonb) AS items,
  source_branch.name AS source_branch_name,
  destination_branch.name AS destination_branch_name
FROM public.product_transfers pt
INNER JOIN public.branches source_branch ON source_branch.code = pt.source_branch_code
INNER JOIN public.branches destination_branch ON destination_branch.code = pt.destination_branch_code
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS item_count,
    COALESCE(SUM(pti.quantity), 0)::int AS total_quantity,
    STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) AS products_summary,
    (ARRAY_AGG(p.code ORDER BY p.name ASC, pti.created_at ASC))[1] AS primary_product_code,
    (ARRAY_AGG(p.name ORDER BY p.name ASC, pti.created_at ASC))[1] AS primary_product_name,
    (ARRAY_AGG(p.sku ORDER BY p.name ASC, pti.created_at ASC))[1] AS primary_product_sku,
    jsonb_agg(
      jsonb_build_object(
        'code', pti.code,
        'transfer_code', pti.transfer_code,
        'product_code', pti.product_code,
        'product_name', p.name,
        'product_sku', p.sku,
        'quantity', pti.quantity,
        'created_at', pti.created_at,
        'updated_at', pti.updated_at
      )
      ORDER BY p.name ASC, pti.created_at ASC
    ) AS items
  FROM public.product_transfer_items pti
  INNER JOIN public.products p ON p.code = pti.product_code
  WHERE pti.transfer_code = pt.code
) AS items ON TRUE;

CREATE OR REPLACE VIEW public.inventory_movement_feed AS
SELECT
  m.code,
  m.product_code,
  m.branch_code,
  m.user_code,
  m.quantity,
  m.direction,
  m.reason,
  m.purchase_code,
  m.sale_code,
  m.occurred_at,
  m.note,
  m.created_at,
  m.updated_at,
  p.name AS product_name,
  p.sku AS product_sku,
  b.name AS branch_name,
  m.transfer_code
FROM public.inventory_movements m
INNER JOIN public.products p ON p.code = m.product_code
INNER JOIN public.branches b ON b.code = m.branch_code;

CREATE OR REPLACE FUNCTION public.inventory_list_product_transfers(
  p_source_branch_code UUID DEFAULT NULL,
  p_destination_branch_code UUID DEFAULT NULL,
  p_product_code UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
  code UUID,
  source_branch_code UUID,
  destination_branch_code UUID,
  user_code UUID,
  transferred_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  item_count INTEGER,
  total_quantity INTEGER,
  products_summary TEXT,
  primary_product_code UUID,
  primary_product_name TEXT,
  primary_product_sku TEXT,
  items JSONB,
  source_branch_name TEXT,
  destination_branch_name TEXT,
  total_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH filtered AS (
  SELECT iptf.*
  FROM public.inventory_product_transfer_feed iptf
  WHERE (p_source_branch_code IS NULL OR iptf.source_branch_code = p_source_branch_code)
    AND (p_destination_branch_code IS NULL OR iptf.destination_branch_code = p_destination_branch_code)
    AND (
      p_product_code IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.product_transfer_items pti
        WHERE pti.transfer_code = iptf.code
          AND pti.product_code = p_product_code
      )
    )
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR iptf.products_summary ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(iptf.note, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR iptf.source_branch_name ILIKE '%' || BTRIM(p_search) || '%'
      OR iptf.destination_branch_name ILIKE '%' || BTRIM(p_search) || '%'
      OR EXISTS (
        SELECT 1
        FROM public.product_transfer_items pti
        INNER JOIN public.products p ON p.code = pti.product_code
        WHERE pti.transfer_code = iptf.code
          AND COALESCE(p.sku, '') ILIKE '%' || BTRIM(p_search) || '%'
      )
    )
),
ranked AS (
  SELECT
    filtered.*,
    COUNT(*) OVER ()::int AS total_count
  FROM filtered
  ORDER BY filtered.transferred_at DESC, filtered.created_at DESC
  LIMIT GREATEST(COALESCE(p_page_size, 20), 1)
  OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * GREATEST(COALESCE(p_page_size, 20), 1)
)
SELECT
  ranked.code,
  ranked.source_branch_code,
  ranked.destination_branch_code,
  ranked.user_code,
  ranked.transferred_at,
  ranked.note,
  ranked.created_at,
  ranked.updated_at,
  ranked.item_count,
  ranked.total_quantity,
  ranked.products_summary,
  ranked.primary_product_code,
  ranked.primary_product_name,
  ranked.primary_product_sku,
  ranked.items,
  ranked.source_branch_name,
  ranked.destination_branch_name,
  ranked.total_count
FROM ranked;
$$;

DROP FUNCTION IF EXISTS public.inventory_list_movements(UUID, UUID, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.inventory_list_movements(
  p_branch_code UUID DEFAULT NULL,
  p_product_code UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_direction TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 120
)
RETURNS TABLE(
  code UUID,
  product_code UUID,
  branch_code UUID,
  user_code UUID,
  quantity INTEGER,
  direction TEXT,
  reason TEXT,
  purchase_code UUID,
  sale_code UUID,
  occurred_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  branch_name TEXT,
  transfer_code UUID
)
LANGUAGE sql
STABLE
AS $$
SELECT
  imf.code,
  imf.product_code,
  imf.branch_code,
  imf.user_code,
  imf.quantity,
  imf.direction,
  imf.reason,
  imf.purchase_code,
  imf.sale_code,
  imf.occurred_at,
  imf.note,
  imf.created_at,
  imf.updated_at,
  imf.product_name,
  imf.product_sku,
  imf.branch_name,
  imf.transfer_code
FROM public.inventory_movement_feed imf
WHERE (p_branch_code IS NULL OR imf.branch_code = p_branch_code)
  AND (p_product_code IS NULL OR imf.product_code = p_product_code)
  AND (p_reason IS NULL OR imf.reason = p_reason)
  AND (p_direction IS NULL OR imf.direction = p_direction)
ORDER BY imf.occurred_at DESC, imf.created_at DESC
LIMIT GREATEST(COALESCE(p_limit, 120), 1);
$$;

-- ==================== DOWN ====================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE reason = 'transfer' LIMIT 1) THEN
    RAISE EXCEPTION 'Rollback blocked: existen movimientos de transferencia registrados';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.inventory_list_product_transfers(UUID, UUID, UUID, TEXT, INTEGER, INTEGER);
DROP VIEW IF EXISTS public.inventory_product_transfer_feed;
DROP FUNCTION IF EXISTS public.inventory_create_product_transfer(UUID, UUID, UUID, TIMESTAMPTZ, TEXT, JSONB);

DROP INDEX IF EXISTS inventory_movements_transfer_idx;
DROP INDEX IF EXISTS product_transfer_items_product_transfer_idx;
DROP INDEX IF EXISTS product_transfer_items_product_idx;
DROP INDEX IF EXISTS product_transfer_items_transfer_idx;
DROP INDEX IF EXISTS product_transfers_transferred_at_idx;
DROP INDEX IF EXISTS product_transfers_destination_branch_transferred_idx;
DROP INDEX IF EXISTS product_transfers_source_branch_transferred_idx;

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT inventory_movements_transfer_fk,
  DROP CONSTRAINT inventory_movements_reason_check,
  DROP CONSTRAINT inventory_movements_reason_direction_check,
  DROP CONSTRAINT inventory_movements_reference_check;

ALTER TABLE public.inventory_movements
  DROP COLUMN transfer_code;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_reason_check CHECK (reason IN ('purchase', 'sale', 'purchase_refund', 'manual_adjustment')),
  ADD CONSTRAINT inventory_movements_reason_direction_check CHECK (
    (reason = 'purchase' AND direction = 'in')
    OR (reason = 'sale' AND direction = 'out')
    OR (reason = 'purchase_refund' AND direction = 'out')
    OR (reason = 'manual_adjustment')
  ),
  ADD CONSTRAINT inventory_movements_reference_check CHECK (
    (reason = 'purchase' AND purchase_code IS NOT NULL)
    OR (reason = 'sale' AND sale_code IS NOT NULL)
    OR (reason = 'purchase_refund' AND purchase_code IS NOT NULL)
    OR (reason = 'manual_adjustment')
  );

DROP TABLE IF EXISTS public.product_transfer_items;
DROP TABLE IF EXISTS public.product_transfers;

CREATE OR REPLACE VIEW public.inventory_movement_feed AS
SELECT
  m.code,
  m.product_code,
  m.branch_code,
  m.user_code,
  m.quantity,
  m.direction,
  m.reason,
  m.purchase_code,
  m.sale_code,
  m.occurred_at,
  m.note,
  m.created_at,
  m.updated_at,
  p.name AS product_name,
  p.sku AS product_sku,
  b.name AS branch_name
FROM public.inventory_movements m
INNER JOIN public.products p ON p.code = m.product_code
INNER JOIN public.branches b ON b.code = m.branch_code;

DROP FUNCTION IF EXISTS public.inventory_list_movements(UUID, UUID, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.inventory_list_movements(
  p_branch_code UUID DEFAULT NULL,
  p_product_code UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_direction TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 120
)
RETURNS TABLE(
  code UUID,
  product_code UUID,
  branch_code UUID,
  user_code UUID,
  quantity INTEGER,
  direction TEXT,
  reason TEXT,
  purchase_code UUID,
  sale_code UUID,
  occurred_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  branch_name TEXT
)
LANGUAGE sql
STABLE
AS $$
SELECT
  imf.code,
  imf.product_code,
  imf.branch_code,
  imf.user_code,
  imf.quantity,
  imf.direction,
  imf.reason,
  imf.purchase_code,
  imf.sale_code,
  imf.occurred_at,
  imf.note,
  imf.created_at,
  imf.updated_at,
  imf.product_name,
  imf.product_sku,
  imf.branch_name
FROM public.inventory_movement_feed imf
WHERE (p_branch_code IS NULL OR imf.branch_code = p_branch_code)
  AND (p_product_code IS NULL OR imf.product_code = p_product_code)
  AND (p_reason IS NULL OR imf.reason = p_reason)
  AND (p_direction IS NULL OR imf.direction = p_direction)
ORDER BY imf.occurred_at DESC, imf.created_at DESC
LIMIT GREATEST(COALESCE(p_limit, 120), 1);
$$;
