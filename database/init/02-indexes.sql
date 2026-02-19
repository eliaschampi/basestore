-- =====================================================
-- INDEXES
-- =====================================================

-- Users table indexes
CREATE INDEX users_email_idx ON public.users (email);

-- Permissions table indexes
CREATE INDEX permissions_user_code_idx ON public.permissions (user_code);
CREATE INDEX permissions_entity_idx ON public.permissions (entity);

-- Auth login rate limits indexes
CREATE INDEX auth_login_rate_limits_updated_at_idx ON public.auth_login_rate_limits (updated_at);

-- Branches table indexes
CREATE INDEX branches_name_idx ON public.branches (name);

-- Categories table indexes
CREATE INDEX categories_name_idx ON public.categories (name);
CREATE INDEX categories_created_at_idx ON public.categories (created_at);

-- Brands table indexes
CREATE INDEX brands_name_idx ON public.brands (name);
CREATE INDEX brands_created_at_idx ON public.brands (created_at);

-- Optimized indexes for performance
CREATE INDEX products_name_idx ON public.products (name);
CREATE INDEX products_brand_code_idx ON public.products (brand_code);
CREATE INDEX products_category_code_idx ON public.products (category_code);
CREATE INDEX products_user_code_idx ON public.products (user_code);
CREATE INDEX products_sku_idx ON public.products (sku);
CREATE INDEX products_price_idx ON public.products (price);
CREATE INDEX products_is_active_idx ON public.products (is_active);
CREATE INDEX products_created_at_idx ON public.products (created_at);

-- Drive files table indexes
CREATE INDEX drive_files_scope_idx ON public.drive_files (scope);
CREATE INDEX drive_files_user_code_idx ON public.drive_files (user_code);
CREATE INDEX drive_files_parent_code_idx ON public.drive_files (parent_code);
CREATE INDEX drive_files_type_idx ON public.drive_files (type);
CREATE INDEX drive_files_is_trashed_idx ON public.drive_files (is_trashed);
CREATE INDEX drive_files_created_at_idx ON public.drive_files (created_at);
CREATE INDEX drive_files_scope_parent_idx ON public.drive_files (scope, parent_code) WHERE is_trashed = FALSE;
CREATE INDEX drive_files_scope_trashed_idx ON public.drive_files (scope) WHERE is_trashed = TRUE;
CREATE INDEX drive_files_user_private_idx ON public.drive_files (user_code) WHERE scope = 'user_private';
CREATE UNIQUE INDEX drive_files_active_name_scope_uq ON public.drive_files (
  scope,
  COALESCE(CASE WHEN scope = 'user_private' THEN user_code ELSE NULL END, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(parent_code, '00000000-0000-0000-0000-000000000000'::uuid),
  LOWER(name)
) WHERE is_trashed = FALSE;

-- Drive links table indexes
CREATE INDEX drive_links_file_code_idx ON public.drive_links (file_code);
CREATE INDEX drive_links_entity_lookup_idx ON public.drive_links (entity_type, entity_code);
CREATE UNIQUE INDEX drive_links_primary_uq ON public.drive_links (entity_type, entity_code)
WHERE is_primary = TRUE;

-- Inventory balances indexes
CREATE INDEX inventory_balances_branch_available_idx
  ON public.inventory_balances (branch_code, available);
CREATE INDEX inventory_balances_branch_updated_idx
  ON public.inventory_balances (branch_code, updated_at DESC);

-- Inventory purchases indexes
CREATE INDEX inventory_purchases_product_branch_idx
  ON public.inventory_purchases (product_code, branch_code);
CREATE INDEX inventory_purchases_state_branch_idx
  ON public.inventory_purchases (state, branch_code, ordered_at DESC);
CREATE INDEX inventory_purchases_entry_type_idx
  ON public.inventory_purchases (entry_type, ordered_at DESC);
CREATE INDEX inventory_purchases_tracking_number_idx
  ON public.inventory_purchases (tracking_number)
  WHERE tracking_number IS NOT NULL;

-- Inventory customers indexes
CREATE UNIQUE INDEX inventory_customers_identity_udx
  ON public.inventory_customers (LOWER(full_name), COALESCE(phone, ''));
CREATE INDEX inventory_customers_favorite_idx
  ON public.inventory_customers (is_favorite DESC, updated_at DESC);

-- Inventory sales indexes
CREATE INDEX inventory_sales_product_branch_idx
  ON public.inventory_sales (product_code, branch_code);
CREATE INDEX inventory_sales_branch_sold_idx
  ON public.inventory_sales (branch_code, sold_at DESC);
CREATE INDEX inventory_sales_customer_idx
  ON public.inventory_sales (customer_code, sold_at DESC);
CREATE INDEX inventory_sales_channel_idx
  ON public.inventory_sales (sale_channel, sold_at DESC);
CREATE INDEX inventory_sales_shipping_idx
  ON public.inventory_sales (shipping_state, sold_at DESC);
CREATE INDEX inventory_sales_voided_at_idx
  ON public.inventory_sales (voided_at, sold_at DESC);
CREATE INDEX inventory_sales_branch_active_idx
  ON public.inventory_sales (branch_code, sold_at DESC)
  WHERE voided_at IS NULL;

-- Inventory movements indexes
CREATE INDEX inventory_movements_product_branch_idx
  ON public.inventory_movements (product_code, branch_code, occurred_at DESC);
CREATE INDEX inventory_movements_branch_occurred_idx
  ON public.inventory_movements (branch_code, occurred_at DESC);
CREATE INDEX inventory_movements_reason_idx
  ON public.inventory_movements (reason);
CREATE INDEX inventory_movements_purchase_idx
  ON public.inventory_movements (purchase_code);
CREATE INDEX inventory_movements_sale_idx
  ON public.inventory_movements (sale_code);
