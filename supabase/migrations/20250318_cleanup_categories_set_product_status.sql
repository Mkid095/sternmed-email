-- =====================================================
-- CLEANUP CATEGORIES & SET PRODUCT STATUS
-- =====================================================
-- Client Requirements:
--   - Surgical drape packs: "Coming Soon" status
--   - Underpads: "Available" status
--   - Remove all other empty categories
--
-- This migration:
--   1. Adds `status` column to products
--   2. Updates status based on category
--   3. Deletes all empty categories except Surgical Drape Pack and Underpad
--
-- Expected: 2 categories, 32 products with correct status
-- =====================================================

BEGIN;

-- Step 1: Add status column if it doesn't exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available'
CHECK (status IN ('available', 'coming_soon', 'out_of_stock'));

COMMENT ON COLUMN products.status IS
  'Product availability status: available (in stock and orderable), coming_soon (not yet available), out_of_stock (temporarily unavailable)';

-- Step 2: Update product status based on category and source
-- Per client request:
--   - Surgical Drape Pack (from Grup A Medikal) → "coming_soon"
--   - Underpad (from Medcare) → "available"
UPDATE products
SET status = CASE
  WHEN category_id = (SELECT id FROM categories WHERE name = 'Surgical Drape Pack') THEN 'coming_soon'
  WHEN category_id = (SELECT id FROM categories WHERE name = 'Underpad') THEN 'available'
  ELSE status
END
WHERE category_id IN (
  SELECT id FROM categories WHERE name IN ('Surgical Drape Pack', 'Underpad')
);

-- Step 3: Remove all categories with no products (except the two we keep)
DELETE FROM categories
WHERE name NOT IN ('Surgical Drape Pack', 'Underpad')
  AND id NOT IN (SELECT category_id FROM products WHERE category_id IS NOT NULL);

-- Step 4: Verify final state (for logging)
DO $$
DECLARE
  category_count INTEGER;
  product_count INTEGER;
  surgical_count INTEGER;
  underpad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_count FROM categories;
  SELECT COUNT(*) INTO product_count FROM products;
  SELECT COUNT(*) INTO surgical_count FROM products
    WHERE category_id = (SELECT id FROM categories WHERE name = 'Surgical Drape Pack');
  SELECT COUNT(*) INTO underpad_count FROM products
    WHERE category_id = (SELECT id FROM categories WHERE name = 'Underpad');

  RAISE NOTICE '✓ Cleanup completed: % categories (Surgical Drape Pack, Underpad), % products (% surgical + % underpads)',
    category_count, product_count, surgical_count, underpad_count;
END $$;

COMMIT;

-- Rollback on error
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Cleanup failed: %', SQLERRM;