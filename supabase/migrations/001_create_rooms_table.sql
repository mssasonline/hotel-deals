-- Migration: Create rooms table
-- Each hotel can have multiple rooms (one-to-many: hotels → rooms)

CREATE TABLE rooms (
  id               BIGSERIAL PRIMARY KEY,
  hotel_id         BIGINT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  price_per_night  NUMERIC(10, 2) NOT NULL,
  capacity         INTEGER NOT NULL,
  image_url        TEXT,
  available        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup of all rooms belonging to a hotel
CREATE INDEX idx_rooms_hotel_id ON rooms(hotel_id);

-- Row Level Security (enable but allow public reads; restrict writes to authenticated users)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms are publicly readable"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can insert rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update rooms"
  ON rooms FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete rooms"
  ON rooms FOR DELETE
  USING (auth.role() = 'authenticated');
