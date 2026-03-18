-- =====================================================
-- ADD MISSING UNDERPAD VARIANTS
-- =====================================================
-- Client discovered: There should be 4 underpad products total:
--   1. Underpad Economic (brown, 30 pcs)
--   2. Underpad Plus (green, 30 pcs)
--   3. Underpad (60x90 cm, 30 pcs) - regular
--   4. Underpad (60x90 cm, 10 pcs) - smaller pack
--
-- This migration adds the 2 missing variants (items 3 & 4)
-- =====================================================

BEGIN;

-- Insert missing underpad variants
INSERT INTO products (
  id,
  name,
  description,
  price,
  category_id,
  image_url,
  stock,
  is_featured,
  images,
  created_at,
  updated_at,
  status
) VALUES
  (
    gen_random_uuid(),
    'Underpad 60x90 cm (30 pcs)',
    'Standard underpad 60x90 cm (23.6" x 35.4"), pack of 30 pieces. High absorbency for medical facilities.',
    0,
    (SELECT id FROM categories WHERE name = 'Underpad'),
    'https://medcare.com.tr/wp-content/uploads/2023/11/4-Underpad-Plus-60x90-cm.jpeg',
    0,
    false,
    ARRAY['https://medcare.com.tr/wp-content/uploads/2023/11/4-Underpad-Plus-60x90-cm.jpeg'],
    NOW(),
    NOW(),
    'available'
  ),
  (
    gen_random_uuid(),
    'Underpad 60x90 cm (10 pcs)',
    'Standard underpad 60x90 cm (23.6" x 35.4"), pack of 10 pieces. Convenient smaller pack for clinics.',
    0,
    (SELECT id FROM categories WHERE name = 'Underpad'),
    'https://medcare.com.tr/wp-content/uploads/2023/11/4-Underpad-Plus-60x90-cm.jpeg',
    0,
    false,
    ARRAY['https://medcare.com.tr/wp-content/uploads/2023/11/4-Underpad-Plus-60x90-cm.jpeg'],
    NOW(),
    NOW(),
    'available'
  );

-- Verification
DO $$
DECLARE
  underpad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO underpad_count FROM products WHERE category_id = (SELECT id FROM categories WHERE name = 'Underpad');
  RAISE NOTICE '✓ Underpad products added. Total underpads: % (should be 4)', underpad_count;
END $$;

COMMIT;

-- Rollback on error
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add underpad variants: %', SQLERRM;