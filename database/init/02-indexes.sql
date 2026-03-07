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

-- Products table indexes
CREATE INDEX products_name_idx ON public.products (name);
CREATE INDEX products_brand_code_idx ON public.products (brand_code);
CREATE INDEX products_category_code_idx ON public.products (category_code);
CREATE INDEX products_user_code_idx ON public.products (user_code);
CREATE INDEX products_sku_idx ON public.products (sku);
CREATE INDEX products_price_idx ON public.products (price);
CREATE INDEX products_is_active_idx ON public.products (is_active);
CREATE INDEX products_created_at_idx ON public.products (created_at);

-- Drive files table indexes
-- Soft-delete: all active-file indexes filter on deleted_at IS NULL
CREATE INDEX drive_files_scope_idx ON public.drive_files (scope);
CREATE INDEX drive_files_user_code_idx ON public.drive_files (user_code);
CREATE INDEX drive_files_parent_code_idx ON public.drive_files (parent_code);
CREATE INDEX drive_files_type_idx ON public.drive_files (type);
CREATE INDEX drive_files_deleted_at_idx ON public.drive_files (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX drive_files_created_at_idx ON public.drive_files (created_at);
CREATE INDEX drive_files_scope_parent_idx ON public.drive_files (scope, parent_code) WHERE deleted_at IS NULL;
CREATE INDEX drive_files_user_private_idx ON public.drive_files (user_code) WHERE scope = 'user_private';
CREATE UNIQUE INDEX drive_files_active_name_scope_uq ON public.drive_files (
  scope,
  COALESCE(CASE WHEN scope = 'user_private' THEN user_code ELSE NULL END, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(parent_code, '00000000-0000-0000-0000-000000000000'::uuid),
  LOWER(name)
) WHERE deleted_at IS NULL;

-- Drive links table indexes
-- product_code is now a direct FK (no more polymorphic entity_type/entity_code)
CREATE INDEX drive_links_file_code_idx ON public.drive_links (file_code);
CREATE INDEX drive_links_product_code_idx ON public.drive_links (product_code);
CREATE UNIQUE INDEX drive_links_primary_uq ON public.drive_links (product_code) WHERE is_primary = TRUE;

-- Inventory balances indexes
CREATE INDEX inventory_balances_branch_available_idx
  ON public.inventory_balances (branch_code, available);
CREATE INDEX inventory_balances_branch_updated_idx
  ON public.inventory_balances (branch_code, updated_at DESC);

-- Purchases indexes (header + lines)
CREATE INDEX purchases_branch_state_idx
  ON public.purchases (branch_code, state, ordered_at DESC);
CREATE INDEX purchases_origin_idx
  ON public.purchases (origin, ordered_at DESC);
CREATE INDEX purchases_entry_type_idx
  ON public.purchases (entry_type, ordered_at DESC);
CREATE INDEX purchases_tracking_number_idx
  ON public.purchases (tracking_number)
  WHERE tracking_number IS NOT NULL;
CREATE INDEX purchase_items_purchase_idx
  ON public.purchase_items (purchase_code);
CREATE INDEX purchase_items_product_idx
  ON public.purchase_items (product_code);
CREATE INDEX purchase_items_product_purchase_idx
  ON public.purchase_items (product_code, purchase_code);

-- Inventory customers indexes
CREATE UNIQUE INDEX inventory_customers_identity_udx
  ON public.inventory_customers (LOWER(full_name), COALESCE(phone, ''));
CREATE INDEX inventory_customers_updated_idx
  ON public.inventory_customers (updated_at DESC, full_name);

-- Sales indexes (header + lines)
CREATE INDEX sales_branch_sold_idx
  ON public.sales (branch_code, sold_at DESC);
CREATE INDEX sales_customer_idx
  ON public.sales (customer_code, sold_at DESC);
CREATE INDEX sales_channel_idx
  ON public.sales (sale_channel, sold_at DESC);
CREATE INDEX sales_shipping_idx
  ON public.sales (shipping_state, sold_at DESC);
CREATE INDEX sales_voided_at_idx
  ON public.sales (voided_at, sold_at DESC);
CREATE INDEX sales_branch_active_idx
  ON public.sales (branch_code, sold_at DESC)
  WHERE voided_at IS NULL;
CREATE INDEX sale_items_sale_idx
  ON public.sale_items (sale_code);
CREATE INDEX sale_items_product_idx
  ON public.sale_items (product_code);
CREATE INDEX sale_items_product_sale_idx
  ON public.sale_items (product_code, sale_code);

-- Product transfers indexes (header + lines)
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
CREATE INDEX inventory_movements_transfer_idx
  ON public.inventory_movements (transfer_code);
