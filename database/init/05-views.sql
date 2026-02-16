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
