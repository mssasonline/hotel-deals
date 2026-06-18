-- Store breakfast selection at booking time so the success page can display it.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS breakfast_included          BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS breakfast_price_per_person  NUMERIC(10,2) DEFAULT NULL;
