-- ============================================================
-- Migration 020: Partner account management
-- Date: 2026-06-06
--
-- 1. profiles.status  — active | suspended (default active)
-- 2. profiles.email   — denormalised from auth.users for admin queries
-- 3. handle_new_user  — updated to also write email on signup
-- 4. get_partner_stats() RPC — booking count + revenue per partner
-- ============================================================


-- ── 1. Status column ────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));


-- ── 2. Email column ─────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email for existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');


-- ── 3. Update handle_new_user to also store email ───────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(NULLIF(TRIM(profiles.full_name), ''), EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$;

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 4. RPC: partner stats ────────────────────────────────────
-- SECURITY INVOKER so RLS applies: admin sees all, partner sees own only.
DROP FUNCTION IF EXISTS public.get_partner_stats();

CREATE FUNCTION public.get_partner_stats()
RETURNS TABLE (
  user_id       UUID,
  hotel_count   BIGINT,
  booking_count BIGINT,
  total_revenue NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    hp.user_id,
    COUNT(DISTINCT hp.hotel_id)        AS hotel_count,
    COUNT(DISTINCT b.id)               AS booking_count,
    COALESCE(SUM(b.total_price), 0)    AS total_revenue
  FROM public.hotel_partners hp
  LEFT JOIN public.bookings b ON b.hotel_id = hp.hotel_id
  GROUP BY hp.user_id;
$$;
