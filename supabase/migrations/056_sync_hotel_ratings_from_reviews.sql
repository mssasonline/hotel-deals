-- Migration 056: Auto-sync hotels.rating and hotels.review_count from reviews table
-- Creates a trigger that fires after any INSERT / UPDATE / DELETE on reviews
-- and recalculates the aggregate for the affected hotel.
-- Also runs a one-time back-fill so existing rows are correct immediately.

-- ── Trigger function ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_hotel_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_hotel_id BIGINT;
BEGIN
  target_hotel_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.hotel_id ELSE NEW.hotel_id END;

  UPDATE hotels
  SET
    rating = COALESCE(
      (SELECT ROUND(AVG(r.rating)::NUMERIC, 2) FROM reviews r WHERE r.hotel_id = target_hotel_id),
      0
    ),
    review_count = (SELECT COUNT(*) FROM reviews r WHERE r.hotel_id = target_hotel_id)
  WHERE id = target_hotel_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach trigger (drop first to allow re-running safely) ───────────────────

DROP TRIGGER IF EXISTS trg_sync_hotel_rating ON reviews;

CREATE TRIGGER trg_sync_hotel_rating
  AFTER INSERT OR UPDATE OF rating OR DELETE
  ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION sync_hotel_rating();

-- ── One-time back-fill for existing review data ──────────────────────────────

UPDATE hotels h
SET
  rating = COALESCE(
    (SELECT ROUND(AVG(r.rating)::NUMERIC, 2) FROM reviews r WHERE r.hotel_id = h.id),
    0
  ),
  review_count = (SELECT COUNT(*) FROM reviews r WHERE r.hotel_id = h.id);
