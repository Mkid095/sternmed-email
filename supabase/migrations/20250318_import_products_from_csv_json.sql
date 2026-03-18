-- =====================================================
-- IMPORT PRODUCTS FROM CSV & JSON DATA SOURCES
-- =====================================================
-- Source files:
--   - products_summary.csv (Grup A Medikal + Medcare products)
--   - compiled_products.json (detailed surgical packs)
--
-- This migration:
--   1. Deletes all existing products
--   2. Creates missing categories (Surgical Drape Pack, Underpad)
--   3. Inserts 32 new products (30 surgical packs + 2 underpads)
--
-- Expected result: 32 products across 2 new categories
-- =====================================================

BEGIN;

-- Step 1: Delete all existing products
-- (CASCADE will handle any foreign key relationships)
DELETE FROM products;

-- Step 2: Ensure categories exist with unique constraint
-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_name_unique'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_name_unique UNIQUE (name);
  END IF;
END $$;

-- Insert missing categories (Surgical Drape Pack, Underpad)
-- They get auto-generated IDs which we'll capture
INSERT INTO categories (id, name, show_on_home, "order")
VALUES
  (gen_random_uuid(), 'Surgical Drape Pack', true, 10),
  (gen_random_uuid(), 'Underpad', true, 20)
ON CONFLICT (name) DO UPDATE
SET
  show_on_home = true,
  "order" = EXCLUDED."order";

-- Store category IDs in variables for reuse
WITH cat_surgical AS (
  SELECT id FROM categories WHERE name = 'Surgical Drape Pack'
), cat_underpad AS (
  SELECT id FROM categories WHERE name = 'Underpad'
)

-- Step 3: Insert Surgical Drape Pack products (30 products)
-- Source: compiled_products.json + CSV supplement
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
  updated_at
)
SELECT
  gen_random_uuid(),
  'Universal Pack A',
  'Complete surgical pack for general procedures. PE drape with adhesive edges. Includes instrument cover and Mayo stand cover.',
  0,
  (SELECT id FROM cat_surgical),
  'https://www.grup-a.com/images/Universal-pack-A.jpg',
  0,
  false,
  ARRAY['https://www.grup-a.com/images/Universal-pack-A.jpg'],
  NOW(),
  NOW()
UNION ALL SELECT gen_random_uuid(), 'Universal Pack B', 'Enhanced surgical drape pack with PE+absorbent table cover. Superior fluid management.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/Universal-pack-B.jpg', 0, false, ARRAY['https://www.grup-a.com/images/Universal-pack-B.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Universal Pack C', 'Standard surgical drape pack. Essential instrument cover for OR procedures.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/Universal-pack-C.jpg', 0, false, ARRAY['https://www.grup-a.com/images/Universal-pack-C.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Laparotomy Pack', 'Abdominal surgery specialist. Large 240x320 cm drape for laparotomy procedures.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/laparotomy-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/laparotomy-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'By-Pass Pack', 'Cardiac bypass pack with fenestration. Includes defibrillator bags and foot covers.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/by-pass-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/by-pass-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Valve Replacement Pack', 'Heart valve replacement specialist pack. Optimized for cardiac procedures.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/valve-replacement-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/valve-replacement-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Thorax Pack', 'Thoracic surgery optimized pack. Chest surgery specific configuration.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/thorax-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/thorax-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Angiography Pack A', 'Femoral access pack with transparent panel. Basic angiography set.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/angiography-pack-a.jpg', 0, false, ARRAY['https://www.grup-a.com/images/angiography-pack-a.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Angiography Pack B', 'Premium dual-panel angiography pack. Enhanced with solution bowls and equipment.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/angiography-pack-b.jpg', 0, false, ARRAY['https://www.grup-a.com/images/angiography-pack-b.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Eye Drape Pack A', 'Ophthalmology pack with LCP (Loose Cantilever Post). Standard eye surgery.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/eye-drape-pack-a.jpg', 0, false, ARRAY['https://www.grup-a.com/images/eye-drape-pack-a.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Eye Drape Pack B', 'Enhanced ophthalmology pack with larger LCP drape. Increased coverage.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/eye-drape-pack-b.jpg', 0, false, ARRAY['https://www.grup-a.com/images/eye-drape-pack-b.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Craniotomy Pack', 'Neurosurgery pack with LCP. Brain surgery optimized drape.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/craniotomy-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/craniotomy-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Hip Pack', 'Hip replacement specialist. U-split drape for optimal hip access.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/hip-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/hip-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Arthroscopy Pack', 'Joint surgery pack with camera cover. Includes liquid collection pouch.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/arthroscopy-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/arthroscopy-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Bilateral Pack', 'Bilateral joint coverage pack. Dual knee/shoulder procedures.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/bilateral-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/bilateral-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Gynaecology Pack', 'Obstetric/Gynecology pack. Lithotomic drape with LCP.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/gynaecology-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/gynaecology-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Delivery Pack', 'Childbirth delivery pack. Includes baby towel and stockinette.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/delivery-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/delivery-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Cesarean Pack A', 'C-section pack with umbilical clamp. Enhanced with absorbent cover.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/cesarean-pack-a.jpg', 0, false, ARRAY['https://www.grup-a.com/images/cesarean-pack-a.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Cesarean Pack B', 'Simplified C-section pack. Standard gowns, no clamp.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/cesarean-pack-b.jpg', 0, false, ARRAY['https://www.grup-a.com/images/cesarean-pack-b.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'OPU Pack', 'Operative urology pack. High gauze count (15 pcs).', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/opu-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/opu-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'E.N.T Pack', 'Ear, Nose, Throat surgery pack. U-split and fenestrated drapes.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/e-n-t-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/e-n-t-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Tur Pack', 'T.U.R procedures pack. Transurethral resection optimized.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/tur-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/tur-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Cystoscopy Pack', 'Cystoscopy procedures pack. Compact bladder scope pack.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/cystoscopy-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/cystoscopy-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Laparoscopic Pack', 'Minimally invasive surgery pack. Lithotomic laparoscopy drape.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/laparoscopic-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/laparoscopic-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Percutane Pack', 'Percutaneous interventions pack. Includes scopy and camera covers.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/percutane-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/percutane-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Angiography Pack C', 'Compact angiography set with fluoroscopy cover. Smaller configuration.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/angiography-pack-c.jpg', 0, false, ARRAY['https://www.grup-a.com/images/angiography-pack-c.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Angioplasty Pack D', 'Complete angioplasty kit. Includes scalpel and solution bowls.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/angioplasty-pack-d.jpg', 0, false, ARRAY['https://www.grup-a.com/images/angioplasty-pack-d.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Shoulder Arthroscopy Pack', 'Shoulder arthroscopy specialist. Largest drape with arm cover.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/shoulder-arthroscopy-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/shoulder-arthroscopy-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Extremity Pack', 'Extremity surgery pack. Features elastic aperture drape.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/extremity-pack.jpg', 0, false, ARRAY['https://www.grup-a.com/images/extremity-pack.jpg'], NOW(), NOW()
UNION ALL SELECT gen_random_uuid(), 'Opthalmology Drape', 'Standalone ophthalmic drapes for eye surgery procedures.', 0, (SELECT id FROM cat_surgical), 'https://www.grup-a.com/images/ophthalmology-drape.jpg', 0, false, ARRAY['https://www.grup-a.com/images/ophthalmology-drape.jpg'], NOW(), NOW();

-- Step 4: Insert Underpad products (2 products)
-- Source: products_summary.csv (Medcare supplier)
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
  updated_at
)
SELECT
  gen_random_uuid(),
  'Underpad Economic',
  'Economical brown underpad. Cost-effective solution for general use. SKU and pricing needed from Medcare.',
  0,
  (SELECT id FROM cat_underpad),
  'https://medcare.com.tr/wp-content/uploads/portfolio/underpad-60x90-cm.jpg',
  0,
  false,
  ARRAY['https://medcare.com.tr/wp-content/uploads/portfolio/underpad-60x90-cm.jpg'],
  NOW(),
  NOW()
UNION ALL SELECT
  gen_random_uuid(),
  'Underpad Plus',
  'Premium green underpad. Enhanced absorbency and durability. SKU and pricing needed from Medcare.',
  0,
  (SELECT id FROM cat_underpad),
  'https://medcare.com.tr/wp-content/uploads/portfolio/underpad-60x90-cm.jpg',
  0,
  false,
  ARRAY['https://medcare.com.tr/wp-content/uploads/portfolio/underpad-60x90-cm.jpg'],
  NOW(),
  NOW();

-- Verification: Log the import summary
DO $$
DECLARE
  product_count INTEGER;
  category_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;
  SELECT COUNT(*) INTO category_count FROM categories WHERE name IN ('Surgical Drape Pack', 'Underpad');

  RAISE NOTICE '✓ Product import completed successfully: % products across % categories',
    product_count, category_count;
END $$;

COMMIT;

-- Rollback (for Supabase migrations, this runs on failure automatically)
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Product import failed: %', SQLERRM;