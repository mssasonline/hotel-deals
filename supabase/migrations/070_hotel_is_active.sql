-- Add is_active flag to hotels.
-- When a partner is suspended, all their hotels are hidden from guest-facing pages.
-- Restored automatically when the partner is reactivated.

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON hotels(is_active);
