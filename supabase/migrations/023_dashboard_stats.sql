-- ============================================================
-- Migration 023: Admin dashboard stats RPCs
-- Date: 2026-06-07
--
-- Three read-only functions for the /admin/dashboard page:
--   get_dashboard_stats() — all KPI counts + revenue totals
--   get_revenue_trend()   — monthly revenue last 6 months (zero-filled)
--   get_top_cities()      — top 5 cities by booking count
--
-- All use SECURITY INVOKER; the service-role client that calls
-- them bypasses RLS anyway, so no DEFINER escalation is needed.
-- ============================================================


-- ── 1. Overall KPIs ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_dashboard_stats();

CREATE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
  total_hotels   BIGINT,
  total_partners BIGINT,
  total_users    BIGINT,
  total_bookings BIGINT,
  total_revenue  NUMERIC,
  revenue_today  NUMERIC,
  active_deals   BIGINT,
  growth_pct     NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH monthly AS (
    SELECT
      COALESCE(SUM(total_price) FILTER (
        WHERE date_trunc('month', created_at) = date_trunc('month', NOW())
      ), 0) AS cur_month,
      COALESCE(SUM(total_price) FILTER (
        WHERE date_trunc('month', created_at) = date_trunc('month', NOW() - INTERVAL '1 month')
      ), 0) AS prev_month
    FROM bookings
    WHERE status != 'cancelled'
  )
  SELECT
    (SELECT COUNT(*) FROM hotels)::BIGINT,
    (SELECT COUNT(*) FROM profiles WHERE role = 'partner')::BIGINT,
    (SELECT COUNT(*) FROM profiles WHERE role = 'user' OR role IS NULL)::BIGINT,
    (SELECT COUNT(*) FROM bookings)::BIGINT,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status != 'cancelled'),
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings
      WHERE status != 'cancelled' AND created_at::date = CURRENT_DATE),
    (SELECT COUNT(*) FROM deals WHERE active = TRUE AND end_date >= CURRENT_DATE)::BIGINT,
    ROUND(
      CASE WHEN m.prev_month > 0
        THEN (m.cur_month - m.prev_month) / m.prev_month * 100
        ELSE 0
      END, 1
    )
  FROM monthly m;
$$;


-- ── 2. Monthly revenue trend (last 6 months, zero-filled) ───
DROP FUNCTION IF EXISTS public.get_revenue_trend();

CREATE FUNCTION public.get_revenue_trend()
RETURNS TABLE (month TEXT, revenue NUMERIC)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    TO_CHAR(months.m, 'Mon') AS month,
    COALESCE(SUM(b.total_price), 0) AS revenue
  FROM generate_series(
    date_trunc('month', NOW()) - INTERVAL '5 months',
    date_trunc('month', NOW()),
    '1 month'::interval
  ) AS months(m)
  LEFT JOIN bookings b
    ON  date_trunc('month', b.created_at) = months.m
    AND b.status != 'cancelled'
  GROUP BY months.m
  ORDER BY months.m;
$$;


-- ── 3. Top 5 cities by booking count ────────────────────────
DROP FUNCTION IF EXISTS public.get_top_cities();

CREATE FUNCTION public.get_top_cities()
RETURNS TABLE (city TEXT, booking_count BIGINT, revenue NUMERIC)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    h.city::TEXT,
    COUNT(b.id)                     AS booking_count,
    COALESCE(SUM(b.total_price), 0) AS revenue
  FROM hotels h
  LEFT JOIN bookings b
    ON  b.hotel_id = h.id
    AND b.status != 'cancelled'
  WHERE h.city IS NOT NULL AND h.city != ''
  GROUP BY h.city
  ORDER BY booking_count DESC
  LIMIT 5;
$$;
