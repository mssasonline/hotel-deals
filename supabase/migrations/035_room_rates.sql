-- Migration 035: per-date room rate calendar
-- Partners enter a price for each specific date.
-- Fallback when no row exists: rooms.base_price.
-- Tonight's row is discounted by the current time-tier (computed client-side).

CREATE TABLE IF NOT EXISTS room_rates (
  id           bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id      bigint NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date         date   NOT NULL,
  price        numeric(10,2) NOT NULL CHECK (price >= 0),
  created_at   timestamptz DEFAULT now(),
  UNIQUE (room_id, date)
);

CREATE INDEX IF NOT EXISTS idx_room_rates_room_date ON room_rates (room_id, date);

ALTER TABLE room_rates ENABLE ROW LEVEL SECURITY;

-- Anyone can read rates (needed for booking panel)
CREATE POLICY "room_rates_public_read" ON room_rates
  FOR SELECT USING (true);

-- Partners can manage rates only for rooms that belong to their hotels
CREATE POLICY "room_rates_partner_all" ON room_rates
  FOR ALL
  USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN hotel_partners hp ON hp.hotel_id = r.hotel_id
      WHERE hp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN hotel_partners hp ON hp.hotel_id = r.hotel_id
      WHERE hp.user_id = auth.uid()
    )
  );
