-- Migration: drop products images column
-- Created: 2026-02-16T17:00:00.000Z

-- ==================== UP ====================

-- Product media is sourced from drive_links + drive_files via products_overview.
DROP INDEX IF EXISTS public.products_images_gin_idx;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS images;

-- ==================== DOWN ====================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
