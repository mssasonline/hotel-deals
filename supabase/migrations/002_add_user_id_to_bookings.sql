-- Create bookings table if it doesn't already exist
CREATE TABLE IF NOT EXISTS bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id     UUID REFERENCES rooms(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name  TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add user_id column if the table already existed without it
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own bookings
CREATE POLICY IF NOT EXISTS "Authenticated users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own bookings
CREATE POLICY IF NOT EXISTS "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast user-based lookups
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_hotel_id_idx ON bookings (hotel_id);
