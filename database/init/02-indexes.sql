-- =====================================================
-- INDEXES
-- =====================================================

-- Users table indexes
CREATE INDEX users_email_idx ON public.users (email);

-- Permissions table indexes
CREATE INDEX permissions_user_code_idx ON public.permissions (user_code);
CREATE INDEX permissions_entity_idx ON public.permissions (entity);

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
CREATE INDEX products_images_gin_idx ON public.products USING GIN (images);

-- Drive files table indexes
CREATE INDEX drive_files_branch_code_idx ON public.drive_files (branch_code);
CREATE INDEX drive_files_user_code_idx ON public.drive_files (user_code);
CREATE INDEX drive_files_parent_code_idx ON public.drive_files (parent_code);
CREATE INDEX drive_files_type_idx ON public.drive_files (type);
CREATE INDEX drive_files_is_trashed_idx ON public.drive_files (is_trashed);
CREATE INDEX drive_files_created_at_idx ON public.drive_files (created_at);
CREATE INDEX drive_files_branch_parent_idx ON public.drive_files (branch_code, parent_code) WHERE is_trashed = FALSE;
CREATE INDEX drive_files_branch_trashed_idx ON public.drive_files (branch_code) WHERE is_trashed = TRUE;
CREATE UNIQUE INDEX drive_files_active_name_uq ON public.drive_files (
  branch_code,
  COALESCE(parent_code, '00000000-0000-0000-0000-000000000000'::uuid),
  LOWER(name)
) WHERE is_trashed = FALSE;

-- Drive links table indexes
CREATE INDEX drive_links_file_code_idx ON public.drive_links (file_code);
CREATE INDEX drive_links_entity_lookup_idx ON public.drive_links (entity_type, entity_code);
CREATE UNIQUE INDEX drive_links_primary_uq ON public.drive_links (entity_type, entity_code)
WHERE is_primary = TRUE;
