-- Migration: refactor drive scopes and product media view
-- Created: 2026-02-16T15:30:00.000Z

-- ==================== UP ====================

-- Drive scopes: product_shared, user_private.
ALTER TABLE public.drive_files
  ADD COLUMN IF NOT EXISTS scope VARCHAR(30) DEFAULT 'product_shared';

UPDATE public.drive_files
SET scope = 'product_shared'
WHERE scope IS NULL OR scope = 'branch_shared';

ALTER TABLE public.drive_files
  ALTER COLUMN scope SET NOT NULL;

ALTER TABLE public.drive_files
  DROP CONSTRAINT IF EXISTS drive_files_branch_fk,
  DROP CONSTRAINT IF EXISTS drive_files_scope_check,
  DROP CONSTRAINT IF EXISTS drive_files_scope_branch_check;

ALTER TABLE public.drive_files
  DROP COLUMN IF EXISTS branch_code;

ALTER TABLE public.drive_files
  ADD CONSTRAINT drive_files_scope_check
    CHECK (scope IN ('product_shared', 'user_private'));

DROP INDEX IF EXISTS public.drive_files_branch_parent_idx;
DROP INDEX IF EXISTS public.drive_files_branch_trashed_idx;
DROP INDEX IF EXISTS public.drive_files_active_name_uq;
DROP INDEX IF EXISTS public.drive_files_branch_code_idx;
DROP INDEX IF EXISTS public.drive_files_scope_idx;
DROP INDEX IF EXISTS public.drive_files_scope_parent_idx;
DROP INDEX IF EXISTS public.drive_files_scope_trashed_idx;
DROP INDEX IF EXISTS public.drive_files_branch_scope_idx;
DROP INDEX IF EXISTS public.drive_files_user_private_idx;
DROP INDEX IF EXISTS public.drive_files_active_name_scope_uq;

CREATE INDEX drive_files_scope_idx ON public.drive_files (scope);
CREATE INDEX drive_files_scope_parent_idx
  ON public.drive_files (scope, parent_code)
  WHERE is_trashed = FALSE;
CREATE INDEX drive_files_scope_trashed_idx
  ON public.drive_files (scope)
  WHERE is_trashed = TRUE;
CREATE INDEX drive_files_user_private_idx
  ON public.drive_files (user_code)
  WHERE scope = 'user_private';

CREATE UNIQUE INDEX drive_files_active_name_scope_uq
  ON public.drive_files (
    scope,
    COALESCE(CASE WHEN scope = 'user_private' THEN user_code ELSE NULL END, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(parent_code, '00000000-0000-0000-0000-000000000000'::uuid),
    LOWER(name)
  )
  WHERE is_trashed = FALSE;

DROP INDEX IF EXISTS public.products_images_gin_idx;

-- products_overview should derive media from drive_links, not products.images.
CREATE OR REPLACE VIEW public.products_overview AS
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
FROM public.products p
LEFT JOIN public.brands b ON p.brand_code = b.code
LEFT JOIN public.categories c ON p.category_code = c.code
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
    FROM public.drive_links dl
    LEFT JOIN public.drive_files df
      ON df.code = dl.file_code
     AND df.scope = 'product_shared'
     AND df.is_trashed = FALSE
    WHERE dl.entity_type = 'product'
      AND dl.entity_code = p.code
) AS media ON TRUE;

-- ==================== DOWN ====================

ALTER TABLE public.drive_files
  DROP CONSTRAINT IF EXISTS drive_files_scope_check;

ALTER TABLE public.drive_files
  ADD COLUMN IF NOT EXISTS branch_code UUID NULL;

ALTER TABLE public.drive_files
  ADD CONSTRAINT drive_files_branch_fk
    FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT;

ALTER TABLE public.drive_files
  ADD CONSTRAINT drive_files_scope_check
    CHECK (scope IN ('product_shared', 'user_private', 'branch_shared')),
  ADD CONSTRAINT drive_files_scope_branch_check
    CHECK (
      (scope = 'branch_shared' AND branch_code IS NOT NULL)
      OR (scope IN ('product_shared', 'user_private') AND branch_code IS NULL)
    );

DROP INDEX IF EXISTS public.drive_files_scope_idx;
DROP INDEX IF EXISTS public.drive_files_scope_parent_idx;
DROP INDEX IF EXISTS public.drive_files_scope_trashed_idx;
DROP INDEX IF EXISTS public.drive_files_user_private_idx;
DROP INDEX IF EXISTS public.drive_files_active_name_scope_uq;

CREATE INDEX drive_files_branch_code_idx ON public.drive_files (branch_code);
CREATE INDEX drive_files_branch_parent_idx ON public.drive_files (branch_code, parent_code) WHERE is_trashed = FALSE;
CREATE INDEX drive_files_branch_trashed_idx ON public.drive_files (branch_code) WHERE is_trashed = TRUE;
CREATE UNIQUE INDEX drive_files_active_name_uq ON public.drive_files (
  branch_code,
  COALESCE(parent_code, '00000000-0000-0000-0000-000000000000'::uuid),
  LOWER(name)
) WHERE is_trashed = FALSE;
CREATE INDEX products_images_gin_idx ON public.products USING GIN (images);

CREATE OR REPLACE VIEW public.products_overview AS
SELECT
    p.code,
    p.name,
    p.description,
    p.brand_code,
    p.category_code,
    p.price,
    p.sku,
    p.images,
    p.is_active,
    p.created_at,
    p.updated_at,
    b.name AS brand_name,
    c.name AS category_name,
    CASE
        WHEN p.images::text = '[]' THEN false
        ELSE true
    END AS has_images,
    jsonb_array_length(p.images) AS images_count,
    CASE
        WHEN jsonb_array_length(p.images) > 0 THEN
            COALESCE(
                (SELECT img->>'url' FROM jsonb_array_elements(p.images) AS img WHERE (img->>'isPrimary')::boolean = true LIMIT 1),
                p.images->0->>'url'
            )
        ELSE NULL
    END AS primary_image_url
FROM public.products p
LEFT JOIN public.brands b ON p.brand_code = b.code
LEFT JOIN public.categories c ON p.category_code = c.code;
