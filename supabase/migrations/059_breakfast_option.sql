-- Add optional breakfast price per person at the hotel level.
-- NULL means the hotel does not offer a breakfast add-on.
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS breakfast_price_per_person NUMERIC(10,2) DEFAULT NULL;
