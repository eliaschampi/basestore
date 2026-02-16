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

-- Products table with multiple images support
CREATE TABLE public.products (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  brand_code UUID NOT NULL,
  category_code UUID NOT NULL,
  user_code UUID NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  sku VARCHAR(100) NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT products_pk PRIMARY KEY (code),
  CONSTRAINT products_brand_fk FOREIGN KEY (brand_code) REFERENCES public.brands (code) ON DELETE RESTRICT,
  CONSTRAINT products_category_fk FOREIGN KEY (category_code) REFERENCES public.categories (code) ON DELETE RESTRICT,
  CONSTRAINT products_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT products_sku_uq UNIQUE (sku),
  CONSTRAINT products_price_check CHECK (price >= 0)
);

-- Drive files table (scope-aware: shared, personal)
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
  is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT drive_files_pk PRIMARY KEY (code),
  CONSTRAINT drive_files_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT drive_files_parent_fk FOREIGN KEY (parent_code) REFERENCES public.drive_files (code) ON DELETE CASCADE,
  CONSTRAINT drive_files_type_check CHECK (type IN ('dir', 'img', 'vid', 'aud', 'doc', 'zip', 'otr')),
  CONSTRAINT drive_files_scope_check CHECK (scope IN ('product_shared', 'user_private'))
);

-- Generic entity links for drive files (product-ready without hard FK dependency)
CREATE TABLE public.drive_links (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  file_code UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_code UUID NOT NULL,
  linked_by_user_code UUID NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT drive_links_pk PRIMARY KEY (code),
  CONSTRAINT drive_links_file_fk FOREIGN KEY (file_code) REFERENCES public.drive_files (code) ON DELETE CASCADE,
  CONSTRAINT drive_links_user_fk FOREIGN KEY (linked_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT drive_links_entity_type_check CHECK (entity_type IN ('product')),
  CONSTRAINT drive_links_entity_file_uq UNIQUE (entity_type, entity_code, file_code)
);
