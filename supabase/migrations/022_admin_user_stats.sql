-- ============================================================
-- Migration 022: Admin user stats RPC
-- Date: 2026-06-07
--
-- get_user_stats() — aggregates booking count, total spent, and
-- last booking date per user for the admin /admin/users console.
--
-- SECURITY INVOKER: RLS on bookings already grants admins full
-- read access (via is_admin()), so no DEFINER bypass is needed.
-- Non-admin callers will only see their own rows (harmless but
-- the admin console guards the route via proxy.ts).
-- ============================================================

DROP FUNCTION IF EXISTS public.get_user_stats();

CREATE FUNCTION public.get_user_stats()
RETURNS TABLE (
  user_id       UUID,
  booking_count BIGINT,
  total_spent   NUMERIC,
  last_booking  TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    b.user_id,
    COUNT(b.id)                      AS booking_count,
    COALESCE(SUM(b.total_price), 0)  AS total_spent,
    MAX(b.created_at)                AS last_booking
  FROM public.bookings b
  GROUP BY b.user_id;
$$;
