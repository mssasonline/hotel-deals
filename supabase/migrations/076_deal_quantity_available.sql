-- Deal quantity_available: partner-controlled nightly override for deals.
-- Mirrors the rooms.quantity_available pattern (migration 075).
-- get_deal_availability now uses quantity_available as base instead of quantity_total.
-- Daily cron resets quantity_available = quantity_total each morning.

-- 1. Add quantity_available column to partner_deals
ALTER TABLE partner_deals
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER;

-- 2. Initialise existing rows to their current quantity_total
UPDATE partner_deals SET quantity_available = quantity_total WHERE quantity_available IS NULL;

-- 3. Update get_deal_availability to use quantity_available as base
CREATE OR REPLACE FUNCTION get_deal_availability(
  p_deal_id   UUID,
  p_check_in  DATE,
  p_check_out DATE
) RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_base   INTEGER;
  v_booked INTEGER;
BEGIN
  SELECT COALESCE(quantity_available, quantity_total, 1) INTO v_base
  FROM partner_deals
  WHERE id = p_deal_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_booked
  FROM bookings
  WHERE deal_id    = p_deal_id
    AND status    != 'cancelled'
    AND check_in   < p_check_out
    AND check_out  > p_check_in;

  RETURN GREATEST(0, v_base - v_booked);
END;
$$;

GRANT EXECUTE ON FUNCTION get_deal_availability(UUID, DATE, DATE) TO anon, authenticated;

-- 4. Extend daily reset to also reset deals
CREATE OR REPLACE FUNCTION public.reset_daily_room_availability()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE rooms
     SET quantity_available = COALESCE(quantity_total, 1),
         available          = true
   WHERE COALESCE(quantity_total, 0) > 0;

  UPDATE partner_deals
     SET quantity_available = COALESCE(quantity_total, 1)
   WHERE COALESCE(quantity_total, 0) > 0;
$$;
