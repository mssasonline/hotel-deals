-- ============================================================
-- Migration 030: Critical Fixes + Schema Cleanup
-- Date: 2026-06-08
--
-- Sections:
--   1. Fix get_room_availability RPC (broken since M015 dropped room_rate_plans)
--   2. Fix enforce_room_availability trigger (same issue)
--   3. Add missing RLS policies for destination_cities
--   4. Drop deprecated columns (rooms + hotels)
--   5. Performance indexes
-- ============================================================


-- ============================================================
-- SECTION 1: FIX get_room_availability RPC
--
-- Migration 015 dropped the room_rate_plans table and
-- removed bookings.rate_plan_id, but the RPC still JOINs
-- on room_rate_plans. Every availability check has been
-- returning an error since M015.
--
-- New logic: query bookings.room_id directly.
-- The room_id column in bookings stores the rooms.id value
-- as a string (TEXT comparison handles UUID or BIGINT representations).
-- ============================================================

CREATE OR REPLACE FUNCTION get_room_availability(
  p_room_id    TEXT,
  p_check_in   DATE,
  p_check_out  DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity INTEGER;
  v_booked   INTEGER;
BEGIN
  -- Use quantity_total if set, fall back to legacy quantity column
  SELECT COALESCE(quantity_total, quantity, 1)
  INTO   v_quantity
  FROM   rooms
  WHERE  id::TEXT = p_room_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_booked
  FROM   bookings b
  WHERE  b.room_id::TEXT = p_room_id
    AND  b.status        IN ('upcoming', 'active')
    AND  b.check_in      < p_check_out
    AND  b.check_out     > p_check_in
    AND  (p_exclude_id IS NULL OR b.id != p_exclude_id);

  RETURN GREATEST(0, v_quantity - v_booked);
END;
$$;

-- Keep the BIGINT overload for any callers that pass a numeric room_id
CREATE OR REPLACE FUNCTION get_room_availability(
  p_room_id    BIGINT,
  p_check_in   DATE,
  p_check_out  DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_room_availability(
    p_room_id::TEXT,
    p_check_in,
    p_check_out,
    p_exclude_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_room_availability(TEXT,   DATE, DATE, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_room_availability(BIGINT, DATE, DATE, UUID) TO anon, authenticated;


-- ============================================================
-- SECTION 2: FIX enforce_room_availability TRIGGER
--
-- The trigger function references NEW.rate_plan_id (dropped in M015)
-- and calls room_rate_plans (table dropped in M015), so every
-- INSERT/UPDATE on bookings with status=upcoming/active raises:
--   ERROR: column "rate_plan_id" does not exist
--
-- New logic: use NEW.room_id directly for the availability check.
-- ============================================================

-- Drop the broken trigger first
DROP TRIGGER IF EXISTS bookings_check_availability ON bookings;

CREATE OR REPLACE FUNCTION enforce_room_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_avail INTEGER;
BEGIN
  -- Only upcoming/active bookings consume inventory
  IF NEW.status NOT IN ('upcoming', 'active') THEN
    RETURN NEW;
  END IF;

  -- Nothing to check if no room is referenced
  IF NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_avail := get_room_availability(
    NEW.room_id::TEXT,
    NEW.check_in::DATE,
    NEW.check_out::DATE,
    NEW.id
  );

  IF v_avail <= 0 THEN
    RAISE EXCEPTION 'ROOM_UNAVAILABLE: No rooms available for the selected dates';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_check_availability
  BEFORE INSERT OR UPDATE OF check_in, check_out, status
  ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_room_availability();


-- ============================================================
-- SECTION 3: MISSING RLS POLICIES — destination_cities
--
-- The table has a public SELECT policy but no write policies,
-- so admins cannot add, edit, or deactivate cities via the app.
-- ============================================================

DROP POLICY IF EXISTS "destination_cities_insert_admin" ON destination_cities;
DROP POLICY IF EXISTS "destination_cities_update_admin" ON destination_cities;
DROP POLICY IF EXISTS "destination_cities_delete_admin" ON destination_cities;

CREATE POLICY "destination_cities_insert_admin"
  ON destination_cities FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "destination_cities_update_admin"
  ON destination_cities FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "destination_cities_delete_admin"
  ON destination_cities FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ============================================================
-- SECTION 4: DROP DEPRECATED COLUMNS
--
-- These columns were tagged DEPRECATED in migrations 010–013
-- and are confirmed unused in all .ts/.tsx files.
-- Dropping them now to keep the schema clean.
-- ============================================================

-- rooms: deprecated pricing + policy columns
ALTER TABLE rooms
  DROP COLUMN IF EXISTS refundable,
  DROP COLUMN IF EXISTS cancellation_policy,
  DROP COLUMN IF EXISTS breakfast_included;

-- rooms: legacy single-integer availability (replaced by quantity_available/total)
-- NOTE: keep the `quantity` column as-is since it's still referenced by the
--       get_room_availability fallback COALESCE above.

-- hotels: deprecated price columns (superseded by rooms.base_price / price_per_night)
ALTER TABLE hotels
  DROP COLUMN IF EXISTS original_price,
  DROP COLUMN IF EXISTS current_price;


-- ============================================================
-- SECTION 5: PERFORMANCE INDEXES
--
-- Missing indexes identified by query analysis.
-- All use IF NOT EXISTS so this section is safe to re-run.
-- ============================================================

-- Partner booking management: filtered by hotel + status
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_status
  ON bookings (hotel_id, status);

-- Availability overlap check (used by RPC and search)
CREATE INDEX IF NOT EXISTS idx_bookings_dates_status
  ON bookings (check_in, check_out)
  WHERE status IN ('upcoming', 'active');

-- Hotel search / autocomplete by city
CREATE INDEX IF NOT EXISTS idx_hotels_city
  ON hotels (city)
  WHERE city IS NOT NULL;

-- Profile lookups by email (admin user search)
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles (email)
  WHERE email IS NOT NULL;

-- room availability index: active rooms by hotel
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_qty
  ON rooms (hotel_id, quantity_available)
  WHERE quantity_available > 0;


-- ============================================================
-- END OF MIGRATION 030
-- ============================================================
