-- Migration 036: Drop unused rooms columns
-- currency  — never read by any query; all currency handling is in the UI layer
-- quantity  — legacy column (migration 006); superseded by quantity_total /
--             quantity_available (migration 010). Both columns have been backfilled
--             and are NOT NULL with defaults, so the fallback is never needed.

-- ── 1. Update get_room_availability to remove the quantity fallback ───────────
--    The TEXT overload is the primary one; the BIGINT overload just delegates to it.

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
  SELECT COALESCE(quantity_total, 1)
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

GRANT EXECUTE ON FUNCTION get_room_availability(TEXT, DATE, DATE, UUID) TO anon, authenticated;

-- ── 2. Drop unused columns ────────────────────────────────────────────────────

ALTER TABLE rooms
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS quantity;
