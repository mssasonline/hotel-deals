-- ============================================================
-- Migration 021: Allow service role to update profile roles
--
-- The prevent_role_escalation trigger previously blocked all
-- role changes when auth.uid() is NULL (service role context).
-- This broke admin Server Actions that use the service role key
-- to assign partner roles via upsert.
--
-- Fix: skip the escalation check when there is no authenticated
-- session (auth.uid() IS NULL), which only occurs when the
-- service role key is in use.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role has no auth.uid() — allow it to change roles freely.
  -- Regular authenticated users may only change their own role if they are admin.
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin()
     AND NEW.role IS DISTINCT FROM OLD.role
  THEN
    RAISE EXCEPTION 'permission denied: only admins can change role assignments';
  END IF;
  RETURN NEW;
END;
$$;
