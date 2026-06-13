-- ============================================================
-- Migration 025: Seed room image_url based on room_type
-- Date: 2026-06-07
--
-- Backfills image_url for rooms that have a known room_type but
-- no image_url set. Matching is case-insensitive via ILIKE.
-- Rooms that already have an image_url are untouched.
-- ============================================================

UPDATE rooms
SET image_url = CASE
  WHEN room_type ILIKE '%presidential%'
    THEN 'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%penthouse%'
    THEN 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%junior suite%'
    THEN 'https://images.unsplash.com/photo-1566665797739-167ff3a1a3a4?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%suite%'
    THEN 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%deluxe%'
    THEN 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%family%'
    THEN 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%twin%'
    THEN 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%economy%' OR room_type ILIKE '%single%'
    THEN 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80'
  WHEN room_type ILIKE '%standard%'
    THEN 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80'
  ELSE NULL
END
WHERE image_url IS NULL
  AND room_type IS NOT NULL
  AND room_type <> '';

-- ============================================================
-- END OF MIGRATION 025
-- ============================================================
