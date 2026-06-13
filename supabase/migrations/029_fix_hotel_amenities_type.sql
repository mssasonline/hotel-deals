-- Migration 029: Convert hotels.amenities from TEXT to TEXT[]
-- The column existed as TEXT before migration 028, so IF NOT EXISTS skipped it.
-- This safely converts any existing JSON string values like '["pool","gym"]' to TEXT[].

ALTER TABLE hotels
  ALTER COLUMN amenities TYPE TEXT[]
  USING CASE
    WHEN amenities IS NULL OR amenities = '' OR amenities = '[]' OR amenities = '{}'
    THEN '{}'::TEXT[]
    ELSE ARRAY(SELECT json_array_elements_text(amenities::json))
  END;

ALTER TABLE hotels ALTER COLUMN amenities SET DEFAULT '{}';
