-- =====================================================
-- FIX PRODUCT IMAGES USING COMPILED_PRODUCTS.JSON DATA
-- =====================================================
-- Source: compiled_products.json (scraped from original websites)
-- This migration corrects all image URLs that were guessed/placeholder in initial import
--
-- Images sourced from:
--   Grup A Medikal: https://www.grup-a.com/en/prdcat/1/surgical-drapes-packs
--   Medcare: https://medcare.com.tr/portfolio-item/underpad-60x90-cm/
-- =====================================================

BEGIN;

-- Surgical Drape Pack images (from compiled_products.json)
UPDATE products SET image_url = 'https://www.grup-a.com/images/Universal-pack-A.jpg', images = ARRAY['https://www.grup-a.com/images/Universal-pack-A.jpg'] WHERE name = 'Universal Pack A';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Universal-pack-B.jpg', images = ARRAY['https://www.grup-a.com/images/Universal-pack-B.jpg'] WHERE name = 'Universal Pack B';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Universal-pack-C.jpg', images = ARRAY['https://www.grup-a.com/images/Universal-pack-C.jpg'] WHERE name = 'Universal Pack C';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Laparatomy-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Laparatomy-Pack.jpg'] WHERE name = 'Laparotomy Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/By-Pass-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/By-Pass-Pack.jpg'] WHERE name = 'By-Pass Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Valve-Replacement-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Valve-Replacement-Pack.jpg'] WHERE name = 'Valve Replacement Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Thorax-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Thorax-Pack.jpg'] WHERE name = 'Thorax Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Angiography-Pack-A.jpg', images = ARRAY['https://www.grup-a.com/images/Angiography-Pack-A.jpg'] WHERE name = 'Angiography Pack A';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Angiography-Pack-B.jpg', images = ARRAY['https://www.grup-a.com/images/Angiography-Pack-B.jpg'] WHERE name = 'Angiography Pack B';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Angiography-Pack-C.jpg', images = ARRAY['https://www.grup-a.com/images/Angiography-Pack-C.jpg'] WHERE name = 'Angiography Pack C';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Angioplasty-Pack-D.JPG', images = ARRAY['https://www.grup-a.com/images/Angioplasty-Pack-D.JPG'] WHERE name = 'Angioplasty Pack D';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Eye-Drape-Pack-A.jpg', images = ARRAY['https://www.grup-a.com/images/Eye-Drape-Pack-A.jpg'] WHERE name = 'Eye Drape Pack A';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Eye-Drape-Pack-B.jpg', images = ARRAY['https://www.grup-a.com/images/Eye-Drape-Pack-B.jpg'] WHERE name = 'Eye Drape Pack B';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Ophthalmic-Drapes.jpg', images = ARRAY['https://www.grup-a.com/images/Ophthalmic-Drapes.jpg'] WHERE name = 'Opthalmology Drape';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Craniotomy-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Craniotomy-Pack.jpg'] WHERE name = 'Craniotomy Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Hip-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Hip-Pack.jpg'] WHERE name = 'Hip Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Arthroscopy-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Arthroscopy-Pack.jpg'] WHERE name = 'Arthroscopy Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Bilateral-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Bilateral-Pack.jpg'] WHERE name = 'Bilateral Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Gynaecology-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Gynaecology-Pack.jpg'] WHERE name = 'Gynaecology Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Delivery-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Delivery-Pack.jpg'] WHERE name = 'Delivery Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Cesarean-Pack-A.jpg', images = ARRAY['https://www.grup-a.com/images/Cesarean-Pack-A.jpg'] WHERE name = 'Cesarean Pack A';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Cesarean-Pack-B.jpg', images = ARRAY['https://www.grup-a.com/images/Cesarean-Pack-B.jpg'] WHERE name = 'Cesarean Pack B';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Opu-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Opu-Pack.jpg'] WHERE name = 'OPU Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/ENT-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/ENT-Pack.jpg'] WHERE name = 'E.N.T Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Tur-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Tur-Pack.jpg'] WHERE name = 'Tur Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Cystoscopy-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Cystoscopy-Pack.jpg'] WHERE name = 'Cystoscopy Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Laparatomy-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Laparatomy-Pack.jpg'] WHERE name = 'Laparoscopic Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Percutaneous-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Percutaneous-Pack.jpg'] WHERE name = 'Percutane Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Shoulder-Arthroscopy-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Shoulder-Arthroscopy-Pack.jpg'] WHERE name = 'Shoulder Arthroscopy Pack';
UPDATE products SET image_url = 'https://www.grup-a.com/images/Extremity-Pack.jpg', images = ARRAY['https://www.grup-a.com/images/Extremity-Pack.jpg'] WHERE name = 'Extremity Pack';

-- Underpad images (from Medcare)
UPDATE products SET image_url = 'https://medcare.com.tr/wp-content/uploads/2023/11/2-Underpad-Economic-60x90-cm.jpg', images = ARRAY['https://medcare.com.tr/wp-content/uploads/2023/11/2-Underpad-Economic-60x90-cm.jpg'] WHERE name = 'Underpad Economic';
UPDATE products SET image_url = 'https://medcare.com.tr/wp-content/uploads/2023/11/4-Underpad-Plus-60x90-cm.jpeg', images = ARRAY['https://medcare.com.tr/wp-content/uploads/2023/11/4-Underpad-Plus-60x90-cm.jpeg'] WHERE name = 'Underpad Plus';

-- Verification
DO $$
DECLARE
  null_count INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM products WHERE image_url IS NULL OR image_url = '';
  SELECT COUNT(*) INTO updated_count FROM products WHERE image_url IS NOT NULL AND image_url != '';

  IF null_count = 0 THEN
    RAISE NOTICE '✓ All % products now have valid image URLs', updated_count;
  ELSE
    RAISE NOTICE '⚠ % products still missing images (total: %)', null_count, (SELECT COUNT(*) FROM products);
  END IF;
END $$;

COMMIT;