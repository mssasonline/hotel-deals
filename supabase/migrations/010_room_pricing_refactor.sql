-- ============================================================
-- Migration 010: Room Pricing Refactor
-- SelectedRoom Business Model: same-day unsold rooms at
-- dynamically decreasing prices until midnight.
--
-- Phase 1 (safe): add new columns, backfill, keep old columns.
-- Do NOT drop any existing columns in this migration.
-- ============================================================

-- ── 1. Add pricing columns to rooms ─────────────────────────────────────────

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS base_price     NUMERIC,
  ADD COLUMN IF NOT EXISTS min_price      NUMERIC,
  ADD COLUMN IF NOT EXISTS currency       VARCHAR(10) DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS quantity_total INTEGER,
  ADD COLUMN IF NOT EXISTS quantity_available INTEGER;

-- ── 2. Backfill from existing columns ───────────────────────────────────────

-- base_price = price_per_night (the rack rate partners set)
UPDATE rooms
SET base_price = price_per_night
WHERE base_price IS NULL AND price_per_night IS NOT NULL;

-- min_price = 50% of base price (hotel's floor price)
UPDATE rooms
SET min_price = ROUND(price_per_night * 0.5, 2)
WHERE min_price IS NULL AND price_per_night IS NOT NULL;

-- quantity_total and quantity_available from existing quantity column
UPDATE rooms
SET quantity_total = COALESCE(quantity, 1)
WHERE quantity_total IS NULL;

UPDATE rooms
SET quantity_available = COALESCE(quantity, 1)
WHERE quantity_available IS NULL;

-- ── 3. Add NOT NULL constraints after backfill ───────────────────────────────

ALTER TABLE rooms
  ALTER COLUMN base_price     SET NOT NULL,
  ALTER COLUMN min_price      SET NOT NULL,
  ALTER COLUMN quantity_total SET DEFAULT 1,
  ALTER COLUMN quantity_available SET DEFAULT 1;

-- ── 4. Add check constraints ─────────────────────────────────────────────────

ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_min_price_check,
  ADD CONSTRAINT rooms_min_price_check
    CHECK (min_price > 0 AND min_price <= base_price);

ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_quantity_check,
  ADD CONSTRAINT rooms_quantity_check
    CHECK (quantity_available >= 0 AND quantity_total >= 1);

-- ── 5. Comments on deprecated hotel columns ──────────────────────────────────
-- Hotels are no longer a pricing entity. Pricing lives on rooms.
-- These columns are kept for backward compatibility only.

COMMENT ON COLUMN hotels.original_price IS
  'DEPRECATED: Use rooms.base_price instead. Kept for backward compatibility.';

COMMENT ON COLUMN hotels.current_price IS
  'DEPRECATED: current_price is calculated dynamically from rooms.base_price and rooms.min_price. Never store here.';

-- ── 6. Index for fast cheapest-room lookups per hotel ────────────────────────

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_base_price
  ON rooms (hotel_id, base_price);

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_quantity
  ON rooms (hotel_id, quantity_available)
  WHERE quantity_available > 0;
