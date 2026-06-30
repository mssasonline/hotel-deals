-- Migration 079: Add bookings_this_month + bookings_prev_month to get_dashboard_stats

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_hotels         BIGINT,
  total_partners       BIGINT,
  total_users          BIGINT,
  total_bookings       BIGINT,
  total_revenue        NUMERIC,
  revenue_today        NUMERIC,
  active_deals         BIGINT,
  growth_pct           NUMERIC,
  bookings_this_month  BIGINT,
  bookings_prev_month  BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH monthly AS (
    SELECT
      COALESCE(SUM(COALESCE(subtotal, ROUND(total_price / 1.15, 2))) FILTER (
        WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
      ), 0) AS cur_month,
      COALESCE(SUM(COALESCE(subtotal, ROUND(total_price / 1.15, 2))) FILTER (
        WHERE date_trunc('month', created_at) = date_trunc('month', NOW() - INTERVAL '1 month')
      ), 0) AS prev_month
    FROM bookings
    WHERE status != 'cancelled'
  )
  SELECT
    (SELECT COUNT(*) FROM hotels)::BIGINT,
    (SELECT COUNT(*) FROM profiles WHERE role = 'partner')::BIGINT,
    (SELECT COUNT(*) FROM profiles WHERE role = 'user')::BIGINT,
    (SELECT COUNT(*) FROM bookings WHERE status != 'cancelled')::BIGINT,
    (SELECT COALESCE(SUM(COALESCE(subtotal, ROUND(total_price / 1.15, 2))), 0)
       FROM bookings WHERE status != 'cancelled'),
    (SELECT COALESCE(SUM(COALESCE(subtotal, ROUND(total_price / 1.15, 2))), 0)
       FROM bookings
      WHERE status != 'cancelled'
        AND DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*) FROM partner_deals WHERE status = 'active')::BIGINT,
    ROUND(
      CASE WHEN m.prev_month > 0
        THEN (m.cur_month - m.prev_month) / m.prev_month * 100
        ELSE 0
      END, 1
    ),
    (SELECT COUNT(*) FROM bookings
      WHERE status != 'cancelled'
        AND date_trunc('month', created_at) = date_trunc('month', NOW()))::BIGINT,
    (SELECT COUNT(*) FROM bookings
      WHERE status != 'cancelled'
        AND date_trunc('month', created_at) = date_trunc('month', NOW() - INTERVAL '1 month'))::BIGINT
  FROM monthly m
$$;
