-- Migration: create drive tables
-- Created: 2026-02-10T13:17:00.000Z

-- ==================== UP ====================

-- Drive files table (shared per branch)
CREATE TABLE public.drive_files (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  branch_code UUID NOT NULL,
  -- Audit field: creator/uploader. Drive remains shared at branch scope.
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
  CONSTRAINT drive_files_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT drive_files_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT drive_files_parent_fk FOREIGN KEY (parent_code) REFERENCES public.drive_files (code) ON DELETE CASCADE,
  CONSTRAINT drive_files_type_check CHECK (type IN ('dir', 'img', 'vid', 'aud', 'doc', 'zip', 'otr'))
);

-- Indexes for drive_files
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

-- Trigger for updated_at
CREATE TRIGGER drive_files_updated_at_tg BEFORE UPDATE ON public.drive_files
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

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

-- Indexes for drive_links
CREATE INDEX drive_links_file_code_idx ON public.drive_links (file_code);
CREATE INDEX drive_links_entity_lookup_idx ON public.drive_links (entity_type, entity_code);
CREATE UNIQUE INDEX drive_links_primary_uq ON public.drive_links (entity_type, entity_code)
WHERE is_primary = TRUE;

-- ==================== DOWN ====================

DROP TABLE IF EXISTS public.drive_links;
DROP TRIGGER IF EXISTS drive_files_updated_at_tg ON public.drive_files;
DROP TABLE IF EXISTS public.drive_files;
