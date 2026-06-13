-- ============================================================
-- Migration 005: Reviews — booking integration & hotel stats
-- Safe, additive only. No DROP, no DELETE.
-- ============================================================

-- Add booking_id to reviews (nullable so existing rows are unaffected)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);

-- One review per booking — prevents duplicates at the DB level
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_review_per_booking' AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT unique_review_per_booking UNIQUE (booking_id);
  END IF;
END $$;

-- Add rating and review_count to hotels
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS rating       NUMERIC(3, 2) DEFAULT 0;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS review_count INTEGER        NOT NULL DEFAULT 0;

-- ============================================================
-- END OF MIGRATION 005
-- ============================================================
