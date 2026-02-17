-- Migration: create inventory core tables
-- Created: 2026-02-17T19:30:00.000Z

-- ==================== UP ====================

CREATE TABLE IF NOT EXISTS public.inventory_balances (
  product_code UUID NOT NULL,
  branch_code UUID NOT NULL,
  on_hand INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  inbound INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  emergency_point INTEGER NOT NULL DEFAULT 3,
  available INTEGER GENERATED ALWAYS AS (GREATEST(on_hand - reserved, 0)) STORED,
  last_movement_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_balances_pk PRIMARY KEY (product_code, branch_code),
  CONSTRAINT inventory_balances_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE CASCADE,
  CONSTRAINT inventory_balances_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_on_hand_check CHECK (on_hand >= 0),
  CONSTRAINT inventory_balances_reserved_check CHECK (reserved >= 0),
  CONSTRAINT inventory_balances_inbound_check CHECK (inbound >= 0),
  CONSTRAINT inventory_balances_reorder_point_check CHECK (reorder_point >= 0),
  CONSTRAINT inventory_balances_emergency_point_check CHECK (emergency_point >= 0),
  CONSTRAINT inventory_balances_threshold_order_check CHECK (reorder_point >= emergency_point)
);

CREATE TABLE IF NOT EXISTS public.inventory_purchases (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  product_code UUID NOT NULL,
  branch_code UUID NOT NULL,
  user_code UUID NOT NULL,
  origin VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'in_transit',
  ordered_at DATE NOT NULL DEFAULT CURRENT_DATE,
  received_at TIMESTAMPTZ NULL,
  refunded_at TIMESTAMPTZ NULL,
  unit_cost NUMERIC(12,2) NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_purchases_pk PRIMARY KEY (code),
  CONSTRAINT inventory_purchases_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_purchases_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_purchases_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_purchases_origin_check CHECK (origin IN ('temu', 'aliexpress', 'lima')),
  CONSTRAINT inventory_purchases_quantity_check CHECK (quantity > 0),
  CONSTRAINT inventory_purchases_state_check CHECK (state IN ('in_transit', 'received', 'refunded')),
  CONSTRAINT inventory_purchases_unit_cost_check CHECK (unit_cost IS NULL OR unit_cost >= 0),
  CONSTRAINT inventory_purchases_state_timestamps_check CHECK (
    (state = 'in_transit' AND received_at IS NULL AND refunded_at IS NULL)
    OR (state = 'received' AND received_at IS NOT NULL AND refunded_at IS NULL)
    OR (state = 'refunded' AND refunded_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.inventory_sales (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  product_code UUID NOT NULL,
  branch_code UUID NOT NULL,
  user_code UUID NOT NULL,
  quantity INTEGER NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(40) NULL,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_sales_pk PRIMARY KEY (code),
  CONSTRAINT inventory_sales_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_sales_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_sales_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_sales_quantity_check CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  product_code UUID NOT NULL,
  branch_code UUID NOT NULL,
  user_code UUID NOT NULL,
  quantity INTEGER NOT NULL,
  direction VARCHAR(10) NOT NULL,
  reason VARCHAR(30) NOT NULL,
  purchase_code UUID NULL,
  sale_code UUID NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_movements_pk PRIMARY KEY (code),
  CONSTRAINT inventory_movements_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_movements_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_movements_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT inventory_movements_purchase_fk FOREIGN KEY (purchase_code) REFERENCES public.inventory_purchases (code) ON DELETE SET NULL,
  CONSTRAINT inventory_movements_sale_fk FOREIGN KEY (sale_code) REFERENCES public.inventory_sales (code) ON DELETE SET NULL,
  CONSTRAINT inventory_movements_quantity_check CHECK (quantity > 0),
  CONSTRAINT inventory_movements_direction_check CHECK (direction IN ('in', 'out')),
  CONSTRAINT inventory_movements_reason_check CHECK (reason IN ('purchase', 'sale', 'purchase_refund', 'manual_adjustment')),
  CONSTRAINT inventory_movements_reason_direction_check CHECK (
    (reason = 'purchase' AND direction = 'in')
    OR (reason = 'sale' AND direction = 'out')
    OR (reason = 'purchase_refund' AND direction = 'out')
    OR (reason = 'manual_adjustment')
  ),
  CONSTRAINT inventory_movements_reference_check CHECK (
    (reason = 'purchase' AND purchase_code IS NOT NULL)
    OR (reason = 'sale' AND sale_code IS NOT NULL)
    OR (reason = 'purchase_refund' AND purchase_code IS NOT NULL)
    OR (reason = 'manual_adjustment')
  )
);

CREATE INDEX IF NOT EXISTS inventory_balances_branch_available_idx
  ON public.inventory_balances (branch_code, available);
CREATE INDEX IF NOT EXISTS inventory_balances_branch_updated_idx
  ON public.inventory_balances (branch_code, updated_at DESC);
CREATE INDEX IF NOT EXISTS inventory_purchases_product_branch_idx
  ON public.inventory_purchases (product_code, branch_code);
CREATE INDEX IF NOT EXISTS inventory_purchases_state_branch_idx
  ON public.inventory_purchases (state, branch_code, ordered_at DESC);
CREATE INDEX IF NOT EXISTS inventory_sales_product_branch_idx
  ON public.inventory_sales (product_code, branch_code);
CREATE INDEX IF NOT EXISTS inventory_sales_branch_sold_idx
  ON public.inventory_sales (branch_code, sold_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_product_branch_idx
  ON public.inventory_movements (product_code, branch_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_branch_occurred_idx
  ON public.inventory_movements (branch_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_reason_idx
  ON public.inventory_movements (reason);
CREATE INDEX IF NOT EXISTS inventory_movements_purchase_idx
  ON public.inventory_movements (purchase_code);
CREATE INDEX IF NOT EXISTS inventory_movements_sale_idx
  ON public.inventory_movements (sale_code);

CREATE OR REPLACE FUNCTION public.inventory_apply_movement_to_balance()
RETURNS TRIGGER AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  INSERT INTO public.inventory_balances (product_code, branch_code)
  VALUES (NEW.product_code, NEW.branch_code)
  ON CONFLICT (product_code, branch_code) DO NOTHING;

  IF NEW.direction = 'in' THEN
    UPDATE public.inventory_balances
    SET on_hand = on_hand + NEW.quantity,
        last_movement_at = NEW.occurred_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  ELSE
    UPDATE public.inventory_balances
    SET on_hand = on_hand - NEW.quantity,
        last_movement_at = NEW.occurred_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code
      AND on_hand >= NEW.quantity;
  END IF;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows = 0 THEN
    RAISE EXCEPTION 'Inventario insuficiente para producto % en sede %', NEW.product_code, NEW.branch_code
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.inventory_sync_inbound_from_purchase()
RETURNS TRIGGER AS $$
DECLARE
  old_inbound INTEGER := 0;
  new_inbound INTEGER := 0;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_inbound := CASE WHEN OLD.state = 'in_transit' THEN OLD.quantity ELSE 0 END;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_inbound := CASE WHEN NEW.state = 'in_transit' THEN NEW.quantity ELSE 0 END;
    INSERT INTO public.inventory_balances (product_code, branch_code)
    VALUES (NEW.product_code, NEW.branch_code)
    ON CONFLICT (product_code, branch_code) DO NOTHING;
  END IF;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.inventory_balances
    SET inbound = inbound + new_inbound,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.inventory_balances
    SET inbound = GREATEST(inbound - old_inbound, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = OLD.product_code
      AND branch_code = OLD.branch_code;
  ELSIF OLD.product_code IS DISTINCT FROM NEW.product_code OR OLD.branch_code IS DISTINCT FROM NEW.branch_code THEN
    UPDATE public.inventory_balances
    SET inbound = GREATEST(inbound - old_inbound, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = OLD.product_code
      AND branch_code = OLD.branch_code;

    UPDATE public.inventory_balances
    SET inbound = inbound + new_inbound,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  ELSE
    UPDATE public.inventory_balances
    SET inbound = GREATEST(inbound - old_inbound + new_inbound, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE product_code = NEW.product_code
      AND branch_code = NEW.branch_code;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_apply_movement_tg ON public.inventory_movements;
CREATE TRIGGER inventory_apply_movement_tg
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.inventory_apply_movement_to_balance();

DROP TRIGGER IF EXISTS inventory_sync_inbound_tg ON public.inventory_purchases;
CREATE TRIGGER inventory_sync_inbound_tg
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_purchases
FOR EACH ROW EXECUTE FUNCTION public.inventory_sync_inbound_from_purchase();

DROP TRIGGER IF EXISTS inventory_balances_updated_at_tg ON public.inventory_balances;
CREATE TRIGGER inventory_balances_updated_at_tg
BEFORE UPDATE ON public.inventory_balances
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

DROP TRIGGER IF EXISTS inventory_purchases_updated_at_tg ON public.inventory_purchases;
CREATE TRIGGER inventory_purchases_updated_at_tg
BEFORE UPDATE ON public.inventory_purchases
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

DROP TRIGGER IF EXISTS inventory_sales_updated_at_tg ON public.inventory_sales;
CREATE TRIGGER inventory_sales_updated_at_tg
BEFORE UPDATE ON public.inventory_sales
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

DROP TRIGGER IF EXISTS inventory_movements_updated_at_tg ON public.inventory_movements;
CREATE TRIGGER inventory_movements_updated_at_tg
BEFORE UPDATE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE OR REPLACE VIEW public.inventory_overview AS
SELECT
  ib.product_code,
  p.name AS product_name,
  p.sku,
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
  END AS stock_state
FROM public.inventory_balances ib
INNER JOIN public.products p ON p.code = ib.product_code
INNER JOIN public.branches b ON b.code = ib.branch_code
LEFT JOIN public.categories c ON c.code = p.category_code;

-- ==================== DOWN ====================

DROP VIEW IF EXISTS public.inventory_overview;

DROP TRIGGER IF EXISTS inventory_movements_updated_at_tg ON public.inventory_movements;
DROP TRIGGER IF EXISTS inventory_sales_updated_at_tg ON public.inventory_sales;
DROP TRIGGER IF EXISTS inventory_purchases_updated_at_tg ON public.inventory_purchases;
DROP TRIGGER IF EXISTS inventory_balances_updated_at_tg ON public.inventory_balances;
DROP TRIGGER IF EXISTS inventory_sync_inbound_tg ON public.inventory_purchases;
DROP TRIGGER IF EXISTS inventory_apply_movement_tg ON public.inventory_movements;

DROP FUNCTION IF EXISTS public.inventory_sync_inbound_from_purchase();
DROP FUNCTION IF EXISTS public.inventory_apply_movement_to_balance();

DROP TABLE IF EXISTS public.inventory_movements;
DROP TABLE IF EXISTS public.inventory_sales;
DROP TABLE IF EXISTS public.inventory_purchases;
DROP TABLE IF EXISTS public.inventory_balances;
