-- Migration 038: Drop rooms.price_per_night
-- Column was cleared by migration 034 and is now always NULL.
-- Live price is computed at runtime: MAX(min_price, ROUND(base_price × (1 - tier%)))

ALTER TABLE rooms DROP COLUMN IF EXISTS price_per_night;
