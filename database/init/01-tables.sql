-- =====================================================
-- Faztore Database Tables
-- =====================================================
-- All table definitions
-- =====================================================

-- Users table 
CREATE TABLE public.users (
  code UUID NOT NULL DEFAULT gen_random_uuid (),
  name VARCHAR(100) NULL,
  last_name VARCHAR(150) NULL,
  email VARCHAR(255) NOT NULL,
  photo_url TEXT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pk PRIMARY KEY (code),
  CONSTRAINT users_email_uq UNIQUE (email)
);

-- Permissions table
CREATE TABLE public.permissions (
  code UUID NOT NULL DEFAULT gen_random_uuid (),
  user_code UUID NOT NULL,
  entity TEXT NOT NULL,
  action VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT permissions_pk PRIMARY KEY (code),
  CONSTRAINT permissions_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE NO ACTION,
  CONSTRAINT permissions_entity_user_action_uq UNIQUE (entity, user_code, action)
);

-- Auth login rate limits table
CREATE TABLE public.auth_login_rate_limits (
  rate_key TEXT NOT NULL,
  first_attempt_at TIMESTAMPTZ NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_login_rate_limits_pk PRIMARY KEY (rate_key)
);

-- Branches table
CREATE TABLE public.branches (
  code UUID NOT NULL DEFAULT gen_random_uuid (),
  name VARCHAR(100) NOT NULL,
  state BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  users UUID[] NOT NULL,
  CONSTRAINT branches_pk PRIMARY KEY (code)
);

-- Categories table
CREATE TABLE public.categories (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT categories_pk PRIMARY KEY (code),
  CONSTRAINT categories_name_uq UNIQUE (name)
);

-- Brands table
CREATE TABLE public.brands (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT brands_pk PRIMARY KEY (code),
  CONSTRAINT brands_name_uq UNIQUE (name)
);

-- Products table (media managed through drive_links → product_code)
CREATE TABLE public.products (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  brand_code UUID NOT NULL,
  category_code UUID NOT NULL,
  user_code UUID NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sku VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT products_pk PRIMARY KEY (code),
  CONSTRAINT products_brand_fk FOREIGN KEY (brand_code) REFERENCES public.brands (code) ON DELETE RESTRICT,
  CONSTRAINT products_category_fk FOREIGN KEY (category_code) REFERENCES public.categories (code) ON DELETE RESTRICT,
  CONSTRAINT products_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT products_sku_uq UNIQUE (sku),
  CONSTRAINT products_price_check CHECK (price >= 0),
  CONSTRAINT products_cost_price_check CHECK (cost_price >= 0)
);

-- Drive files table (scope-aware: shared, personal)
-- Soft-deleted via deleted_at timestamp (NULL = active, non-NULL = deleted)
CREATE TABLE public.drive_files (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  scope VARCHAR(30) NOT NULL DEFAULT 'product_shared',
  -- Audit field: creator/uploader. Also used as owner for user_private scope.
  user_code UUID NOT NULL,
  parent_code UUID NULL,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(10) NOT NULL DEFAULT 'otr',
  size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NULL,
  mime_type VARCHAR(255) NULL,
  tag VARCHAR(10) NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT drive_files_pk PRIMARY KEY (code),
  CONSTRAINT drive_files_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT drive_files_parent_fk FOREIGN KEY (parent_code) REFERENCES public.drive_files (code) ON DELETE CASCADE,
  CONSTRAINT drive_files_type_check CHECK (type IN ('dir', 'img', 'vid', 'aud', 'doc', 'zip', 'otr')),
  CONSTRAINT drive_files_scope_check CHECK (scope IN ('product_shared', 'user_private'))
);

-- Product media links (strict FK — only links to products)
CREATE TABLE public.drive_links (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  file_code UUID NOT NULL,
  product_code UUID NOT NULL,
  linked_by_user_code UUID NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT drive_links_pk PRIMARY KEY (code),
  CONSTRAINT drive_links_file_fk FOREIGN KEY (file_code) REFERENCES public.drive_files (code) ON DELETE CASCADE,
  CONSTRAINT drive_links_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE CASCADE,
  CONSTRAINT drive_links_user_fk FOREIGN KEY (linked_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT drive_links_product_file_uq UNIQUE (product_code, file_code)
);

-- Inventory balances per product and branch
CREATE TABLE public.inventory_balances (
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

-- Inventory customers
CREATE TABLE public.inventory_customers (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_customers_pk PRIMARY KEY (code),
  CONSTRAINT inventory_customers_full_name_check CHECK (char_length(trim(full_name)) > 0)
);

-- Purchases (header)
CREATE TABLE public.purchases (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  branch_code UUID NOT NULL,
  user_code UUID NOT NULL,
  origin VARCHAR(30) NOT NULL,
  entry_type VARCHAR(20) NOT NULL DEFAULT 'restock',
  tracking_number VARCHAR(120) NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'in_transit',
  ordered_at DATE NOT NULL DEFAULT CURRENT_DATE,
  received_at TIMESTAMPTZ NULL,
  refunded_at TIMESTAMPTZ NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchases_pk PRIMARY KEY (code),
  CONSTRAINT purchases_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT purchases_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT purchases_origin_check CHECK (origin IN ('temu', 'aliexpress', 'lima', 'other')),
  CONSTRAINT purchases_entry_type_check CHECK (entry_type IN ('initial', 'restock')),
  CONSTRAINT purchases_state_check CHECK (state IN ('in_transit', 'received', 'refunded')),
  CONSTRAINT purchases_state_timestamps_check CHECK (
    (state = 'in_transit' AND received_at IS NULL AND refunded_at IS NULL)
    OR (state = 'received' AND received_at IS NOT NULL AND refunded_at IS NULL)
    OR (state = 'refunded' AND refunded_at IS NOT NULL)
  )
);

-- Purchase items (lines)
CREATE TABLE public.purchase_items (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  purchase_code UUID NOT NULL,
  product_code UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12,2) NULL,
  total_amount NUMERIC(14,2) GENERATED ALWAYS AS ((quantity::numeric * COALESCE(unit_cost, 0::numeric))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchase_items_pk PRIMARY KEY (code),
  CONSTRAINT purchase_items_purchase_fk FOREIGN KEY (purchase_code) REFERENCES public.purchases (code) ON DELETE CASCADE,
  CONSTRAINT purchase_items_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE RESTRICT,
  CONSTRAINT purchase_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT purchase_items_unit_cost_check CHECK (unit_cost IS NULL OR unit_cost >= 0),
  CONSTRAINT purchase_items_purchase_product_uq UNIQUE (purchase_code, product_code)
);

-- Sales (header)
CREATE TABLE public.sales (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  branch_code UUID NOT NULL,
  user_code UUID NOT NULL,
  customer_code UUID NULL,
  sale_channel VARCHAR(20) NOT NULL DEFAULT 'store',
  fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'pickup',
  shipping_state VARCHAR(20) NOT NULL DEFAULT 'na',
  delivery_address TEXT NULL,
  order_reference VARCHAR(80) NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(40) NULL,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note TEXT NULL,
  voided_at TIMESTAMPTZ NULL,
  voided_by_user_code UUID NULL,
  void_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sales_pk PRIMARY KEY (code),
  CONSTRAINT sales_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT sales_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT sales_customer_fk FOREIGN KEY (customer_code) REFERENCES public.inventory_customers (code) ON DELETE SET NULL,
  CONSTRAINT sales_voided_by_fk FOREIGN KEY (voided_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT sales_channel_check CHECK (sale_channel IN ('store', 'web')),
  CONSTRAINT sales_fulfillment_type_check CHECK (fulfillment_type IN ('pickup', 'delivery')),
  CONSTRAINT sales_shipping_state_check CHECK (shipping_state IN ('na', 'pending', 'in_transit', 'delivered')),
  CONSTRAINT sales_fulfillment_shipping_check CHECK (
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
  ),
  CONSTRAINT sales_void_state_check CHECK (
    (voided_at IS NULL AND voided_by_user_code IS NULL)
    OR (voided_at IS NOT NULL AND voided_by_user_code IS NOT NULL)
  )
);

-- Sale items (lines)
-- unit_cost snapshots products.cost_price at sale time for O(1) historical profit.
CREATE TABLE public.sale_items (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  sale_code UUID NOT NULL,
  product_code UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) GENERATED ALWAYS AS ((quantity::numeric * unit_price)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sale_items_pk PRIMARY KEY (code),
  CONSTRAINT sale_items_sale_fk FOREIGN KEY (sale_code) REFERENCES public.sales (code) ON DELETE CASCADE,
  CONSTRAINT sale_items_product_fk FOREIGN KEY (product_code) REFERENCES public.products (code) ON DELETE RESTRICT,
  CONSTRAINT sale_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT sale_items_unit_price_check CHECK (unit_price >= 0),
  CONSTRAINT sale_items_unit_cost_check CHECK (unit_cost >= 0),
  CONSTRAINT sale_items_sale_product_uq UNIQUE (sale_code, product_code)
);

-- Inventory movements
CREATE TABLE public.inventory_movements (
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
  CONSTRAINT inventory_movements_purchase_fk FOREIGN KEY (purchase_code) REFERENCES public.purchases (code) ON DELETE SET NULL,
  CONSTRAINT inventory_movements_sale_fk FOREIGN KEY (sale_code) REFERENCES public.sales (code) ON DELETE SET NULL,
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
