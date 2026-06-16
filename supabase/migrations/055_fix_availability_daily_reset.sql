-- ============================================================
-- Migration 055: Fix daily availability reset & remove
--                cumulative decrement from booking trigger
--
-- Problem:
--   handle_booking_confirmed() permanently decrements
--   quantity_available with every paid booking, regardless of
--   the booking's check-in/check-out dates.  The daily cron
--   then blindly resets to quantity_total without accounting
--   for bookings still active that day.  Result: the partner
--   rooms page shows a running-down counter that never
--   correctly reflects per-day availability.
--
-- Fix:
--   1. Remove the quantity_available decrement from
--      handle_booking_confirmed — get_room_availability() is
--      the authoritative source for real availability checks.
--   2. Rewrite reset_daily_room_availability() to recompute
--      each room's availability for TODAY using the RPC,
--      so quantity_available always reflects actual bookings
--      for the current night.
-- ============================================================


-- ── 1. Rebuild handle_booking_confirmed without the decrement ─────────────────

CREATE OR REPLACE FUNCTION handle_booking_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_rate   NUMERIC;
  v_partner_rate NUMERIC;
BEGIN
  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid')
  THEN
    SELECT COALESCE(value::NUMERIC, 10)
      INTO v_admin_rate
      FROM platform_settings WHERE key = 'commission_rate';
    v_admin_rate   := COALESCE(v_admin_rate, 10);
    v_partner_rate := 100 - v_admin_rate;

    -- NOTE: quantity_available is intentionally NOT decremented here.
    -- The stored value is refreshed by the daily cron (which calls
    -- get_room_availability for the current date) and by
    -- syncRoomAvailability after manual partner edits.
    -- The enforce_room_availability trigger is the gate that prevents
    -- overbooking in real time.

    INSERT INTO booking_revenue (
      booking_id, total_amount, partner_rate, admin_rate, partner_amount, admin_amount
    ) VALUES (
      NEW.id, NEW.total_price, v_partner_rate, v_admin_rate,
      ROUND(NEW.total_price * v_partner_rate / 100, 2),
      ROUND(NEW.total_price * v_admin_rate   / 100, 2)
    )
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


-- ── 2. Fix reset_daily_room_availability to use get_room_availability ─────────

CREATE OR REPLACE FUNCTION public.reset_daily_room_availability()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r      RECORD;
  v_avail INTEGER;
  v_today DATE    := CURRENT_DATE;
  v_tmrw  DATE    := CURRENT_DATE + 1;
BEGIN
  FOR r IN
    SELECT id FROM rooms WHERE quantity_total IS NOT NULL AND quantity_total > 0
  LOOP
    v_avail := get_room_availability(r.id::TEXT, v_today, v_tmrw);
    UPDATE rooms
       SET quantity_available = v_avail,
           available          = (v_avail > 0)
     WHERE id = r.id;
  END LOOP;
END;
$$;


-- ── 3. Update cron schedule to 10:00 AM UAE (06:00 UTC) ──────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-room-availability-daily') THEN
    PERFORM cron.unschedule('reset-room-availability-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'reset-room-availability-daily',
  '0 6 * * *',   -- 06:00 UTC = 10:00 AM UAE (UTC+4)
  'SELECT public.reset_daily_room_availability()'
);


-- ── 4. Immediately resync all rooms for today ─────────────────────────────────

SELECT public.reset_daily_room_availability();


-- ============================================================
-- END OF MIGRATION 055
-- ============================================================
