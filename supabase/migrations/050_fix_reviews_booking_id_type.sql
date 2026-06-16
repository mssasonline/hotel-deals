-- ============================================================
-- Migration 050: Fix reviews.booking_id type UUID → BIGINT
-- Date: 2026-06-14
--
-- Migration 005 defined booking_id as UUID, but bookings.id is
-- BIGINT. This mismatch causes the RLS EXISTS check to fail
-- (can't compare BIGINT to UUID), blocking all review inserts
-- from regular guest users.
-- ============================================================

-- Drop FK and unique constraint first (they reference the column)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS unique_review_per_booking;
DROP INDEX IF EXISTS idx_reviews_booking_id;

-- Change column type; NULL-out any existing values that can't cast
DO $$
DECLARE v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'reviews'
    AND column_name  = 'booking_id';

  IF v_type = 'uuid' THEN
    ALTER TABLE reviews ALTER COLUMN booking_id TYPE BIGINT USING NULL::BIGINT;
    RAISE NOTICE 'reviews.booking_id changed UUID → BIGINT';
  ELSE
    RAISE NOTICE 'reviews.booking_id is already % — no change needed', v_type;
  END IF;
END $$;

-- Recreate constraints
ALTER TABLE reviews
  ADD CONSTRAINT unique_review_per_booking UNIQUE (booking_id);

ALTER TABLE reviews
  ADD CONSTRAINT reviews_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);

-- ============================================================
-- END OF MIGRATION 050
-- ============================================================
