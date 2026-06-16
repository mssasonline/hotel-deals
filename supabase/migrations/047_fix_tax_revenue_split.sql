-- ============================================================
-- Migration 047: Fix Revenue Split — Exclude Taxes from Partner/Admin Share
--
-- Problem: booking_revenue was computing partner/admin amounts from
--          total_price (which includes 15% tax). Taxes belong to the
--          government, not to the partner or the platform.
--
-- Fix:
--   1. Add subtotal_amount + tax_amount columns to booking_revenue
--   2. Bookings table gets a `subtotal` column (room price before tax)
--   3. Trigger now splits on subtotal, not total_price
--   4. Back-fill existing rows: subtotal = ROUND(total_price / 1.15, 2)
--   5. Update RPCs to return tax column
-- ============================================================

-- ── 1. Add subtotal column to bookings ────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);

-- ── 2. Back-fill existing bookings: subtotal = total_price / 1.15 ─────────────
UPDATE bookings
   SET subtotal = ROUND(total_price / 1.15, 2)
 WHERE subtotal IS NULL AND total_price IS NOT NULL;

-- ── 3. Add subtotal_amount + tax_amount to booking_revenue ────────────────────
ALTER TABLE booking_revenue
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS tax_amount      NUMERIC(12, 2);

-- ── 4. Back-fill booking_revenue rows ────────────────────────────────────────
UPDATE booking_revenue br
   SET subtotal_amount = ROUND(br.total_amount / 1.15, 2),
       tax_amount      = br.total_amount - ROUND(br.total_amount / 1.15, 2),
       partner_amount  = ROUND((br.total_amount / 1.15) * (br.partner_rate / 100), 2),
       admin_amount    = ROUND((br.total_amount / 1.15) * (br.admin_rate   / 100), 2)
 WHERE subtotal_amount IS NULL;

-- ── 5. Replace trigger function ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_subtotal NUMERIC(12,2);
BEGIN
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN

    -- a) Decrement room availability
    IF NEW.room_id IS NOT NULL THEN
      UPDATE rooms
         SET quantity_available = GREATEST(0, quantity_available - COALESCE(NEW.room_count, 1))
       WHERE id = NEW.room_id;
    END IF;

    -- b) Determine subtotal (prefer stored value, fall back to total / 1.15)
    v_subtotal := COALESCE(
      NEW.subtotal,
      ROUND(NEW.total_price / 1.15, 2)
    );

    -- c) Record revenue split on subtotal only (taxes excluded)
    INSERT INTO booking_revenue (
      booking_id,
      total_amount,
      subtotal_amount,
      tax_amount,
      partner_rate,
      admin_rate,
      partner_amount,
      admin_amount
    )
    VALUES (
      NEW.id,
      NEW.total_price,
      v_subtotal,
      NEW.total_price - v_subtotal,
      90.00,
      10.00,
      ROUND(v_subtotal * 0.90, 2),
      ROUND(v_subtotal * 0.10, 2)
    )
    ON CONFLICT (booking_id) DO UPDATE
      SET subtotal_amount = EXCLUDED.subtotal_amount,
          tax_amount      = EXCLUDED.tax_amount,
          partner_amount  = EXCLUDED.partner_amount,
          admin_amount    = EXCLUDED.admin_amount;

  END IF;

  RETURN NEW;
END;
$$;

-- ── 6. Update RPC: partner revenue summary ────────────────────────────────────
DROP FUNCTION IF EXISTS get_partner_revenue_summary(BIGINT);
CREATE OR REPLACE FUNCTION get_partner_revenue_summary(p_hotel_id BIGINT)
RETURNS TABLE (
  total_bookings  BIGINT,
  paid_bookings   BIGINT,
  gross_revenue   NUMERIC,   -- what guest paid (incl. tax)
  subtotal        NUMERIC,   -- room revenue before tax
  tax_collected   NUMERIC,   -- tax portion
  partner_revenue NUMERIC,   -- 90% of subtotal
  admin_revenue   NUMERIC,   -- 10% of subtotal
  partner_rate    NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(b.id),
    COUNT(br.id),
    COALESCE(SUM(br.total_amount),    0),
    COALESCE(SUM(br.subtotal_amount), 0),
    COALESCE(SUM(br.tax_amount),      0),
    COALESCE(SUM(br.partner_amount),  0),
    COALESCE(SUM(br.admin_amount),    0),
    90.00
  FROM bookings b
  LEFT JOIN booking_revenue br ON br.booking_id = b.id
  WHERE b.hotel_id = p_hotel_id;
$$;

-- ── 7. Update RPC: admin revenue summary ─────────────────────────────────────
DROP FUNCTION IF EXISTS get_admin_revenue_summary();
CREATE OR REPLACE FUNCTION get_admin_revenue_summary()
RETURNS TABLE (
  partner_id       TEXT,
  partner_name     TEXT,
  partner_email    TEXT,
  hotel_count      BIGINT,
  booking_count    BIGINT,
  gross_revenue    NUMERIC,
  subtotal         NUMERIC,
  tax_collected    NUMERIC,
  partner_payout   NUMERIC,
  admin_commission NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id::TEXT,
    COALESCE(p.full_name, p.email),
    p.email,
    COUNT(DISTINCT hp.hotel_id),
    COUNT(DISTINCT br.booking_id),
    COALESCE(SUM(br.total_amount),    0),
    COALESCE(SUM(br.subtotal_amount), 0),
    COALESCE(SUM(br.tax_amount),      0),
    COALESCE(SUM(br.partner_amount),  0),
    COALESCE(SUM(br.admin_amount),    0)
  FROM profiles p
  JOIN hotel_partners hp ON hp.user_id = p.id
  JOIN bookings b         ON b.hotel_id = hp.hotel_id
  JOIN booking_revenue br ON br.booking_id = b.id
  WHERE p.role = 'partner'
  GROUP BY p.id, p.full_name, p.email
  ORDER BY SUM(br.total_amount) DESC NULLS LAST;
$$;

-- ── 8. Fix admin dashboard stats — use subtotal for revenue figures ───────────
-- get_dashboard_stats: total_revenue and revenue_today exclude taxes

DROP FUNCTION IF EXISTS get_dashboard_stats();
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_hotels    BIGINT,
  total_partners  BIGINT,
  total_users     BIGINT,
  total_bookings  BIGINT,
  total_revenue   NUMERIC,
  revenue_today   NUMERIC,
  active_deals    BIGINT,
  growth_pct      NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM hotels)::BIGINT,
    (SELECT COUNT(*) FROM profiles WHERE role = 'partner')::BIGINT,
    (SELECT COUNT(*) FROM profiles WHERE role = 'guest')::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE status != 'cancelled')::BIGINT,
    -- room revenue before taxes (use subtotal when available, fallback to total/1.15)
    (SELECT COALESCE(SUM(COALESCE(subtotal, ROUND(total_price / 1.15, 2))), 0)
       FROM bookings WHERE status != 'cancelled'),
    (SELECT COALESCE(SUM(COALESCE(subtotal, ROUND(total_price / 1.15, 2))), 0)
       FROM bookings
      WHERE status != 'cancelled'
        AND DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*) FROM partner_deals WHERE status = 'active')::BIGINT,
    0.00
$$;

-- get_revenue_trend: monthly revenue on subtotal basis
DROP FUNCTION IF EXISTS get_revenue_trend();
CREATE OR REPLACE FUNCTION get_revenue_trend()
RETURNS TABLE (month TEXT, revenue NUMERIC)
LANGUAGE sql
STABLE
AS $$
  WITH months AS (
    SELECT TO_CHAR(CURRENT_DATE - INTERVAL '1 month' * s, 'YYYY-MM') AS month
    FROM generate_series(0, 5) AS s
  )
  SELECT
    m.month,
    COALESCE(SUM(COALESCE(b.subtotal, ROUND(b.total_price / 1.15, 2))), 0) AS revenue
  FROM months m
  LEFT JOIN bookings b
    ON TO_CHAR(b.created_at, 'YYYY-MM') = m.month
   AND b.status != 'cancelled'
  GROUP BY m.month
  ORDER BY m.month;
$$;

-- ============================================================
-- END OF MIGRATION 047
-- ============================================================
