-- =====================================================
-- Faztore Database Views
-- =====================================================

-- Products Overview View
-- Product media comes from drive_links.product_code + drive_files (scope: product_shared).
CREATE OR REPLACE VIEW products_overview AS
SELECT
    p.code,
    p.name,
    p.description,
    p.brand_code,
    p.category_code,
    p.price,
    p.cost_price,
    p.sku,
    COALESCE(media.images, '[]'::jsonb) AS images,
    p.is_active,
    p.created_at,
    p.updated_at,
    b.name AS brand_name,
    c.name AS category_name,
    (COALESCE(media.images_count, 0) > 0) AS has_images,
    COALESCE(media.images_count, 0) AS images_count,
    media.primary_file_code::text AS primary_image_url
FROM products p
LEFT JOIN brands b ON p.brand_code = b.code
LEFT JOIN categories c ON p.category_code = c.code
LEFT JOIN LATERAL (
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'fileCode', df.code,
                'name', df.name,
                'type', df.type,
                'mimeType', df.mime_type,
                'isPrimary', dl.is_primary,
                'position', dl.position
            )
            ORDER BY dl.is_primary DESC, dl.position ASC, dl.created_at ASC
        ) FILTER (WHERE df.code IS NOT NULL) AS images,
        COUNT(df.code)::int AS images_count,
        COALESCE(
            (ARRAY_AGG(df.code ORDER BY dl.position ASC, dl.created_at ASC) FILTER (WHERE dl.is_primary = TRUE AND df.type = 'img'))[1],
            (ARRAY_AGG(df.code ORDER BY dl.position ASC, dl.created_at ASC) FILTER (WHERE df.type = 'img'))[1]
        ) AS primary_file_code
    FROM drive_links dl
    LEFT JOIN drive_files df
      ON df.code = dl.file_code
     AND df.scope = 'product_shared'
     AND df.deleted_at IS NULL
    WHERE dl.product_code = p.code
) AS media ON TRUE;

-- Inventory overview with stock-health metadata.
CREATE OR REPLACE VIEW public.inventory_overview AS
SELECT
  ib.product_code,
  p.name AS product_name,
  p.sku,
  p.price,
  p.cost_price,
  p.is_active AS product_is_active,
  p.category_code,
  c.name AS category_name,
  ib.branch_code,
  b.name AS branch_name,
  ib.on_hand,
  ib.reserved,
  ib.available,
  ib.inbound,
  ib.reorder_point,
  ib.emergency_point,
  ib.last_movement_at,
  ib.created_at,
  ib.updated_at,
  CASE
    WHEN ib.available <= 0 AND ib.inbound > 0 THEN 'in_transit_only'
    WHEN ib.available <= 0 THEN 'out_of_stock'
    WHEN ib.available <= ib.emergency_point THEN 'emergency'
    WHEN ib.available <= ib.reorder_point THEN 'low'
    ELSE 'healthy'
  END AS stock_state,
  COALESCE(
    LEAST(
      100,
      GREATEST(
        0,
        ROUND((ib.available::numeric / NULLIF(ib.reorder_point::numeric, 0)) * 100)
      )
    ),
    100
  )::INTEGER AS stock_health_pct,
  NOT EXISTS (
    SELECT 1
    FROM public.inventory_movements m
    WHERE m.product_code = ib.product_code
      AND m.branch_code = ib.branch_code
  ) AS awaiting_first_stock
FROM public.inventory_balances ib
INNER JOIN public.products p ON p.code = ib.product_code
INNER JOIN public.branches b ON b.code = ib.branch_code
LEFT JOIN public.categories c ON c.code = p.category_code;

CREATE OR REPLACE VIEW public.inventory_purchase_feed AS
SELECT
  pu.code,
  pu.branch_code,
  pu.user_code,
  pu.origin,
  pu.entry_type,
  pu.tracking_number,
  pu.state,
  pu.ordered_at,
  pu.received_at,
  pu.refunded_at,
  pu.note,
  pu.created_at,
  pu.updated_at,
  COALESCE(items.item_count, 0) AS item_count,
  COALESCE(items.total_quantity, 0) AS total_quantity,
  COALESCE(items.total_amount, 0::numeric)::numeric(14,2) AS total_amount,
  COALESCE(items.products_summary, '') AS products_summary,
  items.primary_product_code,
  items.primary_product_name,
  items.primary_product_sku,
  COALESCE(items.items, '[]'::jsonb) AS items,
  b.name AS branch_name,
  CASE
    WHEN pu.state = 'received' THEN COALESCE(items.can_refund, true)
    ELSE true
  END AS can_refund
FROM public.purchases pu
INNER JOIN public.branches b ON b.code = pu.branch_code
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS item_count,
    COALESCE(SUM(pi.quantity), 0)::int AS total_quantity,
    COALESCE(SUM(pi.total_amount), 0::numeric) AS total_amount,
    STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) AS products_summary,
    (ARRAY_AGG(p.code ORDER BY p.name ASC, pi.created_at ASC))[1] AS primary_product_code,
    (ARRAY_AGG(p.name ORDER BY p.name ASC, pi.created_at ASC))[1] AS primary_product_name,
    (ARRAY_AGG(p.sku ORDER BY p.name ASC, pi.created_at ASC))[1] AS primary_product_sku,
    COALESCE(
      BOOL_AND(
        CASE
          WHEN pu.state = 'received' THEN COALESCE(ib.on_hand, 0) >= pi.quantity
          ELSE true
        END
      ),
      true
    ) AS can_refund,
    jsonb_agg(
      jsonb_build_object(
        'code', pi.code,
        'purchase_code', pi.purchase_code,
        'product_code', pi.product_code,
        'product_name', p.name,
        'product_sku', p.sku,
        'quantity', pi.quantity,
        'unit_cost', pi.unit_cost,
        'total_amount', pi.total_amount,
        'created_at', pi.created_at,
        'updated_at', pi.updated_at
      )
      ORDER BY p.name ASC, pi.created_at ASC
    ) AS items
  FROM public.purchase_items pi
  INNER JOIN public.products p ON p.code = pi.product_code
  LEFT JOIN public.inventory_balances ib
    ON ib.product_code = pi.product_code
   AND ib.branch_code = pu.branch_code
  WHERE pi.purchase_code = pu.code
) AS items ON TRUE;

CREATE OR REPLACE VIEW public.inventory_sale_feed AS
SELECT
  s.code,
  s.branch_code,
  s.user_code,
  s.customer_code,
  s.sale_channel,
  s.fulfillment_type,
  s.shipping_state,
  s.delivery_address,
  s.order_reference,
  s.customer_name,
  s.customer_phone,
  s.sold_at,
  s.note,
  s.voided_at,
  s.voided_by_user_code,
  s.void_note,
  s.created_at,
  s.updated_at,
  COALESCE(items.item_count, 0) AS item_count,
  COALESCE(items.total_quantity, 0) AS total_quantity,
  COALESCE(items.total_amount, 0::numeric)::numeric(14,2) AS total_amount,
  COALESCE(items.profit_amount, 0::numeric)::numeric(14,2) AS profit_amount,
  COALESCE(items.products_summary, '') AS products_summary,
  items.primary_product_code,
  items.primary_product_name,
  items.primary_product_sku,
  COALESCE(items.items, '[]'::jsonb) AS items,
  b.name AS branch_name,
  c.full_name AS customer_full_name,
  u.name AS voided_by_name
FROM public.sales s
INNER JOIN public.branches b ON b.code = s.branch_code
LEFT JOIN public.inventory_customers c ON c.code = s.customer_code
LEFT JOIN public.users u ON u.code = s.voided_by_user_code
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS item_count,
    COALESCE(SUM(si.quantity), 0)::int AS total_quantity,
    COALESCE(SUM(si.total_amount), 0::numeric) AS total_amount,
    COALESCE(SUM((si.unit_price - si.unit_cost) * si.quantity::numeric), 0::numeric) AS profit_amount,
    STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) AS products_summary,
    (ARRAY_AGG(p.code ORDER BY p.name ASC, si.created_at ASC))[1] AS primary_product_code,
    (ARRAY_AGG(p.name ORDER BY p.name ASC, si.created_at ASC))[1] AS primary_product_name,
    (ARRAY_AGG(p.sku ORDER BY p.name ASC, si.created_at ASC))[1] AS primary_product_sku,
    jsonb_agg(
      jsonb_build_object(
        'code', si.code,
        'sale_code', si.sale_code,
        'product_code', si.product_code,
        'product_name', p.name,
        'product_sku', p.sku,
        'quantity', si.quantity,
        'unit_price', si.unit_price,
        'unit_cost', si.unit_cost,
        'total_amount', si.total_amount,
        'profit_amount', ((si.unit_price - si.unit_cost) * si.quantity::numeric)::numeric(14,2),
        'created_at', si.created_at,
        'updated_at', si.updated_at
      )
      ORDER BY p.name ASC, si.created_at ASC
    ) AS items
  FROM public.sale_items si
  INNER JOIN public.products p ON p.code = si.product_code
  WHERE si.sale_code = s.code
) AS items ON TRUE;

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

CREATE OR REPLACE VIEW public.inventory_customer_feed AS
SELECT
  c.code,
  c.full_name,
  c.phone,
  c.note,
  c.created_at,
  c.updated_at
FROM public.inventory_customers c;

CREATE OR REPLACE FUNCTION public.inventory_list_overview(
  p_branch_code UUID DEFAULT NULL,
  p_category_code UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_stock TEXT DEFAULT 'all',
  p_include_inactive BOOLEAN DEFAULT false,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 30
)
RETURNS TABLE(
  product_code UUID,
  product_name TEXT,
  sku TEXT,
  price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  product_is_active BOOLEAN,
  category_code UUID,
  category_name TEXT,
  branch_code UUID,
  branch_name TEXT,
  on_hand INTEGER,
  reserved INTEGER,
  available INTEGER,
  inbound INTEGER,
  reorder_point INTEGER,
  emergency_point INTEGER,
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  stock_state TEXT,
  stock_health_pct INTEGER,
  awaiting_first_stock BOOLEAN,
  total_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH filtered AS (
  SELECT io.*
  FROM public.inventory_overview io
  WHERE (p_branch_code IS NULL OR io.branch_code = p_branch_code)
    AND (p_category_code IS NULL OR io.category_code = p_category_code)
    AND (p_include_inactive OR io.product_is_active = true)
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR io.product_name ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(io.sku, '') ILIKE '%' || BTRIM(p_search) || '%'
    )
    AND (
      COALESCE(p_stock, 'all') = 'all'
      OR (COALESCE(p_stock, 'all') = 'critical' AND io.stock_state IN ('out_of_stock', 'emergency'))
      OR io.stock_state = COALESCE(p_stock, 'all')
    )
),
ranked AS (
  SELECT
    filtered.*,
    COUNT(*) OVER ()::int AS total_count
  FROM filtered
  ORDER BY
    CASE filtered.stock_state
      WHEN 'out_of_stock' THEN 1
      WHEN 'emergency' THEN 2
      WHEN 'low' THEN 3
      WHEN 'in_transit_only' THEN 4
      ELSE 5
    END,
    filtered.product_name ASC,
    filtered.branch_name ASC
  LIMIT GREATEST(COALESCE(p_page_size, 30), 1)
  OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * GREATEST(COALESCE(p_page_size, 30), 1)
)
SELECT
  ranked.product_code,
  ranked.product_name,
  ranked.sku,
  ranked.price,
  ranked.cost_price,
  ranked.product_is_active,
  ranked.category_code,
  ranked.category_name,
  ranked.branch_code,
  ranked.branch_name,
  ranked.on_hand,
  ranked.reserved,
  ranked.available,
  ranked.inbound,
  ranked.reorder_point,
  ranked.emergency_point,
  ranked.last_movement_at,
  ranked.created_at,
  ranked.updated_at,
  ranked.stock_state,
  ranked.stock_health_pct,
  ranked.awaiting_first_stock,
  ranked.total_count
FROM ranked;
$$;

CREATE OR REPLACE FUNCTION public.inventory_overview_summary(
  p_branch_code UUID DEFAULT NULL,
  p_category_code UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_stock TEXT DEFAULT 'all',
  p_include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE(
  total_products INTEGER,
  healthy_count INTEGER,
  low_count INTEGER,
  emergency_count INTEGER,
  out_of_stock_count INTEGER,
  in_transit_only_count INTEGER,
  total_available INTEGER,
  total_inbound INTEGER
)
LANGUAGE sql
STABLE
AS $$
SELECT
  COUNT(*)::int AS total_products,
  COUNT(*) FILTER (WHERE io.stock_state = 'healthy')::int AS healthy_count,
  COUNT(*) FILTER (WHERE io.stock_state = 'low')::int AS low_count,
  COUNT(*) FILTER (WHERE io.stock_state = 'emergency')::int AS emergency_count,
  COUNT(*) FILTER (WHERE io.stock_state = 'out_of_stock')::int AS out_of_stock_count,
  COUNT(*) FILTER (WHERE io.stock_state = 'in_transit_only')::int AS in_transit_only_count,
  COALESCE(SUM(io.available), 0)::int AS total_available,
  COALESCE(SUM(io.inbound), 0)::int AS total_inbound
FROM public.inventory_overview io
WHERE (p_branch_code IS NULL OR io.branch_code = p_branch_code)
  AND (p_category_code IS NULL OR io.category_code = p_category_code)
  AND (p_include_inactive OR io.product_is_active = true)
  AND (
    NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
    OR io.product_name ILIKE '%' || BTRIM(p_search) || '%'
    OR COALESCE(io.sku, '') ILIKE '%' || BTRIM(p_search) || '%'
  )
  AND (
    COALESCE(p_stock, 'all') = 'all'
    OR (COALESCE(p_stock, 'all') = 'critical' AND io.stock_state IN ('out_of_stock', 'emergency'))
    OR io.stock_state = COALESCE(p_stock, 'all')
  );
$$;

CREATE OR REPLACE FUNCTION public.inventory_list_purchases(
  p_branch_code UUID DEFAULT NULL,
  p_product_code UUID DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_entry_type TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
  code UUID,
  branch_code UUID,
  user_code UUID,
  origin TEXT,
  entry_type TEXT,
  tracking_number TEXT,
  state TEXT,
  ordered_at DATE,
  received_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  item_count INTEGER,
  total_quantity INTEGER,
  total_amount NUMERIC(14,2),
  products_summary TEXT,
  primary_product_code UUID,
  primary_product_name TEXT,
  primary_product_sku TEXT,
  items JSONB,
  branch_name TEXT,
  can_refund BOOLEAN,
  total_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH filtered AS (
  SELECT ipf.*
  FROM public.inventory_purchase_feed ipf
  WHERE (p_branch_code IS NULL OR ipf.branch_code = p_branch_code)
    AND (p_state IS NULL OR ipf.state = p_state)
    AND (p_origin IS NULL OR ipf.origin = p_origin)
    AND (p_entry_type IS NULL OR ipf.entry_type = p_entry_type)
    AND (
      p_product_code IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.purchase_items pi
        WHERE pi.purchase_code = ipf.code
          AND pi.product_code = p_product_code
      )
    )
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR ipf.products_summary ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(ipf.tracking_number, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR EXISTS (
        SELECT 1
        FROM public.purchase_items pi
        INNER JOIN public.products p ON p.code = pi.product_code
        WHERE pi.purchase_code = ipf.code
          AND COALESCE(p.sku, '') ILIKE '%' || BTRIM(p_search) || '%'
      )
    )
),
ranked AS (
  SELECT
    filtered.*,
    COUNT(*) OVER ()::int AS total_count
  FROM filtered
  ORDER BY filtered.ordered_at DESC, filtered.created_at DESC
  LIMIT GREATEST(COALESCE(p_page_size, 20), 1)
  OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * GREATEST(COALESCE(p_page_size, 20), 1)
)
SELECT
  ranked.code,
  ranked.branch_code,
  ranked.user_code,
  ranked.origin,
  ranked.entry_type,
  ranked.tracking_number,
  ranked.state,
  ranked.ordered_at,
  ranked.received_at,
  ranked.refunded_at,
  ranked.note,
  ranked.created_at,
  ranked.updated_at,
  ranked.item_count,
  ranked.total_quantity,
  ranked.total_amount,
  ranked.products_summary,
  ranked.primary_product_code,
  ranked.primary_product_name,
  ranked.primary_product_sku,
  ranked.items,
  ranked.branch_name,
  ranked.can_refund,
  ranked.total_count
FROM ranked;
$$;

CREATE OR REPLACE FUNCTION public.inventory_list_sales(
  p_branch_code UUID DEFAULT NULL,
  p_product_code UUID DEFAULT NULL,
  p_customer_code UUID DEFAULT NULL,
  p_shipping_state TEXT DEFAULT NULL,
  p_sale_channel TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE(
  code UUID,
  branch_code UUID,
  user_code UUID,
  customer_code UUID,
  sale_channel TEXT,
  fulfillment_type TEXT,
  shipping_state TEXT,
  delivery_address TEXT,
  order_reference TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  sold_at TIMESTAMPTZ,
  note TEXT,
  voided_at TIMESTAMPTZ,
  voided_by_user_code UUID,
  void_note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  item_count INTEGER,
  total_quantity INTEGER,
  total_amount NUMERIC(14,2),
  profit_amount NUMERIC(14,2),
  products_summary TEXT,
  primary_product_code UUID,
  primary_product_name TEXT,
  primary_product_sku TEXT,
  items JSONB,
  branch_name TEXT,
  customer_full_name TEXT,
  voided_by_name TEXT,
  total_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH filtered AS (
  SELECT isf.*
  FROM public.inventory_sale_feed isf
  WHERE (p_branch_code IS NULL OR isf.branch_code = p_branch_code)
    AND (p_customer_code IS NULL OR isf.customer_code = p_customer_code)
    AND (p_shipping_state IS NULL OR isf.shipping_state = p_shipping_state)
    AND (p_sale_channel IS NULL OR isf.sale_channel = p_sale_channel)
    AND (
      p_product_code IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.sale_items si
        WHERE si.sale_code = isf.code
          AND si.product_code = p_product_code
      )
    )
    AND (
      COALESCE(p_status, 'all') = 'all'
      OR (COALESCE(p_status, 'all') = 'active' AND isf.voided_at IS NULL)
      OR (COALESCE(p_status, 'all') = 'voided' AND isf.voided_at IS NOT NULL)
    )
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR isf.products_summary ILIKE '%' || BTRIM(p_search) || '%'
      OR isf.customer_name ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(isf.customer_phone, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(isf.order_reference, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(isf.void_note, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR EXISTS (
        SELECT 1
        FROM public.sale_items si
        INNER JOIN public.products p ON p.code = si.product_code
        WHERE si.sale_code = isf.code
          AND COALESCE(p.sku, '') ILIKE '%' || BTRIM(p_search) || '%'
      )
    )
),
ranked AS (
  SELECT
    filtered.*,
    COUNT(*) OVER ()::int AS total_count
  FROM filtered
  ORDER BY filtered.sold_at DESC, filtered.created_at DESC
  LIMIT GREATEST(COALESCE(p_page_size, 20), 1)
  OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * GREATEST(COALESCE(p_page_size, 20), 1)
)
SELECT
  ranked.code,
  ranked.branch_code,
  ranked.user_code,
  ranked.customer_code,
  ranked.sale_channel,
  ranked.fulfillment_type,
  ranked.shipping_state,
  ranked.delivery_address,
  ranked.order_reference,
  ranked.customer_name,
  ranked.customer_phone,
  ranked.sold_at,
  ranked.note,
  ranked.voided_at,
  ranked.voided_by_user_code,
  ranked.void_note,
  ranked.created_at,
  ranked.updated_at,
  ranked.item_count,
  ranked.total_quantity,
  ranked.total_amount,
  ranked.profit_amount,
  ranked.products_summary,
  ranked.primary_product_code,
  ranked.primary_product_name,
  ranked.primary_product_sku,
  ranked.items,
  ranked.branch_name,
  ranked.customer_full_name,
  ranked.voided_by_name,
  ranked.total_count
FROM ranked;
$$;

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

CREATE OR REPLACE FUNCTION public.inventory_list_customers(
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 30
)
RETURNS TABLE(
  code UUID,
  full_name TEXT,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH filtered AS (
  SELECT icf.*
  FROM public.inventory_customer_feed icf
  WHERE (
    NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
    OR icf.full_name ILIKE '%' || BTRIM(p_search) || '%'
    OR COALESCE(icf.phone, '') ILIKE '%' || BTRIM(p_search) || '%'
  )
),
ranked AS (
  SELECT
    filtered.*,
    COUNT(*) OVER ()::int AS total_count
  FROM filtered
  ORDER BY filtered.updated_at DESC, filtered.full_name ASC
  LIMIT GREATEST(COALESCE(p_page_size, 30), 1)
  OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * GREATEST(COALESCE(p_page_size, 30), 1)
)
SELECT
  ranked.code,
  ranked.full_name,
  ranked.phone,
  ranked.note,
  ranked.created_at,
  ranked.updated_at,
  ranked.total_count
FROM ranked;
$$;

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
