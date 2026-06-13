-- ============================================================
-- Migration 017: Sync profiles table from auth.users metadata
-- Date: 2026-06-04
--
-- 1. Backfill existing rows: copy full_name from auth metadata
--    to profiles for any user where profiles.full_name is NULL.
-- 2. Add a trigger so future auth.updateUser() calls that change
--    full_name automatically keep profiles.full_name in sync.
-- ============================================================

-- STEP 1: Backfill existing profiles that have NULL full_name
UPDATE public.profiles p
SET full_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  split_part(u.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR p.full_name = '');


-- STEP 2: Trigger that keeps profiles.full_name in sync whenever
-- auth.users.raw_user_meta_data changes (e.g. via auth.updateUser).
CREATE OR REPLACE FUNCTION public.sync_profile_on_auth_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when full_name actually changed in metadata
  IF (NEW.raw_user_meta_data->>'full_name') IS DISTINCT FROM
     (OLD.raw_user_meta_data->>'full_name') THEN

    UPDATE public.profiles
    SET full_name = NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '')
    WHERE id = NEW.id;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_on_auth_update ON auth.users;
CREATE TRIGGER trg_sync_profile_on_auth_update
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_on_auth_update();
