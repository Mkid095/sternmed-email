-- =====================================================
-- FIX UNDERPAD IMAGES USING FIRECRAWL SCRAPED DATA
-- =====================================================
-- Source: Scraped from https://medcare.com.tr/portfolio-item/underpad-60x90-cm/
-- Date: 2025-03-18
--
-- The page contains 4 underpad products:
--   1. Underpad (60x90 cm, 30 pcs)          → 3-Underpad-60x90-cm-30-pcs.png
--   2. Underpad Plus (60x90 cm, 30 pcs)     → 4-Underpad-Plus-60x90-cm.jpeg
--   3. Underpad (60x90 cm, 10 pcs)          → 5-Underpad-60x90-cm-10-pcs.jpg
--   4. Underpad Economic (60x90 cm, 30 pcs) → 2-Underpad-Economic-60x90-cm.jpg
--
-- This migration fixes the images for variants #3 and #4
-- (Underpad Plus and Economic were already correct)
-- =====================================================

BEGIN;

-- Fix Underpad 60x90 cm (30 pcs) - was using wrong image
UPDATE products
SET image_url = 'https://medcare.com.tr/wp-content/uploads/2023/11/3-Underpad-60x90-cm-30-pcs.png',
    images = ARRAY['https://medcare.com.tr/wp-content/uploads/2023/11/3-Underpad-60x90-cm-30-pcs.png']
WHERE name = 'Underpad 60x90 cm (30 pcs)';

-- Fix Underpad 60x90 cm (10 pcs) - was using wrong image
UPDATE products
SET image_url = 'https://medcare.com.tr/wp-content/uploads/2023/11/5-Underpad-60x90-cm-10-pcs.jpg',
    images = ARRAY['https://medcare.com.tr/wp-content/uploads/2023/11/5-Underpad-60x90-cm-10-pcs.jpg']
WHERE name = 'Underpad 60x90 cm (10 pcs)';

-- Verification
DO $$
DECLARE
  total_underpads INTEGER;
  correct_images INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_underpads FROM products WHERE category_id = (SELECT id FROM categories WHERE name = 'Underpad');
  SELECT COUNT(*) INTO correct_images FROM products
    WHERE category_id = (SELECT id FROM categories WHERE name = 'Underpad')
    AND image_url IS NOT NULL
    AND image_url LIKE 'https://medcare.com.tr/%';

  RAISE NOTICE '✓ Underpad images fixed: % of % have correct Medcare images', correct_images, total_underpads;
END $$;

COMMIT;

-- Rollback on error
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to fix underpad images: %', SQLERRM;