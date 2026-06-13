-- ============================================================
-- Migration 007: Manage Booking support
-- Additive only. Idempotent — safe to re-run.
-- ============================================================

-- Add guests_count to bookings (defaults to 1 for all existing rows)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guests_count INTEGER NOT NULL DEFAULT 1;

-- Allow authenticated users to update their own bookings (needed for edit + cancel flows)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'bookings'
      AND policyname = 'Users can update own bookings'
  ) THEN
    CREATE POLICY "Users can update own bookings"
      ON bookings FOR UPDATE
      TO authenticated
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
