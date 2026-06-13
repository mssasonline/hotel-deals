-- ============================================================
-- Migration 033: Platform Settings + Dynamic Commission Rate
-- Date: 2026-06-09
--
-- 1. Creates platform_settings key-value store
-- 2. Seeds default commission_rate = 10
-- 3. Updates booking trigger to read commission_rate dynamically
--    so new bookings always use the current admin-set rate
-- ============================================================

-- ── 1. Platform settings table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone (including anon) can read settings — commission rate is non-sensitive
CREATE POLICY "platform_settings_select" ON platform_settings
  FOR SELECT USING (true);

-- Only admin role can insert/update/delete
CREATE POLICY "platform_settings_admin_write" ON platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id  = auth.uid()
         AND profiles.role = 'admin'
    )
  );

-- ── 3. Default values ─────────────────────────────────────────────────────────

INSERT INTO platform_settings (key, value)
VALUES ('commission_rate', '10')
ON CONFLICT (key) DO NOTHING;

-- ── 4. Update booking trigger to use dynamic commission rate ──────────────────
-- Replaces the function defined in migration 032.
-- New bookings now read commission_rate from platform_settings at booking time,
-- so the stored booking_revenue.partner_rate / admin_rate always match the rate
-- that was actually in effect when the booking was paid.

CREATE OR REPLACE FUNCTION handle_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_rate    NUMERIC;
  v_partner_rate  NUMERIC;
BEGIN
  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid')
  THEN
    -- Read dynamic commission rate (falls back to 10 if row missing)
    SELECT COALESCE(value::NUMERIC, 10)
      INTO v_admin_rate
      FROM platform_settings
     WHERE key = 'commission_rate';

    v_admin_rate   := COALESCE(v_admin_rate, 10);
    v_partner_rate := 100 - v_admin_rate;

    -- a) Decrement room availability
    IF NEW.room_id IS NOT NULL THEN
      UPDATE rooms
         SET quantity_available = GREATEST(0, quantity_available - COALESCE(NEW.room_count, 1))
       WHERE id = NEW.room_id;
    END IF;

    -- b) Record revenue split (idempotent)
    INSERT INTO booking_revenue (
      booking_id,
      total_amount,
      partner_rate,
      admin_rate,
      partner_amount,
      admin_amount
    )
    VALUES (
      NEW.id,
      NEW.total_price,
      v_partner_rate,
      v_admin_rate,
      ROUND(NEW.total_price * v_partner_rate / 100, 2),
      ROUND(NEW.total_price * v_admin_rate   / 100, 2)
    )
    ON CONFLICT (booking_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- END OF MIGRATION 033
-- ============================================================
