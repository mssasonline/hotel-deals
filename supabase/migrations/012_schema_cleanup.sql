-- ============================================================
-- Migration 012: Schema Cleanup
-- Date: 2026-06-04
--
-- Phase 2 of the SelectedRoom architecture refactor.
-- Phase 1 (010/011) added room-based pricing columns.
-- Phase 2 (this file) finalises the bookings table and
-- adds deprecation markers so application code can stop
-- referencing old columns with confidence.
--
-- Safety rules:
--   - NO DROP TABLE / NO DELETE / NO destructive changes
--   - All ADD COLUMN statements use IF NOT EXISTS
--   - Backfills run before NOT NULL constraints
--   - All existing rows, IDs, and foreign keys are preserved
-- ============================================================


-- ============================================================
-- PART 1: Bookings table — add room_count and locked_price
--
-- SelectedRoom bookings store:
--   • locked_price  — the exact per-room price charged at booking time
--   • room_count    — number of rooms booked (today always 1, future use)
--   • guests_count  — already exists (migration 007)
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS room_count   INTEGER,
  ADD COLUMN IF NOT EXISTS locked_price NUMERIC(10, 2);

-- Backfill room_count = 1 for all existing bookings
UPDATE bookings
SET room_count = 1
WHERE room_count IS NULL;

-- Backfill locked_price from total_price for existing bookings
-- (total_price already includes taxes; this is the best approximation
--  we have for historical bookings that predate the locked_price column)
UPDATE bookings
SET locked_price = total_price
WHERE locked_price IS NULL AND total_price IS NOT NULL;

-- Apply NOT NULL + DEFAULT now that all rows are filled
ALTER TABLE bookings
  ALTER COLUMN room_count   SET DEFAULT 1,
  ALTER COLUMN room_count   SET NOT NULL,
  ALTER COLUMN locked_price SET DEFAULT 0;

-- Index to support partner/admin revenue queries by room count
CREATE INDEX IF NOT EXISTS idx_bookings_room_count
  ON bookings (room_count)
  WHERE room_count > 1;


-- ============================================================
-- PART 2: Deprecation comments — rooms table
--
-- price_per_night was the original pricing column.
-- It is superseded by base_price (migration 010/011).
-- Do NOT drop it yet — some legacy queries may still join on it.
-- Remove in migration 013 after all application code is updated.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rooms'
      AND column_name  = 'price_per_night'
  ) THEN
    COMMENT ON COLUMN rooms.price_per_night IS
      'DEPRECATED: Use rooms.base_price instead. price_per_night is kept for backward compatibility only. Will be dropped in migration 013.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rooms'
      AND column_name  = 'refundable'
  ) THEN
    COMMENT ON COLUMN rooms.refundable IS
      'DEPRECATED: SelectedRoom bookings are always non-refundable. This column is ignored by all application code. Will be dropped in migration 013.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rooms'
      AND column_name  = 'cancellation_policy'
  ) THEN
    COMMENT ON COLUMN rooms.cancellation_policy IS
      'DEPRECATED: SelectedRoom bookings are always non-refundable. No cancellation policy applies.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rooms'
      AND column_name  = 'breakfast_included'
  ) THEN
    COMMENT ON COLUMN rooms.breakfast_included IS
      'DEPRECATED: Breakfast inclusion is not part of the SelectedRoom same-day deal model. Kept for data history only.';
  END IF;
END $$;


-- ============================================================
-- PART 3: Deprecation comments — room_rate_plans table
--
-- rate plans still exist as a booking-time price selection mechanism
-- but their cancellation_policy and breakfast_included fields
-- are no longer surfaced in the application UI.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'room_rate_plans'
      AND column_name  = 'cancellation_policy'
  ) THEN
    COMMENT ON COLUMN room_rate_plans.cancellation_policy IS
      'DEPRECATED: All SelectedRoom bookings are non-refundable. This field is preserved for historical data only and is not displayed in the UI.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'room_rate_plans'
      AND column_name  = 'breakfast_included'
  ) THEN
    COMMENT ON COLUMN room_rate_plans.breakfast_included IS
      'DEPRECATED: Breakfast inclusion is not part of the SelectedRoom same-day deal model. This field is preserved for historical data only.';
  END IF;
END $$;


-- ============================================================
-- PART 4: Deprecation comments — hotels table (re-affirm 010/011)
-- These were added in earlier migrations but are repeated here
-- for documentation completeness in a single authoritative place.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'hotels'
      AND column_name  = 'original_price'
  ) THEN
    COMMENT ON COLUMN hotels.original_price IS
      'DEPRECATED (since migration 010): Use rooms.base_price instead. Hotels are not a pricing entity in the SelectedRoom model.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'hotels'
      AND column_name  = 'current_price'
  ) THEN
    COMMENT ON COLUMN hotels.current_price IS
      'DEPRECATED (since migration 010): current_price is always computed dynamically from rooms.base_price and rooms.min_price via the pricing engine. Never stored.';
  END IF;
END $$;


-- ============================================================
-- END OF MIGRATION 012
-- ============================================================
