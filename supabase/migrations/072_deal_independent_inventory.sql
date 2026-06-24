-- Deal Independent Inventory
-- Each partner_deal now has its own quantity_total (set by the partner).
-- Bookings record which deal they came from via deal_id.
-- Availability is calculated independently per deal (not from rooms.quantity_available).

-- 1. Add quantity_total to partner_deals
ALTER TABLE partner_deals
  ADD COLUMN IF NOT EXISTS quantity_total INTEGER NOT NULL DEFAULT 1;

-- 2. Add deal_id to bookings (nullable — regular room bookings have no deal)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES partner_deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_deal_id ON bookings(deal_id) WHERE deal_id IS NOT NULL;

-- 3. RPC: calculate available deal slots for a date range
--    Available = quantity_total - COUNT(non-cancelled bookings with deal_id in date range)
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
  v_quantity INTEGER;
  v_booked   INTEGER;
BEGIN
  SELECT quantity_total INTO v_quantity
  FROM partner_deals
  WHERE id = p_deal_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_booked
  FROM bookings
  WHERE deal_id    = p_deal_id
    AND status    != 'cancelled'
    AND check_in   < p_check_out
    AND check_out  > p_check_in;

  RETURN GREATEST(0, v_quantity - v_booked);
END;
$$;

GRANT EXECUTE ON FUNCTION get_deal_availability(UUID, DATE, DATE) TO anon, authenticated;
