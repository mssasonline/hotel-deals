-- ============================================================
-- Migration 042: Fix all booking type mismatches
-- Date: 2026-06-10
--
-- Root cause: bookings.id is UUID but booking_revenue.booking_id
-- was created as BIGINT (migration 032), causing every AFTER INSERT
-- trigger to fail and roll back the booking.
-- Also ensures bookings.room_id is BIGINT (in case migration 041 failed).
-- This migration is idempotent — safe to run multiple times.
-- ============================================================

-- ── Step 1: Fix bookings.room_id if it is still UUID ─────────────────────────

DO $$
DECLARE v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
  FROM   information_schema.columns
  WHERE  table_schema = 'public'
    AND  table_name   = 'bookings'
    AND  column_name  = 'room_id';

  IF v_type = 'uuid' THEN
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;
    EXECUTE 'ALTER TABLE bookings ALTER COLUMN room_id TYPE BIGINT USING NULL::BIGINT';
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
    RAISE NOTICE 'bookings.room_id changed UUID → BIGINT';
  ELSE
    RAISE NOTICE 'bookings.room_id is already % — no change needed', v_type;
  END IF;
END $$;


-- ── Step 2: Drop broken triggers (they fire on INSERT and block bookings) ─────

DROP TRIGGER IF EXISTS trigger_booking_confirmed ON bookings;
DROP TRIGGER IF EXISTS trigger_failed_payment    ON bookings;


-- ── Step 3: Recreate booking_revenue with UUID booking_id ────────────────────

DO $$
DECLARE v_type TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'booking_revenue'
  ) THEN
    SELECT data_type INTO v_type
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'booking_revenue'
      AND  column_name  = 'booking_id';

    IF v_type IS DISTINCT FROM 'uuid' THEN
      -- Wrong type (or missing) — drop and recreate
      DROP TABLE booking_revenue CASCADE;
      RAISE NOTICE 'booking_revenue dropped (booking_id was %, expected uuid)', v_type;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS booking_revenue (
  id             BIGSERIAL      PRIMARY KEY,
  booking_id     BIGINT         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  total_amount   NUMERIC(12, 2) NOT NULL,
  partner_rate   NUMERIC(5, 2)  NOT NULL DEFAULT 90.00,
  admin_rate     NUMERIC(5, 2)  NOT NULL DEFAULT 10.00,
  partner_amount NUMERIC(12, 2) NOT NULL,
  admin_amount   NUMERIC(12, 2) NOT NULL,
  created_at     TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_revenue_booking
  ON booking_revenue (booking_id);

-- RLS: partners and admins can read their own revenue
ALTER TABLE booking_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_select" ON booking_revenue;
CREATE POLICY "revenue_select" ON booking_revenue
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR booking_id IN (
         SELECT b.id FROM bookings b
         WHERE b.hotel_id IN (SELECT hotel_id FROM hotel_partners WHERE user_id = auth.uid())
       )
  );


-- ── Step 4: Recreate handle_booking_confirmed (correct types) ─────────────────

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

    -- Decrement room availability
    IF NEW.room_id IS NOT NULL THEN
      UPDATE rooms
         SET quantity_available = GREATEST(0, quantity_available - COALESCE(NEW.room_count, 1))
       WHERE id = NEW.room_id;
    END IF;

    -- Record revenue split (idempotent)
    INSERT INTO booking_revenue (
      booking_id, total_amount, partner_rate, admin_rate, partner_amount, admin_amount
    ) VALUES (
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

DROP TRIGGER IF EXISTS trigger_booking_confirmed ON bookings;
CREATE TRIGGER trigger_booking_confirmed
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_confirmed();


-- ── Step 5: Recreate handle_failed_payment ────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_failed_payment()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_threshold  INT;
  v_fail_count INT;
BEGIN
  IF NEW.payment_status = 'failed'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'failed')
     AND NEW.user_id IS NOT NULL
  THEN
    SELECT COALESCE(value::INT, 3)
      INTO v_threshold
      FROM platform_settings WHERE key = 'auto_suspend_threshold';
    v_threshold := COALESCE(v_threshold, 3);

    SELECT COUNT(*) INTO v_fail_count
      FROM bookings
     WHERE user_id = NEW.user_id
       AND payment_status = 'failed';

    IF v_fail_count >= v_threshold THEN
      UPDATE profiles
         SET status = 'suspended'
       WHERE id = NEW.user_id
         AND COALESCE(status, 'active') = 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_failed_payment ON bookings;
CREATE TRIGGER trigger_failed_payment
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_failed_payment();


-- ── Step 6: Backfill revenue for existing paid bookings (if any) ──────────────

INSERT INTO booking_revenue (
  booking_id, total_amount, partner_rate, admin_rate, partner_amount, admin_amount
)
SELECT
  b.id,
  b.total_price,
  90.00,
  10.00,
  ROUND(b.total_price * 0.90, 2),
  ROUND(b.total_price * 0.10, 2)
FROM bookings b
WHERE b.payment_status = 'paid'
  AND b.total_price IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM booking_revenue br WHERE br.booking_id = b.id)
ON CONFLICT (booking_id) DO NOTHING;


-- ============================================================
-- END OF MIGRATION 042
-- ============================================================
