-- Create room_rate_plans table
CREATE TABLE IF NOT EXISTS room_rate_plans (
  id                   BIGSERIAL PRIMARY KEY,
  room_id              BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title                VARCHAR(255) NOT NULL,
  price                NUMERIC(10, 2) NOT NULL,
  cancellation_policy  TEXT NOT NULL DEFAULT 'Non-refundable',
  breakfast_included   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_plans_room_id ON room_rate_plans(room_id);

ALTER TABLE room_rate_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rate plans are publicly readable"
  ON room_rate_plans FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can manage rate plans"
  ON room_rate_plans FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add rate_plan_id to bookings (FK to room_rate_plans)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS rate_plan_id BIGINT REFERENCES room_rate_plans(id) ON DELETE SET NULL;

-- Add status column if not already present
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'upcoming';

-- Add payment_status column
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS idx_bookings_rate_plan_id ON bookings(rate_plan_id);
