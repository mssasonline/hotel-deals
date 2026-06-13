-- ============================================================
-- Migration 009: Production-grade SaaS hardening layer
-- Date: 2026-06-03
--
-- Sections:
--   1.  Column additions (hotels.created_by_partner_id,
--                         profiles.onboarding_completed)
--   2.  partner_requests table + RLS
--   3.  audit_logs table + RLS + indexes
--   4.  orphan_hotels diagnostic view
--   5.  Data-consistency cascade verification comments
--   6.  update prevent_role_escalation: allow service-role context
--   7.  auto_link_hotel_partner trigger (CRITICAL)
--   8.  handle_partner_role_change trigger
--   9.  handle_partner_request_approval trigger
--  10.  Generic audit_log trigger + per-table triggers
--  11.  Specialised audit trigger for role changes
--  12.  RLS on new tables
--  13.  Backfill: existing partners set onboarding_completed = true
-- ============================================================


-- ============================================================
-- SECTION 1: STRUCTURAL ADDITIONS
-- ============================================================

-- hotels: optional hint column for admin-on-behalf-of-partner creation.
-- When an admin inserts a hotel and sets this column, the
-- auto_link_hotel_partner trigger will link the hotel to that partner
-- instead of to the admin.
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS created_by_partner_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- profiles: tracks whether a new partner has completed first-time setup.
-- Defaults to false for new users; set to true when a partner creates
-- their first hotel (via trigger) or when an admin explicitly marks them.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- SECTION 2: partner_requests TABLE
-- Stores partner-role upgrade requests pending admin approval.
-- UNIQUE (user_id) enforces one active request per user.
-- To reapply after rejection, update the existing row back to pending.
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_requests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_requests_user_id ON partner_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_requests_status  ON partner_requests(status)
  WHERE status = 'pending';

ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 3: audit_logs TABLE
-- Immutable audit trail — written exclusively by SECURITY DEFINER
-- triggers; direct client writes are blocked except for admins.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,
  table_name VARCHAR(100),
  record_id  TEXT,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata   JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp  ON audit_logs(timestamp DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 4: orphan_hotels DIAGNOSTIC VIEW
-- Hotels that have no hotel_partners row.
-- Admin-only; used for monitoring and remediation.
-- ============================================================

CREATE OR REPLACE VIEW public.orphan_hotels AS
SELECT
  h.id,
  h.name,
  h.city,
  h.created_at,
  h.created_by_partner_id
FROM hotels h
WHERE NOT EXISTS (
  SELECT 1 FROM hotel_partners hp WHERE hp.hotel_id = h.id
);


-- ============================================================
-- SECTION 5: DATA CONSISTENCY — CASCADE CHAIN VERIFICATION
--
-- The following ON DELETE CASCADE relationships already exist in
-- the schema and satisfy the requested cascade requirements:
--
--   hotels → rooms            (migration 001, ON DELETE CASCADE)
--   rooms  → room_rate_plans  (migration 004, ON DELETE CASCADE)
--   hotels → hotel_images     (migration 003, ON DELETE CASCADE)
--   hotels → hotel_partners   (migration 003, ON DELETE CASCADE)
--   hotels → deals            (migration 003, ON DELETE CASCADE)
--   hotels → bookings         (migration 002, ON DELETE CASCADE)
--   bookings → payments       (migration 003, ON DELETE CASCADE)
--
-- No further schema changes are needed for cascade integrity.
-- ============================================================


-- ============================================================
-- SECTION 6: UPDATE prevent_role_escalation
-- Add a NULL-auth guard so service-role operations (e.g., from
-- SECURITY DEFINER trigger context) are not blocked. Authenticated
-- users who are not admins remain blocked from role changes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() is NULL in service-role / trigger contexts; allow through.
  IF auth.uid() IS NOT NULL
    AND NOT public.is_admin()
    AND NEW.role IS DISTINCT FROM OLD.role
  THEN
    RAISE EXCEPTION 'permission denied: only admins can change role assignments';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists from migration 008; re-create to pick up new function body.
DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();


-- ============================================================
-- SECTION 7: auto_link_hotel_partner TRIGGER (CRITICAL)
--
-- Fires AFTER INSERT on hotels.
-- • Partner inserter → auto-links hotel to auth.uid() in hotel_partners
--   and marks onboarding_completed = true on first hotel creation.
-- • Admin inserter with created_by_partner_id set → links hotel to
--   that partner and marks their onboarding_completed = true.
-- • Admin inserter without created_by_partner_id → no auto-link
--   (admin must assign via hotel_partners manually).
--
-- Runs as SECURITY DEFINER to bypass the hotel_partners RLS policy
-- that normally restricts INSERT to admins only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_link_hotel_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_partner_id  UUID;
BEGIN
  -- Resolve caller identity; NULL when invoked via service role.
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role = 'partner' THEN
    v_partner_id := auth.uid();

  ELSIF v_caller_role = 'admin' AND NEW.created_by_partner_id IS NOT NULL THEN
    -- Admin creating on behalf of a specific partner.
    -- Validate that the target user actually has the partner role.
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = NEW.created_by_partner_id AND role = 'partner'
    ) THEN
      RAISE EXCEPTION
        'invalid created_by_partner_id: user % is not a partner',
        NEW.created_by_partner_id;
    END IF;
    v_partner_id := NEW.created_by_partner_id;

  ELSE
    -- Admin without created_by_partner_id, or service-role insert.
    -- No auto-link; admin assigns later.
    RETURN NEW;
  END IF;

  -- Insert the hotel↔partner link (idempotent).
  INSERT INTO hotel_partners (user_id, hotel_id, role)
  VALUES (v_partner_id, NEW.id, 'manager')
  ON CONFLICT (user_id, hotel_id) DO NOTHING;

  -- Mark onboarding complete on first hotel creation.
  UPDATE profiles
  SET onboarding_completed = true
  WHERE id = v_partner_id AND onboarding_completed = false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_hotel_partner ON hotels;
CREATE TRIGGER trg_auto_link_hotel_partner
  AFTER INSERT ON hotels
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_hotel_partner();


-- ============================================================
-- SECTION 8: handle_partner_role_change TRIGGER
--
-- Fires BEFORE UPDATE OF role on profiles.
-- When a user's role transitions to 'partner', reset
-- onboarding_completed = false so they go through the
-- first-hotel-creation onboarding step.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_partner_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'partner' AND OLD.role IS DISTINCT FROM 'partner' THEN
    NEW.onboarding_completed := false;
  END IF;
  RETURN NEW;
END;
$$;

-- Fires alphabetically before trg_prevent_role_escalation, so the
-- onboarding flag is set before the escalation guard runs its check.
DROP TRIGGER IF EXISTS trg_partner_role_change ON profiles;
CREATE TRIGGER trg_partner_role_change
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_partner_role_change();


-- ============================================================
-- SECTION 9: handle_partner_request_approval TRIGGER
--
-- Fires BEFORE UPDATE on partner_requests.
-- On status → 'approved': upgrades the user's profile role to
--   'partner'. The prevent_role_escalation trigger on profiles
--   allows this because auth.uid() at approval time is the admin.
-- On any update: bumps updated_at to NOW().
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_partner_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    -- Promote user to partner role.
    UPDATE profiles SET role = 'partner' WHERE id = NEW.user_id;

  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    -- Rejected applicants stay 'user'; no role change needed.
    -- The audit trigger on partner_requests captures this event.
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_request_approval ON partner_requests;
CREATE TRIGGER trg_partner_request_approval
  BEFORE UPDATE ON partner_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_partner_request_approval();


-- ============================================================
-- SECTION 10: GENERIC AUDIT TRIGGER
--
-- Captures INSERT / UPDATE / DELETE events on key tables.
-- For UPDATEs, metadata stores both old and new row snapshots
-- so the diff can be derived at query time.
-- record_id is extracted as text from the 'id' field of the row
-- (works for both UUID and BIGSERIAL PKs).
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id TEXT;
  v_metadata  JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := to_jsonb(OLD) ->> 'id';
    v_metadata  := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := to_jsonb(NEW) ->> 'id';
    v_metadata  := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_record_id := to_jsonb(NEW) ->> 'id';
    v_metadata  := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_metadata
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- hotels
DROP TRIGGER IF EXISTS trg_audit_hotels ON hotels;
CREATE TRIGGER trg_audit_hotels
  AFTER INSERT OR UPDATE OR DELETE ON hotels
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- rooms
DROP TRIGGER IF EXISTS trg_audit_rooms ON rooms;
CREATE TRIGGER trg_audit_rooms
  AFTER INSERT OR UPDATE OR DELETE ON rooms
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- bookings
DROP TRIGGER IF EXISTS trg_audit_bookings ON bookings;
CREATE TRIGGER trg_audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- payments
DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- hotel_partners — captures partner assignment / revocation
DROP TRIGGER IF EXISTS trg_audit_hotel_partners ON hotel_partners;
CREATE TRIGGER trg_audit_hotel_partners
  AFTER INSERT OR UPDATE OR DELETE ON hotel_partners
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- partner_requests — tracks the approval workflow
DROP TRIGGER IF EXISTS trg_audit_partner_requests ON partner_requests;
CREATE TRIGGER trg_audit_partner_requests
  AFTER INSERT OR UPDATE OR DELETE ON partner_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();


-- ============================================================
-- SECTION 11: ROLE CHANGE AUDIT TRIGGER
--
-- Fires AFTER UPDATE OF role on profiles.
-- Writes a dedicated ROLE_CHANGE audit entry so role changes
-- are clearly identifiable in the audit_logs table without
-- having to diff the general UPDATE metadata.
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_role_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
    VALUES (
      auth.uid(),
      'ROLE_CHANGE',
      'profiles',
      NEW.id::TEXT,
      jsonb_build_object(
        'target_user_id', NEW.id,
        'old_role',       OLD.role,
        'new_role',       NEW.role
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role_change ON profiles;
CREATE TRIGGER trg_audit_role_change
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_change_trigger();


-- ============================================================
-- SECTION 12: RLS POLICIES FOR NEW TABLES
-- ============================================================

-- ── partner_requests ────────────────────────────────────────

-- Users submit their own request.
CREATE POLICY "partner_requests_insert_own"
  ON partner_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users view their own request status; admins view all.
CREATE POLICY "partner_requests_select"
  ON partner_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Only admins may approve or reject.
CREATE POLICY "partner_requests_update_admin"
  ON partner_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No DELETE — partner requests are part of the audit record.
-- (Admins can use the service-role key if purging is ever required.)


-- ── audit_logs ──────────────────────────────────────────────

-- Admins see all audit records.
CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

-- Users can view their own audit records (transparency).
CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Direct inserts from clients are blocked; all writes come from
-- SECURITY DEFINER triggers that bypass RLS.
-- Admins are permitted to insert manually when needed (e.g., LOGIN events
-- posted from a server-side API route using a service-role call that
-- passes the acting admin's UID explicitly).
CREATE POLICY "audit_logs_insert_admin"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Audit records are immutable: no UPDATE or DELETE policies are created.


-- ============================================================
-- SECTION 13: BACKFILL
-- Existing partners have already completed onboarding; mark them
-- so they are not unexpectedly redirected to the onboarding screen
-- after this migration is applied.
-- ============================================================

UPDATE profiles
SET onboarding_completed = true
WHERE role = 'partner' AND onboarding_completed = false;


-- ============================================================
-- END OF MIGRATION 009
-- ============================================================
