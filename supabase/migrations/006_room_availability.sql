-- ============================================================
-- Migration 006: Room availability system
-- Adds: quantity column, RPC for availability check,
--        BEFORE INSERT/UPDATE trigger for overbooking prevention.
-- Rules: additive only; all statements are idempotent.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add quantity to rooms (how many physical units of this
--    room type the property has).  Default 1 is conservative.
-- ────────────────────────────────────────────────────────────
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- ────────────────────────────────────────────────────────────
-- 2. Availability RPC
--
--    Returns the number of rooms still bookable for the given
--    date window.  Uses the clean BIGINT FK chain:
--      bookings.rate_plan_id → room_rate_plans.id
--                            → room_rate_plans.room_id
--                            → rooms.id
--
--    p_exclude_id: when updating an existing booking pass its
--    UUID so we don't count it against itself.  Defaults NULL.
-- ────────────────────────────────────────────────────────────
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
DECLARE
  v_quantity INTEGER;
  v_booked   INTEGER;
BEGIN
  SELECT quantity INTO v_quantity FROM rooms WHERE id = p_room_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_booked
  FROM   bookings b
  JOIN   room_rate_plans rp ON rp.id = b.rate_plan_id
  WHERE  rp.room_id       = p_room_id
    AND  b.status         IN ('upcoming', 'active')
    AND  b.check_in       < p_check_out
    AND  b.check_out      > p_check_in
    AND  (p_exclude_id IS NULL OR b.id != p_exclude_id);

  RETURN GREATEST(0, v_quantity - v_booked);
END;
$$;

-- Allow both anonymous (availability widget) and authenticated
-- (pre-booking check) callers to read availability.
GRANT EXECUTE ON FUNCTION get_room_availability(BIGINT, DATE, DATE, UUID) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. Trigger function: block overbooking at the DB layer.
--
--    Fires BEFORE INSERT and BEFORE UPDATE on bookings.
--    For UPDATE we pass NEW.id so the booking being changed
--    is excluded from the overlap count (it's not competing
--    with itself).  For INSERT, NEW.id doesn't exist in the
--    table yet, so the exclusion is a harmless no-op.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_room_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_room_id BIGINT;
  v_avail   INTEGER;
BEGIN
  -- Only active/upcoming bookings consume inventory.
  IF NEW.status NOT IN ('upcoming', 'active') THEN RETURN NEW; END IF;
  -- Nothing to check without a rate plan.
  IF NEW.rate_plan_id IS NULL THEN RETURN NEW; END IF;

  SELECT room_id INTO v_room_id
  FROM   room_rate_plans
  WHERE  id = NEW.rate_plan_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  v_avail := get_room_availability(
    v_room_id,
    NEW.check_in::DATE,
    NEW.check_out::DATE,
    NEW.id          -- excluded from count (safe for both INSERT & UPDATE)
  );

  IF v_avail <= 0 THEN
    RAISE EXCEPTION 'ROOM_UNAVAILABLE: No rooms available for the selected dates';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_check_availability ON bookings;
CREATE TRIGGER bookings_check_availability
  BEFORE INSERT OR UPDATE OF check_in, check_out, status, rate_plan_id
  ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_room_availability();
