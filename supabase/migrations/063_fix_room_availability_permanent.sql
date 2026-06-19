-- ============================================================
-- Migration 063: Permanent fix for room availability reset
--
-- Root cause:
--   handle_booking_confirmed() in migration 043 permanently
--   decrements quantity_available on every paid booking.
--   This is never reversed, so rooms stay at 0 forever.
--
-- Fix:
--   1. Remove the decrement from handle_booking_confirmed.
--      Real overbooking prevention lives in enforce_room_availability
--      (BEFORE INSERT trigger) — that is the authoritative gate.
--   2. Simplify reset_daily_room_availability to always restore
--      quantity_available = quantity_total for all rooms.
--      quantity_available is a UI display hint only.
--   3. Run reset immediately to unblock today's rooms.
--   4. Reschedule pg_cron to 11:50 AM UAE (07:50 UTC).
-- ============================================================


-- ── 1. Fix handle_booking_confirmed — remove the decrement ───────────────────

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

    -- quantity_available is NOT decremented here.
    -- enforce_room_availability (BEFORE INSERT trigger) is the real gate.
    -- The daily reset restores full allocation each morning.

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


-- ── 2. Simplify reset — always restore full allocation ───────────────────────

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
$$;


-- ── 3. Run immediately to unblock today's rooms ──────────────────────────────

SELECT public.reset_daily_room_availability();


-- ── 4. Reschedule pg_cron to 11:50 AM UAE (07:50 UTC) ───────────────────────
--       Runs 10 min before the booking window opens at noon UAE.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-room-availability-daily') THEN
    PERFORM cron.unschedule('reset-room-availability-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'reset-room-availability-daily',
  '50 7 * * *',   -- 07:50 UTC = 11:50 AM UAE (UTC+4)
  'SELECT public.reset_daily_room_availability()'
);


-- ============================================================
-- END OF MIGRATION 063
-- ============================================================
