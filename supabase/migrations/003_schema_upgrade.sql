-- ============================================================
-- Migration 003: Safe additive schema upgrade
-- Date: 2026-06-01
-- Rules: NO DROP TABLE, NO DELETE, NO destructive changes
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ============================================================
-- AUDIT NOTES
-- ============================================================
--
-- EXISTING TABLES (from prior migrations):
--
--   hotels     — no migration file found; assumed created manually.
--                Columns unknown — this migration adds all required
--                columns with ADD COLUMN IF NOT EXISTS after ensuring
--                the table exists.
--
--   rooms      — migration 001. Has: id (BIGSERIAL), hotel_id, name,
--                description, price_per_night, capacity, image_url,
--                available, created_at.
--                MISSING COLUMN: room_type
--
--   bookings   — migration 002. Has: id (UUID), hotel_id, room_id,
--                user_id, guest_name, guest_email, check_in, check_out,
--                total_price, created_at. RLS + indexes present.
--                MISSING COLUMN: status
--
--   !! TYPE MISMATCH (pre-existing, NOT fixed here per safe-migration rules):
--      bookings.room_id is typed UUID but rooms.id is BIGSERIAL (BIGINT).
--      PostgreSQL will not enforce a FK across these types. Fixing requires
--      altering existing column types which risks data loss — out of scope.
--      Recommend a separate, carefully planned migration to reconcile types.
--
-- MISSING TABLES (created below):
--   payments, reviews, profiles, favorites, notifications,
--   deals, hotel_images, hotel_partners
--
-- ============================================================

-- ============================================================
-- STEP 1: hotels — ensure table exists, add any missing columns
-- ============================================================

CREATE TABLE IF NOT EXISTS hotels (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  city        VARCHAR(255),
  country     VARCHAR(255),
  address     TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  image_url   TEXT,
  star_rating INTEGER,
  phone       VARCHAR(50),
  email       VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe column additions (no-ops if column already exists)
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS city        VARCHAR(255);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS country     VARCHAR(255);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS address     TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS latitude    DOUBLE PRECISION;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS longitude   DOUBLE PRECISION;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS image_url   TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS star_rating INTEGER;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS phone       VARCHAR(50);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS email       VARCHAR(255);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

-- Policies: wrapped in DO blocks so re-running this migration is safe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'hotels' AND policyname = 'Hotels are publicly readable'
  ) THEN
    CREATE POLICY "Hotels are publicly readable"
      ON hotels FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'hotels' AND policyname = 'Authenticated users can insert hotels'
  ) THEN
    CREATE POLICY "Authenticated users can insert hotels"
      ON hotels FOR INSERT TO authenticated
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'hotels' AND policyname = 'Authenticated users can update hotels'
  ) THEN
    CREATE POLICY "Authenticated users can update hotels"
      ON hotels FOR UPDATE TO authenticated
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- STEP 2: rooms — add missing column
-- ============================================================

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(100);

-- ============================================================
-- STEP 3: bookings — add missing column
-- ============================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';

-- ============================================================
-- STEP 4: payments
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount         NUMERIC(10, 2) NOT NULL,
  currency       VARCHAR(10) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(100),
  provider       VARCHAR(100),
  transaction_id TEXT,
  status         VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 5: reviews
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   BIGINT  NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_hotel_id ON reviews(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id  ON reviews(user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 6: profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  avatar_url TEXT,
  role       VARCHAR(50) NOT NULL DEFAULT 'user',
  phone      VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Trigger: auto-create a profile row whenever a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 7: favorites
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
  id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id   BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, hotel_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id  ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_hotel_id ON favorites(hotel_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON favorites FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 8: notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications read"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STEP 9: deals
-- ============================================================

CREATE TABLE IF NOT EXISTS deals (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         BIGINT  NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  discount_percent NUMERIC(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  start_date       DATE    NOT NULL,
  end_date         DATE    NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deals_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_deals_hotel_id ON deals(hotel_id);
CREATE INDEX IF NOT EXISTS idx_deals_active   ON deals(hotel_id, active, end_date)
  WHERE active = TRUE;

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active deals are publicly readable"
  ON deals FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update deals"
  ON deals FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================
-- STEP 10: hotel_images
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_images (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   BIGINT  NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  image_url  TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_images_hotel_id ON hotel_images(hotel_id, sort_order);

ALTER TABLE hotel_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel images are publicly readable"
  ON hotel_images FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add hotel images"
  ON hotel_images FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update hotel images"
  ON hotel_images FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete hotel images"
  ON hotel_images FOR DELETE TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================
-- STEP 11: hotel_partners
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_partners (
  id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id   BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  role       VARCHAR(100) NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, hotel_id)
);

CREATE INDEX IF NOT EXISTS idx_hotel_partners_user_id  ON hotel_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_partners_hotel_id ON hotel_partners(hotel_id);

ALTER TABLE hotel_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own records"
  ON hotel_partners FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create partner records"
  ON hotel_partners FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update partner records"
  ON hotel_partners FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================
-- END OF MIGRATION
-- ============================================================
