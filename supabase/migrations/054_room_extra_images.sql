-- Migration 054: add image_url_2 and image_url_3 to rooms
-- Partners can now upload up to 3 images per room.

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS image_url_2 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS image_url_3 TEXT DEFAULT NULL;
