-- ============================================================
-- Migration 024: Reports analytics RPCs
-- Date: 2026-06-07
--
-- get_monthly_trend() — revenue + booking count per month (6 months)
-- get_top_hotels()    — top 5 hotels by revenue
-- ============================================================


-- ── 1. Monthly trend (revenue + bookings, zero-filled) ──────
DROP FUNCTION IF EXISTS public.get_monthly_trend();

CREATE FUNCTION public.get_monthly_trend()
RETURNS TABLE (month TEXT, revenue NUMERIC, booking_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    TO_CHAR(months.m, 'Mon')        AS month,
    COALESCE(SUM(b.total_price), 0) AS revenue,
    COUNT(b.id)                     AS booking_count
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


-- ── 2. Top 5 hotels by revenue ───────────────────────────────
DROP FUNCTION IF EXISTS public.get_top_hotels();

CREATE FUNCTION public.get_top_hotels()
RETURNS TABLE (
  id            BIGINT,
  name          TEXT,
  city          TEXT,
  booking_count BIGINT,
  revenue       NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    h.id,
    h.name::TEXT,
    COALESCE(h.city, '')::TEXT       AS city,
    COUNT(b.id)                      AS booking_count,
    COALESCE(SUM(b.total_price), 0)  AS revenue
  FROM hotels h
  LEFT JOIN bookings b
    ON  b.hotel_id = h.id
    AND b.status != 'cancelled'
  GROUP BY h.id, h.name, h.city
  ORDER BY revenue DESC
  LIMIT 5;
$$;
