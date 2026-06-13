-- Migration 033: Add min_price to rooms table
-- min_price = the floor price the hotel will never go below.
-- The time-based pricing engine discounts base_price down toward min_price
-- but stops there. price_per_night is now computed at runtime and no longer
-- stored as a meaningful static value.

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS min_price numeric(10,2);

-- Seed existing rows: default min_price to price_per_night (the old "selling price")
-- so existing data keeps behaving the same way.
UPDATE rooms
SET min_price = price_per_night
WHERE min_price IS NULL AND price_per_night IS NOT NULL AND price_per_night > 0;

-- If price_per_night was also null, fall back to 60% of base_price.
UPDATE rooms
SET min_price = ROUND(base_price * 0.6, 2)
WHERE min_price IS NULL AND base_price IS NOT NULL AND base_price > 0;
