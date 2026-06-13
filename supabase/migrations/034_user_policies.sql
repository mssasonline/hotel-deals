-- ============================================================
-- Migration 034: User Policy Settings + Auto-Suspend Trigger
-- Date: 2026-06-09
--
-- 1. Adds guest_booking_limit and auto_suspend_threshold to
--    platform_settings (seeded in migration 033)
-- 2. Creates trigger that auto-suspends users who exceed the
--    failed-payment threshold
-- ============================================================

-- ── 1. Seed new platform settings ────────────────────────────────────────────

INSERT INTO platform_settings (key, value) VALUES
  ('guest_booking_limit',    '5'),
  ('auto_suspend_threshold', '3')
ON CONFLICT (key) DO NOTHING;

-- ── 2. Auto-suspend trigger ───────────────────────────────────────────────────
-- Fires on INSERT or UPDATE on bookings when payment_status becomes 'failed'.
-- Counts all failed bookings for the user; if >= threshold, suspends the profile.

CREATE OR REPLACE FUNCTION handle_failed_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_threshold  INT;
  v_fail_count INT;
BEGIN
  IF NEW.payment_status = 'failed'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'failed')
     AND NEW.user_id IS NOT NULL
  THEN
    -- Read dynamic threshold (fallback 3)
    SELECT COALESCE(value::INT, 3)
      INTO v_threshold
      FROM platform_settings
     WHERE key = 'auto_suspend_threshold';
    v_threshold := COALESCE(v_threshold, 3);

    -- Count all failed-payment bookings for this user
    SELECT COUNT(*)
      INTO v_fail_count
      FROM bookings
     WHERE user_id = NEW.user_id
       AND payment_status = 'failed';

    IF v_fail_count >= v_threshold THEN
      UPDATE profiles
         SET status = 'suspended'
       WHERE id     = NEW.user_id
         AND status = 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_failed_payment ON bookings;

CREATE TRIGGER trigger_failed_payment
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_failed_payment();

-- ============================================================
-- END OF MIGRATION 034
-- ============================================================
