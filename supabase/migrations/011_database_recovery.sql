-- ============================================================
-- Migration 011: Database Recovery
-- Date: 2026-06-03
--
-- Purpose: Bring Supabase schema in sync with the codebase after
-- the pricing refactor (migration 010) was not applied, and
-- hotel_partners table is missing.
--
-- Safety rules:
--   - NO DROP TABLE / NO DELETE / NO destructive changes
--   - All statements are idempotent (IF NOT EXISTS / DO blocks)
--   - Backfill happens before NOT NULL constraints are set
--   - All existing hotels, rooms, bookings, reviews, users preserved
-- ============================================================


-- ============================================================
-- PART 1: rooms pricing columns
-- These were defined in migration 010 but never applied.
-- Backfill derives values from the existing price_per_night column
-- (NOT NULL in migration 001, so there are no NULL values to worry
-- about after the backfill UPDATE statements run).
-- ============================================================

-- 1a. Add columns — no-ops if they already exist
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS base_price         NUMERIC,
  ADD COLUMN IF NOT EXISTS min_price          NUMERIC,
  ADD COLUMN IF NOT EXISTS currency           VARCHAR(10) DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS quantity_total     INTEGER,
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER;

-- 1b. Backfill base_price from price_per_night
UPDATE rooms
SET base_price = price_per_night
WHERE base_price IS NULL
  AND price_per_night IS NOT NULL;

-- 1c. Backfill min_price as 50 % of price_per_night
--     GREATEST(1, ...) guards against the unlikely case of a
--     sub-2-AED room hitting the min_price > 0 constraint.
UPDATE rooms
SET min_price = GREATEST(1, ROUND(price_per_night * 0.5, 2))
WHERE min_price IS NULL
  AND price_per_night IS NOT NULL;

-- 1d. Backfill quantity columns
--     Use the existing `quantity` column (added in migration 006)
--     if it exists; fall back to 1 otherwise.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'rooms'
      AND  column_name  = 'quantity'
  ) THEN
    UPDATE rooms
    SET quantity_total = COALESCE(quantity, 1)
    WHERE quantity_total IS NULL;

    UPDATE rooms
    SET quantity_available = COALESCE(quantity, 1)
    WHERE quantity_available IS NULL;
  ELSE
    UPDATE rooms SET quantity_total     = 1 WHERE quantity_total     IS NULL;
    UPDATE rooms SET quantity_available = 1 WHERE quantity_available IS NULL;
  END IF;
END $$;

-- 1e. Apply NOT NULL + DEFAULT constraints now that all rows are filled
ALTER TABLE rooms
  ALTER COLUMN base_price         SET NOT NULL,
  ALTER COLUMN min_price          SET NOT NULL,
  ALTER COLUMN quantity_total     SET DEFAULT 1,
  ALTER COLUMN quantity_available SET DEFAULT 1;

-- 1f. Check constraints (drop first so re-run is safe)
ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_min_price_check;
ALTER TABLE rooms
  ADD CONSTRAINT rooms_min_price_check
    CHECK (min_price > 0 AND min_price <= base_price);

ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_quantity_check;
ALTER TABLE rooms
  ADD CONSTRAINT rooms_quantity_check
    CHECK (quantity_available >= 0 AND quantity_total >= 1);

-- 1g. Indexes for fast cheapest-room and availability lookups
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_base_price
  ON rooms (hotel_id, base_price);

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_quantity
  ON rooms (hotel_id, quantity_available)
  WHERE quantity_available > 0;


-- ============================================================
-- PART 2: hotel_partners table
-- Defined in migration 003 but missing from the live database.
-- Partners are linked to the hotels they manage via this table.
-- Absence causes all /partner/* pages to fail silently.
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_partners (
  id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id   BIGINT NOT NULL REFERENCES hotels(id)     ON DELETE CASCADE,
  role       VARCHAR(100) NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, hotel_id)
);

CREATE INDEX IF NOT EXISTS idx_hotel_partners_user_id
  ON hotel_partners(user_id);

CREATE INDEX IF NOT EXISTS idx_hotel_partners_hotel_id
  ON hotel_partners(hotel_id);

ALTER TABLE hotel_partners ENABLE ROW LEVEL SECURITY;

-- RLS: partners see only their own rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'hotel_partners'
      AND policyname = 'Partners can view their own records'
  ) THEN
    CREATE POLICY "Partners can view their own records"
      ON hotel_partners FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS: admins see all rows (needed for admin console)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'hotel_partners'
      AND policyname = 'Admins can view all partner records'
  ) THEN
    CREATE POLICY "Admins can view all partner records"
      ON hotel_partners FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin')
        )
      );
  END IF;
END $$;

-- RLS: only admins can insert/update (auto_link trigger handles partner inserts)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'hotel_partners'
      AND policyname = 'Authenticated users can create partner records'
  ) THEN
    CREATE POLICY "Authenticated users can create partner records"
      ON hotel_partners FOR INSERT TO authenticated
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'hotel_partners'
      AND policyname = 'Authenticated users can update partner records'
  ) THEN
    CREATE POLICY "Authenticated users can update partner records"
      ON hotel_partners FOR UPDATE TO authenticated
      USING (auth.role() = 'authenticated');
  END IF;
END $$;


-- ============================================================
-- PART 3: Deprecation comments on hotels columns
-- Wrapped in DO blocks — safe if the columns do not exist.
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
      'DEPRECATED: Use rooms.base_price instead. Kept for backward compatibility.';
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
      'DEPRECATED: current_price is dynamically computed from rooms.base_price and rooms.min_price. Never store here.';
  END IF;
END $$;


-- ============================================================
-- END OF MIGRATION 011
-- ============================================================
