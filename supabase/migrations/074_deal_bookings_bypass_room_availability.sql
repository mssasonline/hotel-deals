-- Deal bookings use independent inventory (deal_id IS NOT NULL).
-- They must NOT be counted against room inventory.
-- Two changes:
--   1. enforce_room_availability: skip check when deal_id is set.
--   2. get_room_availability: exclude deal bookings from the room count.

-- ── 1. enforce_room_availability — skip for deal bookings ────────────────────

CREATE OR REPLACE FUNCTION enforce_room_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_avail INTEGER;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN RETURN NEW; END IF;
  IF NEW.room_id IS NULL                       THEN RETURN NEW; END IF;
  IF NEW.deal_id IS NOT NULL                   THEN RETURN NEW; END IF;

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

-- ── 2. get_room_availability — exclude deal bookings from count ──────────────

CREATE OR REPLACE FUNCTION get_room_availability(
  p_room_id    TEXT,
  p_check_in   DATE,
  p_check_out  DATE,
  p_exclude_id BIGINT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total  INTEGER;
  v_booked INTEGER;
BEGIN
  SELECT COALESCE(quantity_total, 1) INTO v_total
  FROM rooms WHERE id = p_room_id::BIGINT;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_booked
  FROM bookings
  WHERE room_id   = p_room_id::BIGINT
    AND deal_id   IS NULL
    AND status   != 'cancelled'
    AND check_in  < p_check_out
    AND check_out > p_check_in
    AND (p_exclude_id IS NULL OR id != p_exclude_id);

  RETURN GREATEST(0, v_total - v_booked);
END;
$$;

GRANT EXECUTE ON FUNCTION get_room_availability(TEXT, DATE, DATE, BIGINT) TO anon, authenticated;
