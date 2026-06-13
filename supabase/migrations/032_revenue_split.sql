-- ============================================================
-- Migration 032: Revenue Split + Room Inventory Trigger
-- Date: 2026-06-09
--
-- 1. Creates booking_revenue table to record 90/10 split
-- 2. Creates DB trigger that fires when payment_status → 'paid':
--    a. Decrements quantity_available on the booked room
--    b. Inserts revenue split record (90% partner / 10% admin)
-- ============================================================

-- ── 1. Revenue split table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_revenue (
  id              BIGSERIAL      PRIMARY KEY,
  booking_id      BIGINT         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  total_amount    NUMERIC(12, 2) NOT NULL,
  partner_rate    NUMERIC(5, 2)  NOT NULL DEFAULT 90.00,
  admin_rate      NUMERIC(5, 2)  NOT NULL DEFAULT 10.00,
  partner_amount  NUMERIC(12, 2) NOT NULL,
  admin_amount    NUMERIC(12, 2) NOT NULL,
  created_at      TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_revenue_booking
  ON booking_revenue (booking_id);

-- ── 2. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Fires when payment_status is 'paid' on INSERT,
  -- OR when payment_status transitions to 'paid' on UPDATE
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN

    -- a) Decrement room availability (floor at 0)
    IF NEW.room_id IS NOT NULL THEN
      UPDATE rooms
         SET quantity_available = GREATEST(0, quantity_available - COALESCE(NEW.room_count, 1))
       WHERE id = NEW.room_id;
    END IF;

    -- b) Record revenue split (idempotent via ON CONFLICT DO NOTHING)
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
      90.00,
      10.00,
      ROUND(NEW.total_price * 0.90, 2),
      ROUND(NEW.total_price * 0.10, 2)
    )
    ON CONFLICT (booking_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Attach trigger (fires on INSERT and UPDATE) ───────────────────────────
-- Bookings can be inserted directly with payment_status = 'paid' (current flow)
-- OR transitioned via an UPDATE. Both cases are handled.

DROP TRIGGER IF EXISTS trigger_booking_confirmed ON bookings;

CREATE TRIGGER trigger_booking_confirmed
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_confirmed();

-- ── 4. Back-fill existing paid bookings ──────────────────────────────────────
-- Seeds booking_revenue for any bookings already marked paid before this migration.

INSERT INTO booking_revenue (
  booking_id,
  total_amount,
  partner_rate,
  admin_rate,
  partner_amount,
  admin_amount
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
  AND NOT EXISTS (
    SELECT 1 FROM booking_revenue br WHERE br.booking_id = b.id
  );

-- ── 5. RPC: partner revenue summary ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_partner_revenue_summary(p_hotel_id BIGINT)
RETURNS TABLE (
  total_bookings    BIGINT,
  paid_bookings     BIGINT,
  gross_revenue     NUMERIC,
  partner_revenue   NUMERIC,
  admin_revenue     NUMERIC,
  partner_rate      NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(b.id)                                        AS total_bookings,
    COUNT(br.id)                                       AS paid_bookings,
    COALESCE(SUM(br.total_amount),  0)                 AS gross_revenue,
    COALESCE(SUM(br.partner_amount), 0)                AS partner_revenue,
    COALESCE(SUM(br.admin_amount),   0)                AS admin_revenue,
    90.00                                              AS partner_rate
  FROM bookings b
  LEFT JOIN booking_revenue br ON br.booking_id = b.id
  WHERE b.hotel_id = p_hotel_id;
$$;

-- ── 6. RPC: admin revenue summary (all partners) ──────────────────────────────

CREATE OR REPLACE FUNCTION get_admin_revenue_summary()
RETURNS TABLE (
  partner_id       TEXT,
  partner_name     TEXT,
  partner_email    TEXT,
  hotel_count      BIGINT,
  booking_count    BIGINT,
  gross_revenue    NUMERIC,
  partner_payout   NUMERIC,
  admin_commission NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id::TEXT                                         AS partner_id,
    COALESCE(p.full_name, p.email)                     AS partner_name,
    p.email                                            AS partner_email,
    COUNT(DISTINCT hp.hotel_id)                        AS hotel_count,
    COUNT(DISTINCT br.booking_id)                      AS booking_count,
    COALESCE(SUM(br.total_amount),   0)                AS gross_revenue,
    COALESCE(SUM(br.partner_amount), 0)                AS partner_payout,
    COALESCE(SUM(br.admin_amount),   0)                AS admin_commission
  FROM profiles p
  JOIN hotel_partners hp ON hp.user_id = p.id
  JOIN bookings b         ON b.hotel_id = hp.hotel_id
  JOIN booking_revenue br ON br.booking_id = b.id
  WHERE p.role = 'partner'
  GROUP BY p.id, p.full_name, p.email
  ORDER BY gross_revenue DESC;
$$;

-- ============================================================
-- END OF MIGRATION 032
-- ============================================================
