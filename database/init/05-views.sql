-- =====================================================
-- Faztore Database Views
-- =====================================================

-- Products Overview View
-- Product media now comes from drive_links + drive_files (scope: product_shared).
CREATE OR REPLACE VIEW products_overview AS
SELECT
    p.code,
    p.name,
    p.description,
    p.brand_code,
    p.category_code,
    p.price,
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
     AND df.is_trashed = FALSE
    WHERE dl.entity_type = 'product'
      AND dl.entity_code = p.code
) AS media ON TRUE;

-- Create index on products columns used by products_overview for better performance
CREATE INDEX IF NOT EXISTS idx_products_overview_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_overview_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_overview_brand ON products (brand_code);
CREATE INDEX IF NOT EXISTS idx_products_overview_category ON products (category_code);

-- Inventory overview with stock-health metadata.
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

CREATE OR REPLACE VIEW public.inventory_purchase_feed AS
SELECT
  ip.code,
  ip.product_code,
  ip.branch_code,
  ip.user_code,
  ip.origin,
  ip.entry_type,
  ip.tracking_number,
  ip.quantity,
  ip.state,
  ip.ordered_at,
  ip.received_at,
  ip.refunded_at,
  ip.unit_cost,
  ip.note,
  ip.created_at,
  ip.updated_at,
  p.name AS product_name,
  p.sku AS product_sku,
  b.name AS branch_name,
  CASE
    WHEN ip.state = 'received' THEN COALESCE(ib.on_hand, 0) >= ip.quantity
    ELSE true
  END AS can_refund
FROM public.inventory_purchases ip
INNER JOIN public.products p ON p.code = ip.product_code
INNER JOIN public.branches b ON b.code = ip.branch_code
LEFT JOIN public.inventory_balances ib
  ON ib.product_code = ip.product_code
  AND ib.branch_code = ip.branch_code;

CREATE OR REPLACE VIEW public.inventory_sale_feed AS
SELECT
  s.code,
  s.product_code,
  s.branch_code,
  s.user_code,
  s.customer_code,
  s.quantity,
  s.unit_price,
  s.total_amount,
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
  p.name AS product_name,
  p.sku AS product_sku,
  b.name AS branch_name,
  c.full_name AS customer_full_name,
  u.name AS voided_by_name
FROM public.inventory_sales s
INNER JOIN public.products p ON p.code = s.product_code
INNER JOIN public.branches b ON b.code = s.branch_code
LEFT JOIN public.inventory_customers c ON c.code = s.customer_code
LEFT JOIN public.users u ON u.code = s.voided_by_user_code;

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
  product_code UUID,
  branch_code UUID,
  user_code UUID,
  origin TEXT,
  entry_type TEXT,
  tracking_number TEXT,
  quantity INTEGER,
  state TEXT,
  ordered_at DATE,
  received_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  unit_cost NUMERIC(12,2),
  note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
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
    AND (p_product_code IS NULL OR ipf.product_code = p_product_code)
    AND (p_state IS NULL OR ipf.state = p_state)
    AND (p_origin IS NULL OR ipf.origin = p_origin)
    AND (p_entry_type IS NULL OR ipf.entry_type = p_entry_type)
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR ipf.product_name ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(ipf.product_sku, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(ipf.tracking_number, '') ILIKE '%' || BTRIM(p_search) || '%'
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
  ranked.product_code,
  ranked.branch_code,
  ranked.user_code,
  ranked.origin,
  ranked.entry_type,
  ranked.tracking_number,
  ranked.quantity,
  ranked.state,
  ranked.ordered_at,
  ranked.received_at,
  ranked.refunded_at,
  ranked.unit_cost,
  ranked.note,
  ranked.created_at,
  ranked.updated_at,
  ranked.product_name,
  ranked.product_sku,
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
  product_code UUID,
  branch_code UUID,
  user_code UUID,
  customer_code UUID,
  quantity INTEGER,
  unit_price NUMERIC(12,2),
  total_amount NUMERIC(14,2),
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
  product_name TEXT,
  product_sku TEXT,
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
    AND (p_product_code IS NULL OR isf.product_code = p_product_code)
    AND (p_customer_code IS NULL OR isf.customer_code = p_customer_code)
    AND (p_shipping_state IS NULL OR isf.shipping_state = p_shipping_state)
    AND (p_sale_channel IS NULL OR isf.sale_channel = p_sale_channel)
    AND (
      COALESCE(p_status, 'all') = 'all'
      OR (COALESCE(p_status, 'all') = 'active' AND isf.voided_at IS NULL)
      OR (COALESCE(p_status, 'all') = 'voided' AND isf.voided_at IS NOT NULL)
    )
    AND (
      NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
      OR isf.product_name ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(isf.product_sku, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR isf.customer_name ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(isf.customer_phone, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(isf.order_reference, '') ILIKE '%' || BTRIM(p_search) || '%'
      OR COALESCE(isf.void_note, '') ILIKE '%' || BTRIM(p_search) || '%'
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
  ranked.product_code,
  ranked.branch_code,
  ranked.user_code,
  ranked.customer_code,
  ranked.quantity,
  ranked.unit_price,
  ranked.total_amount::NUMERIC(14,2),
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
  ranked.product_name,
  ranked.product_sku,
  ranked.branch_name,
  ranked.customer_full_name,
  ranked.voided_by_name,
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
