-- ============================================================
-- Migration 043: Fix type mismatches in availability + triggers
-- Date: 2026-06-10
--
-- Root cause of TIMEOUT:
--   enforce_room_availability() calls get_room_availability()
--   passing NEW.id (BIGINT) as p_exclude_id (UUID) → type error
--   → INSERT hangs/fails.
--
-- This migration:
--   1. Drops all triggers on bookings (clean slate)
--   2. Recreates get_room_availability with BIGINT p_exclude_id
--   3. Recreates enforce_room_availability correctly
--   4. Recreates booking_revenue with BIGINT booking_id
--   5. Recreates handle_booking_confirmed + handle_failed_payment
--   6. Reattaches all triggers
-- ============================================================


-- ── 1. Drop all triggers on bookings ─────────────────────────────────────────

DROP TRIGGER IF EXISTS bookings_check_availability  ON bookings;
DROP TRIGGER IF EXISTS trigger_booking_confirmed    ON bookings;
DROP TRIGGER IF EXISTS trigger_failed_payment       ON bookings;


-- ── 2. Fix get_room_availability — change p_exclude_id from UUID to BIGINT ───

-- Drop old TEXT overload and recreate
DROP FUNCTION IF EXISTS get_room_availability(TEXT, DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION get_room_availability(
  p_room_id    TEXT,
  p_check_in   DATE,
  p_check_out  DATE,
  p_exclude_id BIGINT DEFAULT NULL   -- was UUID; bookings.id is BIGINT
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

-- Drop old BIGINT overload and recreate (p_exclude_id also BIGINT now)
DROP FUNCTION IF EXISTS get_room_availability(BIGINT, DATE, DATE, UUID);

CREATE OR REPLACE FUNCTION get_room_availability(
  p_room_id    BIGINT,
  p_check_in   DATE,
  p_check_out  DATE,
  p_exclude_id BIGINT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_room_availability(
    p_room_id::TEXT,
    p_check_in,
    p_check_out,
    p_exclude_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_room_availability(TEXT,   DATE, DATE, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_room_availability(BIGINT, DATE, DATE, BIGINT) TO anon, authenticated;


-- ── 3. Recreate enforce_room_availability ────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_room_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_avail INTEGER;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN RETURN NEW; END IF;
  IF NEW.room_id IS NULL               THEN RETURN NEW; END IF;

  v_avail := get_room_availability(
    NEW.room_id::TEXT,
    NEW.check_in::DATE,
    NEW.check_out::DATE,
    NEW.id   -- BIGINT, now matches p_exclude_id BIGINT
  );

  IF v_avail <= 0 THEN
    RAISE EXCEPTION 'ROOM_UNAVAILABLE: No rooms available for the selected dates';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_check_availability ON bookings;
CREATE TRIGGER bookings_check_availability
  BEFORE INSERT OR UPDATE OF check_in, check_out, status
  ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_room_availability();


-- ── 4. Recreate booking_revenue with BIGINT booking_id ───────────────────────

DO $$
DECLARE v_type TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'booking_revenue'
  ) THEN
    SELECT data_type INTO v_type
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'booking_revenue'
      AND  column_name  = 'booking_id';

    IF v_type IS DISTINCT FROM 'bigint' THEN
      DROP TABLE booking_revenue CASCADE;
      RAISE NOTICE 'booking_revenue dropped (booking_id was %, expected bigint)', v_type;
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

ALTER TABLE booking_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_select" ON booking_revenue;
CREATE POLICY "revenue_select" ON booking_revenue FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR booking_id IN (
      SELECT b.id FROM bookings b
      WHERE b.hotel_id IN (SELECT hotel_id FROM hotel_partners WHERE user_id = auth.uid())
    )
  );


-- ── 5. Recreate handle_booking_confirmed ─────────────────────────────────────

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

    IF NEW.room_id IS NOT NULL THEN
      UPDATE rooms
         SET quantity_available = GREATEST(0, quantity_available - COALESCE(NEW.room_count, 1))
       WHERE id = NEW.room_id;
    END IF;

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

DROP TRIGGER IF EXISTS trigger_booking_confirmed ON bookings;
CREATE TRIGGER trigger_booking_confirmed
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_confirmed();


-- ── 6. Recreate handle_failed_payment ────────────────────────────────────────

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
     WHERE user_id = NEW.user_id AND payment_status = 'failed';

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


-- ── 7. Backfill revenue for existing paid bookings ───────────────────────────

INSERT INTO booking_revenue (
  booking_id, total_amount, partner_rate, admin_rate, partner_amount, admin_amount
)
SELECT
  b.id, b.total_price, 90.00, 10.00,
  ROUND(b.total_price * 0.90, 2),
  ROUND(b.total_price * 0.10, 2)
FROM bookings b
WHERE b.payment_status = 'paid'
  AND b.total_price IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM booking_revenue br WHERE br.booking_id = b.id)
ON CONFLICT (booking_id) DO NOTHING;


-- ============================================================
-- END OF MIGRATION 043
-- ============================================================
