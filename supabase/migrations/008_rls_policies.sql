-- ============================================================
-- Migration 008: Production-Grade Row Level Security
-- Date: 2026-06-03
--
-- Replaces existing overly-permissive policies with role-aware,
-- multi-tenant RLS for three roles:
--   admin   → full access to everything
--   partner → full access only to their own hotels and related data
--   user    → access only to their own personal data
--
-- Partner↔hotel ownership is tracked via the hotel_partners
-- junction table (NOT an owner_id column on hotels).
-- ============================================================


-- ============================================================
-- SECTION 1: HELPER FUNCTIONS (SECURITY DEFINER)
--
-- These functions query the profiles table directly, bypassing
-- RLS. This is intentional and required — if the policies on
-- profiles called each other they would recurse infinitely.
-- SECURITY DEFINER + explicit search_path is the Supabase-
-- recommended pattern for role-based helpers.
-- ============================================================

-- Returns true if the calling user has the 'admin' role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Returns true if the calling user has the 'partner' or 'admin' role.
CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('partner', 'admin')
  );
$$;

-- Returns the set of hotel IDs the calling user manages as a partner.
-- Admins also return their partner hotels (admins should use is_admin()
-- separately in policies for the full-override case).
CREATE OR REPLACE FUNCTION public.partner_hotel_ids()
RETURNS SETOF BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hotel_id FROM hotel_partners WHERE user_id = auth.uid();
$$;

-- Trigger function: prevents non-admin users from escalating their own role.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'permission denied: only admins can change role assignments';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();


-- ============================================================
-- SECTION 2: DROP ALL EXISTING POLICIES (CLEAN SLATE)
--
-- Every policy listed here was overly-permissive (e.g., allowing
-- any authenticated user to mutate hotels, rooms, rate plans).
-- ============================================================

-- hotels
DROP POLICY IF EXISTS "Hotels are publicly readable"              ON hotels;
DROP POLICY IF EXISTS "Authenticated users can insert hotels"     ON hotels;
DROP POLICY IF EXISTS "Authenticated users can update hotels"     ON hotels;

-- rooms
DROP POLICY IF EXISTS "Rooms are publicly readable"              ON rooms;
DROP POLICY IF EXISTS "Only authenticated users can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Only authenticated users can update rooms" ON rooms;
DROP POLICY IF EXISTS "Only authenticated users can delete rooms" ON rooms;

-- bookings
DROP POLICY IF EXISTS "Authenticated users can create bookings"  ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings"              ON bookings;

-- reviews
DROP POLICY IF EXISTS "Reviews are publicly readable"            ON reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews"   ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews"       ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews"       ON reviews;

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile"         ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile"       ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"       ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"             ON profiles;

-- favorites
DROP POLICY IF EXISTS "Users can view their own favorites"       ON favorites;
DROP POLICY IF EXISTS "Users can add favorites"                  ON favorites;
DROP POLICY IF EXISTS "Users can remove their own favorites"     ON favorites;

-- hotel_images
DROP POLICY IF EXISTS "Hotel images are publicly readable"           ON hotel_images;
DROP POLICY IF EXISTS "Authenticated users can add hotel images"     ON hotel_images;
DROP POLICY IF EXISTS "Authenticated users can update hotel images"  ON hotel_images;
DROP POLICY IF EXISTS "Authenticated users can delete hotel images"  ON hotel_images;

-- room_rate_plans
DROP POLICY IF EXISTS "Rate plans are publicly readable"              ON room_rate_plans;
DROP POLICY IF EXISTS "Only authenticated users can manage rate plans" ON room_rate_plans;

-- deals
DROP POLICY IF EXISTS "Active deals are publicly readable"       ON deals;
DROP POLICY IF EXISTS "Deals are publicly readable"              ON deals;
DROP POLICY IF EXISTS "Authenticated users can create deals"     ON deals;
DROP POLICY IF EXISTS "Authenticated users can update deals"     ON deals;

-- hotel_partners
DROP POLICY IF EXISTS "Partners can view their own records"            ON hotel_partners;
DROP POLICY IF EXISTS "Authenticated users can create partner records" ON hotel_partners;
DROP POLICY IF EXISTS "Authenticated users can update partner records" ON hotel_partners;

-- payments
DROP POLICY IF EXISTS "Users can view their own payments"  ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;

-- notifications
DROP POLICY IF EXISTS "Users can view their own notifications"  ON notifications;
DROP POLICY IF EXISTS "Users can mark notifications read"       ON notifications;


-- ============================================================
-- SECTION 3: ENSURE RLS IS ENABLED ON ALL TABLES
-- (idempotent — safe to run multiple times)
-- ============================================================

ALTER TABLE hotels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_partners  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals           ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 4: PROFILES
-- ============================================================

-- Users read their own row; admins read all rows.
-- is_admin() is SECURITY DEFINER so it queries profiles
-- directly without triggering this policy (no recursion).
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- Users may update only their own profile.
-- The trg_prevent_role_escalation trigger blocks role changes by non-admins.
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Required so the handle_new_user() trigger can insert a profile row
-- and so users can create their own row if the trigger was missed.
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Only admins can delete profiles (account deletion flow).
CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE TO authenticated
  USING (public.is_admin());


-- ============================================================
-- SECTION 5: HOTELS
-- ============================================================

-- Anyone (including anonymous) can read hotels.
CREATE POLICY "hotels_select_public"
  ON hotels FOR SELECT
  USING (true);

-- Only partner/admin roles can create hotels.
-- After creating a hotel, an admin must link it in hotel_partners
-- so the partner can subsequently manage it.
CREATE POLICY "hotels_insert_partner"
  ON hotels FOR INSERT TO authenticated
  WITH CHECK (public.is_partner());

-- Partners update only their own hotels; admins update all.
CREATE POLICY "hotels_update_partner"
  ON hotels FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR id IN (SELECT public.partner_hotel_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR id IN (SELECT public.partner_hotel_ids())
  );

-- Partners delete only their own hotels; admins delete all.
CREATE POLICY "hotels_delete_partner"
  ON hotels FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR id IN (SELECT public.partner_hotel_ids())
  );


-- ============================================================
-- SECTION 6: ROOMS
-- ============================================================

CREATE POLICY "rooms_select_public"
  ON rooms FOR SELECT
  USING (true);

-- Partners can add rooms only to their own hotels.
CREATE POLICY "rooms_insert_partner"
  ON rooms FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

CREATE POLICY "rooms_update_partner"
  ON rooms FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

CREATE POLICY "rooms_delete_partner"
  ON rooms FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );


-- ============================================================
-- SECTION 7: BOOKINGS
-- ============================================================

-- Users see their own bookings; partners see bookings for their hotels; admins see all.
CREATE POLICY "bookings_select"
  ON bookings FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = user_id
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

-- Users can only create bookings for themselves (user_id must equal caller).
CREATE POLICY "bookings_insert_own"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings (e.g., cancel request).
-- Partners can update bookings for their hotels (e.g., confirm/reject).
-- Admins can update all bookings.
CREATE POLICY "bookings_update"
  ON bookings FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = user_id
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR auth.uid() = user_id
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

-- Hard deletions are admin/partner only; users cancel via status update, not DELETE.
CREATE POLICY "bookings_delete_admin_partner"
  ON bookings FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );


-- ============================================================
-- SECTION 8: REVIEWS
-- ============================================================

-- Everyone can read reviews (anonymous included).
CREATE POLICY "reviews_select_public"
  ON reviews FOR SELECT
  USING (true);

-- Users can review only their own completed bookings.
-- booking_id IS NULL allows legacy rows that predate migration 005.
CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      booking_id IS NULL
      OR EXISTS (
        SELECT 1 FROM bookings
        WHERE id = booking_id
          AND user_id = auth.uid()
      )
    )
  );

-- Users can edit only their own reviews; admins can edit all.
CREATE POLICY "reviews_update"
  ON reviews FOR UPDATE TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- Users can delete only their own reviews; admins can delete all.
CREATE POLICY "reviews_delete"
  ON reviews FOR DELETE TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);


-- ============================================================
-- SECTION 9: FAVORITES
-- ============================================================

CREATE POLICY "favorites_select_own"
  ON favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own"
  ON favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE on favorites (add/remove only).

CREATE POLICY "favorites_delete_own"
  ON favorites FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ============================================================
-- SECTION 10: HOTEL_IMAGES
-- ============================================================

CREATE POLICY "hotel_images_select_public"
  ON hotel_images FOR SELECT
  USING (true);

CREATE POLICY "hotel_images_insert_partner"
  ON hotel_images FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

CREATE POLICY "hotel_images_update_partner"
  ON hotel_images FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

CREATE POLICY "hotel_images_delete_partner"
  ON hotel_images FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );


-- ============================================================
-- SECTION 11: ROOM_RATE_PLANS
-- ============================================================

CREATE POLICY "rate_plans_select_public"
  ON room_rate_plans FOR SELECT
  USING (true);

-- Ownership chain: rate_plan → room → hotel → hotel_partners → auth.uid()
CREATE POLICY "rate_plans_insert_partner"
  ON room_rate_plans FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id
        AND r.hotel_id IN (SELECT public.partner_hotel_ids())
    )
  );

CREATE POLICY "rate_plans_update_partner"
  ON room_rate_plans FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id
        AND r.hotel_id IN (SELECT public.partner_hotel_ids())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id
        AND r.hotel_id IN (SELECT public.partner_hotel_ids())
    )
  );

CREATE POLICY "rate_plans_delete_partner"
  ON room_rate_plans FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_id
        AND r.hotel_id IN (SELECT public.partner_hotel_ids())
    )
  );


-- ============================================================
-- SECTION 12: HOTEL_PARTNERS
-- Ownership assignments are admin-only. This prevents partners
-- from granting themselves access to hotels they do not own.
-- ============================================================

-- Partners see their own assignments; admins see all.
CREATE POLICY "hotel_partners_select"
  ON hotel_partners FOR SELECT TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Only admins can create, modify, or revoke partner assignments.
CREATE POLICY "hotel_partners_insert_admin"
  ON hotel_partners FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "hotel_partners_update_admin"
  ON hotel_partners FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "hotel_partners_delete_admin"
  ON hotel_partners FOR DELETE TO authenticated
  USING (public.is_admin());


-- ============================================================
-- SECTION 13: PAYMENTS
-- Financial records: users see their own, partners see payments
-- for their hotels, admins see all. Only admins may mutate.
-- ============================================================

CREATE POLICY "payments_select"
  ON payments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
    OR booking_id IN (
      SELECT b.id FROM bookings b
      WHERE b.hotel_id IN (SELECT public.partner_hotel_ids())
    )
  );

-- Users initiate payments for their own bookings only.
CREATE POLICY "payments_insert_own"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- Mutation of payment records is admin-only (financial integrity).
CREATE POLICY "payments_update_admin"
  ON payments FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "payments_delete_admin"
  ON payments FOR DELETE TO authenticated
  USING (public.is_admin());


-- ============================================================
-- SECTION 14: NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users may mark their own notifications as read (UPDATE).
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only admins/system can push new notifications.
CREATE POLICY "notifications_insert_admin"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Users can dismiss their own notifications; admins can delete any.
CREATE POLICY "notifications_delete"
  ON notifications FOR DELETE TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);


-- ============================================================
-- SECTION 15: DEALS
-- ============================================================

-- All deals are publicly readable (anonymous included).
CREATE POLICY "deals_select_public"
  ON deals FOR SELECT
  USING (true);

-- Partners manage deals only for their own hotels; admins manage all.
CREATE POLICY "deals_insert_partner"
  ON deals FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

CREATE POLICY "deals_update_partner"
  ON deals FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  )
  WITH CHECK (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );

CREATE POLICY "deals_delete_partner"
  ON deals FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR hotel_id IN (SELECT public.partner_hotel_ids())
  );


-- ============================================================
-- END OF MIGRATION 008
-- ============================================================
