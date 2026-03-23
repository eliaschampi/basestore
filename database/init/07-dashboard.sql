-- =====================================================
-- Faztore Dashboard Functions
-- =====================================================
-- Server-side functions for all dashboard data queries.
-- Using DB-side date series generation eliminates JS/DB
-- timezone mismatches in trend calculations.
-- =====================================================

-- Returns daily sales totals (revenue + profit) for a branch over a date range.
-- The date series is generated entirely on the DB side so every
-- day is present in the result (value=0 for days without sales).
-- profit_amount comes from inventory_sale_feed which computes (unit_price - unit_cost) * qty.
CREATE OR REPLACE FUNCTION public.dashboard_sales_trend(
  p_branch_code UUID,
  p_range_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  day_key TEXT,
  total_amount NUMERIC(14,2),
  total_profit NUMERIC(14,2),
  total_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH date_series AS (
  SELECT (CURRENT_DATE - (GREATEST(COALESCE(p_range_days, 7), 1) - 1 - offs))::date AS day_date
  FROM generate_series(0, GREATEST(COALESCE(p_range_days, 7), 1) - 1) AS gs(offs)
),
sales_agg AS (
  SELECT
    isf.sold_at::date AS sale_date,
    COALESCE(SUM(isf.total_amount), 0::numeric)::numeric(14,2) AS total_amount,
    COALESCE(SUM(isf.profit_amount), 0::numeric)::numeric(14,2) AS total_profit,
    COUNT(isf.code)::integer AS total_count
  FROM public.inventory_sale_feed isf
  WHERE isf.branch_code = p_branch_code
    AND isf.voided_at IS NULL
    AND isf.sold_at::date >= CURRENT_DATE - (GREATEST(COALESCE(p_range_days, 7), 1) - 1)
  GROUP BY isf.sold_at::date
)
SELECT
  TO_CHAR(ds.day_date, 'YYYY-MM-DD') AS day_key,
  COALESCE(sa.total_amount, 0::numeric(14,2)) AS total_amount,
  COALESCE(sa.total_profit, 0::numeric(14,2)) AS total_profit,
  COALESCE(sa.total_count, 0) AS total_count
FROM date_series ds
LEFT JOIN sales_agg sa ON sa.sale_date = ds.day_date
ORDER BY ds.day_date ASC;
$$;

-- Returns daily purchase totals for a branch over a date range.
-- ordered_at is a DATE column so no cast is needed for grouping.
CREATE OR REPLACE FUNCTION public.dashboard_purchases_trend(
  p_branch_code UUID,
  p_range_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  day_key TEXT,
  total_amount NUMERIC(14,2),
  total_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH date_series AS (
  SELECT (CURRENT_DATE - (GREATEST(COALESCE(p_range_days, 7), 1) - 1 - offs))::date AS day_date
  FROM generate_series(0, GREATEST(COALESCE(p_range_days, 7), 1) - 1) AS gs(offs)
),
purchases_agg AS (
  SELECT
    ipf.ordered_at AS purchase_date,
    COALESCE(SUM(ipf.total_amount), 0::numeric)::numeric(14,2) AS total_amount,
    COUNT(ipf.code)::integer AS total_count
  FROM public.inventory_purchase_feed ipf
  WHERE ipf.branch_code = p_branch_code
    AND ipf.state <> 'refunded'
    AND ipf.ordered_at >= CURRENT_DATE - (GREATEST(COALESCE(p_range_days, 7), 1) - 1)
  GROUP BY ipf.ordered_at
)
SELECT
  TO_CHAR(ds.day_date, 'YYYY-MM-DD') AS day_key,
  COALESCE(pa.total_amount, 0::numeric(14,2)) AS total_amount,
  COALESCE(pa.total_count, 0) AS total_count
FROM date_series ds
LEFT JOIN purchases_agg pa ON pa.purchase_date = ds.day_date
ORDER BY ds.day_date ASC;
$$;

-- Returns the most recent inventory activity for a branch:
-- sales, purchases and transfers — merged and sorted by time.
-- Raw inventory_movements are intentionally excluded since they
-- are the underlying records that drive sales/purchases/transfers;
-- including them creates duplicates and semantic confusion.
CREATE OR REPLACE FUNCTION public.dashboard_recent_activity(
  p_branch_code UUID,
  p_limit INTEGER DEFAULT 15
)
RETURNS TABLE(
  activity_key TEXT,
  kind TEXT,
  title TEXT,
  description TEXT,
  occurred_at TIMESTAMPTZ,
  amount NUMERIC(14,2),
  total_quantity INTEGER,
  products_summary TEXT,
  href TEXT
)
LANGUAGE sql
STABLE
AS $$
SELECT activity_key, kind, title, description, occurred_at, amount, total_quantity, products_summary, href
FROM (
  (
    SELECT
      'sale:' || isf.code::text AS activity_key,
      'sale'::text AS kind,
      'Venta registrada'::text AS title,
      isf.customer_name || ' · ' || isf.branch_name AS description,
      isf.sold_at AS occurred_at,
      isf.total_amount AS amount,
      isf.total_quantity AS total_quantity,
      isf.products_summary AS products_summary,
      '/inventory/sales'::text AS href
    FROM public.inventory_sale_feed isf
    WHERE isf.branch_code = p_branch_code
      AND isf.voided_at IS NULL
    ORDER BY isf.sold_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 15), 1)
  )
  UNION ALL
  (
    SELECT
      'purchase:' || ipf.code::text AS activity_key,
      'purchase'::text AS kind,
      'Compra registrada'::text AS title,
      ipf.branch_name || ' · ' || ipf.origin AS description,
      ipf.ordered_at::timestamptz AS occurred_at,
      ipf.total_amount AS amount,
      ipf.total_quantity AS total_quantity,
      ipf.products_summary AS products_summary,
      '/inventory/purchases'::text AS href
    FROM public.inventory_purchase_feed ipf
    WHERE ipf.branch_code = p_branch_code
      AND ipf.state <> 'refunded'
    ORDER BY ipf.ordered_at DESC, ipf.created_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 15), 1)
  )
  UNION ALL
  (
    SELECT
      'transfer:' || iptf.code::text AS activity_key,
      'transfer'::text AS kind,
      'Transferencia'::text AS title,
      iptf.source_branch_name || ' → ' || iptf.destination_branch_name AS description,
      iptf.transferred_at AS occurred_at,
      NULL::numeric(14,2) AS amount,
      iptf.total_quantity AS total_quantity,
      iptf.products_summary AS products_summary,
      '/inventory/transfers'::text AS href
    FROM public.inventory_product_transfer_feed iptf
    WHERE iptf.source_branch_code = p_branch_code
       OR iptf.destination_branch_code = p_branch_code
    ORDER BY iptf.transferred_at DESC, iptf.created_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 15), 1)
  )
) combined
ORDER BY occurred_at DESC
LIMIT GREATEST(COALESCE(p_limit, 15), 1);
$$;

-- Returns the count of active drive link associations.
CREATE OR REPLACE FUNCTION public.dashboard_count_drive_links()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
SELECT COUNT(dl.code)::integer
FROM public.drive_links dl
INNER JOIN public.drive_files df ON df.code = dl.file_code
WHERE df.deleted_at IS NULL;
$$;
