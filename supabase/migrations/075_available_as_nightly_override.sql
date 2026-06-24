-- quantity_available is now the partner-controlled "tonight's stock" on SelectedRoom.
-- get_room_availability uses quantity_available (not quantity_total) as the base.
-- Daily cron still resets quantity_available = quantity_total each morning.
-- Partner can lower it (rooms booked elsewhere) or raise it independently.

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
  v_base   INTEGER;
  v_booked INTEGER;
BEGIN
  -- Use quantity_available as tonight's base (falls back to quantity_total)
  SELECT COALESCE(quantity_available, quantity_total, 1) INTO v_base
  FROM rooms WHERE id = p_room_id::BIGINT;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Count only non-deal platform bookings that overlap the requested dates
  SELECT COUNT(*) INTO v_booked
  FROM bookings
  WHERE room_id   = p_room_id::BIGINT
    AND deal_id   IS NULL
    AND status   != 'cancelled'
    AND check_in  < p_check_out
    AND check_out > p_check_in
    AND (p_exclude_id IS NULL OR id != p_exclude_id);

  RETURN GREATEST(0, v_base - v_booked);
END;
$$;

GRANT EXECUTE ON FUNCTION get_room_availability(TEXT, DATE, DATE, BIGINT) TO anon, authenticated;
