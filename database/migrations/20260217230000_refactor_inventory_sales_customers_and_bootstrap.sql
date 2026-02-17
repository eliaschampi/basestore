-- Migration: refactor inventory sales customers and bootstrap
-- Created: 2026-02-17T23:00:00.000Z

-- ==================== UP ====================

CREATE TABLE IF NOT EXISTS public.inventory_customers (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_customers_pk PRIMARY KEY (code),
  CONSTRAINT inventory_customers_full_name_check CHECK (char_length(trim(full_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_customers_identity_udx
  ON public.inventory_customers (lower(full_name), COALESCE(phone, ''));
CREATE INDEX IF NOT EXISTS inventory_customers_favorite_idx
  ON public.inventory_customers (is_favorite DESC, updated_at DESC);

DROP TRIGGER IF EXISTS inventory_customers_updated_at_tg ON public.inventory_customers;
CREATE TRIGGER inventory_customers_updated_at_tg
BEFORE UPDATE ON public.inventory_customers
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

ALTER TABLE public.inventory_purchases
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) NOT NULL DEFAULT 'restock';

UPDATE public.inventory_purchases
SET tracking_number = CONCAT('legacy-', LEFT(code::text, 8))
WHERE origin IN ('temu', 'aliexpress')
  AND tracking_number IS NULL;

ALTER TABLE public.inventory_purchases
  DROP CONSTRAINT IF EXISTS inventory_purchases_entry_type_check,
  ADD CONSTRAINT inventory_purchases_entry_type_check CHECK (entry_type IN ('initial', 'restock'));

ALTER TABLE public.inventory_purchases
  DROP CONSTRAINT IF EXISTS inventory_purchases_tracking_required_check,
  ADD CONSTRAINT inventory_purchases_tracking_required_check CHECK (
    origin = 'lima'
    OR (tracking_number IS NOT NULL AND char_length(trim(tracking_number)) >= 5)
  );

CREATE INDEX IF NOT EXISTS inventory_purchases_entry_type_idx
  ON public.inventory_purchases (entry_type, ordered_at DESC);
CREATE INDEX IF NOT EXISTS inventory_purchases_tracking_number_idx
  ON public.inventory_purchases (tracking_number)
  WHERE tracking_number IS NOT NULL;

ALTER TABLE public.inventory_sales
  ADD COLUMN IF NOT EXISTS customer_code UUID NULL,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_channel VARCHAR(20) NOT NULL DEFAULT 'store',
  ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(20) NOT NULL DEFAULT 'na',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS order_reference VARCHAR(80) NULL;

ALTER TABLE public.inventory_sales
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) GENERATED ALWAYS AS ((quantity::numeric * unit_price)) STORED;

INSERT INTO public.inventory_customers (full_name, phone)
SELECT DISTINCT
  trim(s.customer_name) AS full_name,
  NULLIF(trim(s.customer_phone), '') AS phone
FROM public.inventory_sales s
WHERE trim(s.customer_name) <> ''
ON CONFLICT DO NOTHING;

UPDATE public.inventory_sales s
SET customer_code = c.code
FROM public.inventory_customers c
WHERE s.customer_code IS NULL
  AND lower(c.full_name) = lower(trim(s.customer_name))
  AND COALESCE(c.phone, '') = COALESCE(NULLIF(trim(s.customer_phone), ''), '');

UPDATE public.inventory_sales s
SET unit_price = p.price
FROM public.products p
WHERE s.product_code = p.code
  AND s.unit_price = 0;

ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_customer_fk,
  ADD CONSTRAINT inventory_sales_customer_fk FOREIGN KEY (customer_code) REFERENCES public.inventory_customers (code) ON DELETE SET NULL;

ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_unit_price_check,
  ADD CONSTRAINT inventory_sales_unit_price_check CHECK (unit_price >= 0);

ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_channel_check,
  ADD CONSTRAINT inventory_sales_channel_check CHECK (sale_channel IN ('store', 'web'));

ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_fulfillment_type_check,
  ADD CONSTRAINT inventory_sales_fulfillment_type_check CHECK (fulfillment_type IN ('pickup', 'delivery'));

ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_shipping_state_check,
  ADD CONSTRAINT inventory_sales_shipping_state_check CHECK (shipping_state IN ('na', 'pending', 'in_transit', 'delivered'));

ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_fulfillment_shipping_check,
  ADD CONSTRAINT inventory_sales_fulfillment_shipping_check CHECK (
    (
      fulfillment_type = 'pickup'
      AND shipping_state = 'na'
      AND delivery_address IS NULL
    )
    OR (
      fulfillment_type = 'delivery'
      AND shipping_state IN ('pending', 'in_transit', 'delivered')
      AND delivery_address IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS inventory_sales_customer_idx
  ON public.inventory_sales (customer_code, sold_at DESC);
CREATE INDEX IF NOT EXISTS inventory_sales_channel_idx
  ON public.inventory_sales (sale_channel, sold_at DESC);
CREATE INDEX IF NOT EXISTS inventory_sales_shipping_idx
  ON public.inventory_sales (shipping_state, sold_at DESC);

CREATE OR REPLACE FUNCTION public.inventory_seed_balances_for_new_product()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory_balances (product_code, branch_code)
  SELECT NEW.code, b.code
  FROM public.branches b
  ON CONFLICT (product_code, branch_code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.inventory_seed_balances_for_new_branch()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory_balances (product_code, branch_code)
  SELECT p.code, NEW.code
  FROM public.products p
  ON CONFLICT (product_code, branch_code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_seed_balances_product_tg ON public.products;
CREATE TRIGGER inventory_seed_balances_product_tg
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.inventory_seed_balances_for_new_product();

DROP TRIGGER IF EXISTS inventory_seed_balances_branch_tg ON public.branches;
CREATE TRIGGER inventory_seed_balances_branch_tg
AFTER INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.inventory_seed_balances_for_new_branch();

INSERT INTO public.inventory_balances (product_code, branch_code)
SELECT p.code, b.code
FROM public.products p
CROSS JOIN public.branches b
ON CONFLICT (product_code, branch_code) DO NOTHING;

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

-- ==================== DOWN ====================

DROP VIEW IF EXISTS public.inventory_overview;

DROP TRIGGER IF EXISTS inventory_seed_balances_product_tg ON public.products;
DROP TRIGGER IF EXISTS inventory_seed_balances_branch_tg ON public.branches;
DROP FUNCTION IF EXISTS public.inventory_seed_balances_for_new_product();
DROP FUNCTION IF EXISTS public.inventory_seed_balances_for_new_branch();

DROP INDEX IF EXISTS inventory_sales_shipping_idx;
DROP INDEX IF EXISTS inventory_sales_channel_idx;
DROP INDEX IF EXISTS inventory_sales_customer_idx;

ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_fulfillment_shipping_check;
ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_shipping_state_check;
ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_fulfillment_type_check;
ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_channel_check;
ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_unit_price_check;
ALTER TABLE public.inventory_sales
  DROP CONSTRAINT IF EXISTS inventory_sales_customer_fk;

ALTER TABLE public.inventory_sales
  DROP COLUMN IF EXISTS total_amount,
  DROP COLUMN IF EXISTS order_reference,
  DROP COLUMN IF EXISTS delivery_address,
  DROP COLUMN IF EXISTS shipping_state,
  DROP COLUMN IF EXISTS fulfillment_type,
  DROP COLUMN IF EXISTS sale_channel,
  DROP COLUMN IF EXISTS unit_price,
  DROP COLUMN IF EXISTS customer_code;

DROP INDEX IF EXISTS inventory_purchases_tracking_number_idx;
DROP INDEX IF EXISTS inventory_purchases_entry_type_idx;

ALTER TABLE public.inventory_purchases
  DROP CONSTRAINT IF EXISTS inventory_purchases_tracking_required_check;
ALTER TABLE public.inventory_purchases
  DROP CONSTRAINT IF EXISTS inventory_purchases_entry_type_check;
ALTER TABLE public.inventory_purchases
  DROP COLUMN IF EXISTS entry_type,
  DROP COLUMN IF EXISTS tracking_number;

DROP TRIGGER IF EXISTS inventory_customers_updated_at_tg ON public.inventory_customers;
DROP INDEX IF EXISTS inventory_customers_favorite_idx;
DROP INDEX IF EXISTS inventory_customers_identity_udx;
DROP TABLE IF EXISTS public.inventory_customers;

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
