-- ============================================================
-- Migration 003.1 — Phase 1 schema additions
-- Safe, additive only. No DROP, no DELETE, no triggers,
-- no functions, no profiles, no auth.users modifications.
-- ============================================================


-- ============================================================
-- 1. Add missing columns to existing tables
-- ============================================================

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(100);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';


-- ============================================================
-- 2. payments
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount         NUMERIC(10, 2) NOT NULL,
  currency       VARCHAR(10)    NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(100),
  provider       VARCHAR(100),
  transaction_id TEXT,
  status         VARCHAR(50)    NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT TO authenticated
  USING (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid())
  );


-- ============================================================
-- 3. reviews
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   BIGINT      NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_hotel_id ON reviews(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id  ON reviews(user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT
  USING (true);

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
-- 4. favorites
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id   BIGINT      NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
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
-- 5. notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read)
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
-- 6. deals
-- ============================================================

CREATE TABLE IF NOT EXISTS deals (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         BIGINT         NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  title            VARCHAR(255)   NOT NULL,
  discount_percent NUMERIC(5, 2)  NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  start_date       DATE           NOT NULL,
  end_date         DATE           NOT NULL,
  active           BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT deals_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_deals_hotel_id ON deals(hotel_id);
CREATE INDEX IF NOT EXISTS idx_deals_active   ON deals(hotel_id, active, end_date)
  WHERE active = TRUE;

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deals are publicly readable"
  ON deals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update deals"
  ON deals FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated');


-- ============================================================
-- 7. hotel_images
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_images (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   BIGINT      NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  image_url  TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_images_hotel_id ON hotel_images(hotel_id, sort_order);

ALTER TABLE hotel_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel images are publicly readable"
  ON hotel_images FOR SELECT
  USING (true);

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
-- 8. hotel_partners
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_partners (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id   BIGINT      NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
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
-- END OF MIGRATION 003.1
-- ============================================================
