-- Migration 057: Normalize hotels.amenities — convert any label strings to canonical key strings.
-- Some hotels were saved with display labels (e.g. 'Swimming Pool', 'Free Wi-Fi') instead of
-- the canonical keys (e.g. 'pool', 'free_wifi'). This migration standardises all values.

CREATE OR REPLACE FUNCTION normalize_amenity_key(val TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE lower(trim(val))
    -- pool
    WHEN 'swimming pool'      THEN 'pool'
    WHEN 'pool'               THEN 'pool'
    -- gym
    WHEN 'gym / fitness'      THEN 'gym'
    WHEN 'gym/fitness'        THEN 'gym'
    WHEN 'gym & fitness'      THEN 'gym'
    WHEN 'gym'                THEN 'gym'
    WHEN 'fitness'            THEN 'gym'
    WHEN 'fitness center'     THEN 'gym'
    -- spa
    WHEN 'spa & wellness'     THEN 'spa'
    WHEN 'spa and wellness'   THEN 'spa'
    WHEN 'spa'                THEN 'spa'
    WHEN 'wellness'           THEN 'spa'
    -- restaurant
    WHEN 'restaurant'         THEN 'restaurant'
    -- free_parking
    WHEN 'free parking'       THEN 'free_parking'
    WHEN 'parking'            THEN 'free_parking'
    WHEN 'free_parking'       THEN 'free_parking'
    -- airport_shuttle
    WHEN 'airport shuttle'    THEN 'airport_shuttle'
    WHEN 'airport_shuttle'    THEN 'airport_shuttle'
    WHEN 'shuttle'            THEN 'airport_shuttle'
    -- business_center
    WHEN 'business center'    THEN 'business_center'
    WHEN 'business_center'    THEN 'business_center'
    WHEN 'business'           THEN 'business_center'
    -- conference
    WHEN 'conference room'    THEN 'conference'
    WHEN 'conference rooms'   THEN 'conference'
    WHEN 'conference'         THEN 'conference'
    WHEN 'meeting room'       THEN 'conference'
    -- free_wifi
    WHEN 'free wi-fi'         THEN 'free_wifi'
    WHEN 'free wifi'          THEN 'free_wifi'
    WHEN 'wi-fi'              THEN 'free_wifi'
    WHEN 'wifi'               THEN 'free_wifi'
    WHEN 'free_wifi'          THEN 'free_wifi'
    -- room_service
    WHEN 'room service'       THEN 'room_service'
    WHEN 'room_service'       THEN 'room_service'
    -- pet_friendly
    WHEN 'pet friendly'       THEN 'pet_friendly'
    WHEN 'pet_friendly'       THEN 'pet_friendly'
    WHEN 'pets allowed'       THEN 'pet_friendly'
    -- kids_club
    WHEN 'kids club'          THEN 'kids_club'
    WHEN 'kids_club'          THEN 'kids_club'
    WHEN 'kids'' club'        THEN 'kids_club'
    WHEN 'children club'      THEN 'kids_club'
    -- beach_access
    WHEN 'beach access'       THEN 'beach_access'
    WHEN 'beach_access'       THEN 'beach_access'
    WHEN 'private beach'      THEN 'beach_access'
    -- golf
    WHEN 'golf course'        THEN 'golf'
    WHEN 'golf'               THEN 'golf'
    -- bar_lounge
    WHEN 'bar & lounge'       THEN 'bar_lounge'
    WHEN 'bar and lounge'     THEN 'bar_lounge'
    WHEN 'bar/lounge'         THEN 'bar_lounge'
    WHEN 'bar_lounge'         THEN 'bar_lounge'
    WHEN 'bar'                THEN 'bar_lounge'
    WHEN 'lounge'             THEN 'bar_lounge'
    -- rooftop
    WHEN 'rooftop'            THEN 'rooftop'
    WHEN 'roof top'           THEN 'rooftop'
    -- valet_parking
    WHEN 'valet parking'      THEN 'valet_parking'
    WHEN 'valet_parking'      THEN 'valet_parking'
    WHEN 'valet'              THEN 'valet_parking'
    -- casino
    WHEN 'casino'             THEN 'casino'
    -- pass through unknown values unchanged
    ELSE val
  END;
END;
$$;

-- Apply normalisation to all hotels, then deduplicate
UPDATE hotels
SET amenities = ARRAY(
  SELECT DISTINCT normalize_amenity_key(elem)
  FROM unnest(amenities) AS elem
  ORDER BY 1
)
WHERE amenities IS NOT NULL AND array_length(amenities, 1) > 0;

-- Clean up helper function (no longer needed at runtime)
DROP FUNCTION normalize_amenity_key(TEXT);
