-- ============================================================
-- Migration 031: Hotel Coordinates + Airport Code
-- Date: 2026-06-08
--
-- Adds GPS coordinates and airport code to hotels table,
-- enabling distance-based "Near Me" search.
-- ============================================================

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS latitude     NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude    NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS airport_code VARCHAR(10);

-- Partial index — only hotels that have coordinates participate in geo search
CREATE INDEX IF NOT EXISTS idx_hotels_coordinates
  ON hotels (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================
-- END OF MIGRATION 031
-- ============================================================
