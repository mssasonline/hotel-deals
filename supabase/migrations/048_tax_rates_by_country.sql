-- ============================================================
-- Migration 048: Country-level Tax Rates
--
-- Replaces the hardcoded 15% with a per-country tax configuration.
-- Admin manages rates via /admin/settings/taxes.
--
-- Structure:
--   tax_rates(country_code, vat_pct, fixed_fee_per_night, currency, notes)
--
-- Booking flow:
--   hotel.country → tax_rates → vat_pct + fixed_fee
--   total = subtotal + ROUND(subtotal * vat_pct/100) + fixed_fee_per_night * nights
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_rates (
  country_code        CHAR(2)        PRIMARY KEY,  -- ISO 3166-1 alpha-2
  country_name        TEXT           NOT NULL,
  vat_pct             NUMERIC(5, 2)  NOT NULL DEFAULT 0,   -- e.g. 5.00 for UAE
  fixed_fee_per_night NUMERIC(10, 2) NOT NULL DEFAULT 0,   -- e.g. Tourism Dirham
  fixed_fee_currency  CHAR(3)        NOT NULL DEFAULT 'AED',
  notes               TEXT,
  updated_at          TIMESTAMPTZ    DEFAULT NOW()
);

-- Seed: common markets for a UAE-based hotel deals platform
INSERT INTO tax_rates (country_code, country_name, vat_pct, fixed_fee_per_night, fixed_fee_currency, notes)
VALUES
  ('AE', 'United Arab Emirates',  5.00,  15.00, 'AED', '5% VAT + AED 15 Tourism Dirham (Dubai avg)'),
  ('SA', 'Saudi Arabia',         15.00,   0.00, 'SAR', '15% VAT'),
  ('EG', 'Egypt',                14.00,   0.00, 'EGP', '14% VAT'),
  ('TR', 'Turkey',                8.00,   0.00, 'TRY', '8% VAT on accommodation'),
  ('GB', 'United Kingdom',       20.00,   0.00, 'GBP', '20% VAT'),
  ('DE', 'Germany',               7.00,   0.00, 'EUR', '7% VAT on accommodation'),
  ('FR', 'France',               10.00,   3.00, 'EUR', '10% VAT + ~€3 taxe de séjour'),
  ('TH', 'Thailand',              7.00,   0.00, 'THB', '7% VAT'),
  ('MA', 'Morocco',              10.00,   0.00, 'MAD', '10% VAT on tourism'),
  ('JO', 'Jordan',               16.00,   0.00, 'JOD', '16% GST'),
  ('BH', 'Bahrain',              10.00,   0.00, 'BHD', '10% VAT'),
  ('KW', 'Kuwait',                0.00,   0.00, 'KWD', 'No VAT currently'),
  ('QA', 'Qatar',                 0.00,   0.00, 'QAR', 'No VAT currently'),
  ('OM', 'Oman',                  5.00,   0.00, 'OMR', '5% VAT')
ON CONFLICT (country_code) DO NOTHING;

-- Add country_code to hotels (ISO 3166-1 alpha-2)
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Back-fill common country names → codes
UPDATE hotels SET country_code = 'AE' WHERE LOWER(country) LIKE '%arab emirates%' AND country_code IS NULL;
UPDATE hotels SET country_code = 'SA' WHERE LOWER(country) LIKE '%saudi%'          AND country_code IS NULL;
UPDATE hotels SET country_code = 'EG' WHERE LOWER(country) LIKE '%egypt%'          AND country_code IS NULL;
UPDATE hotels SET country_code = 'TR' WHERE LOWER(country) LIKE '%turkey%' OR LOWER(country) LIKE '%türkiye%' AND country_code IS NULL;
UPDATE hotels SET country_code = 'GB' WHERE LOWER(country) LIKE '%united kingdom%' AND country_code IS NULL;
UPDATE hotels SET country_code = 'AE' WHERE country_code IS NULL; -- default to UAE

-- Add tax columns to bookings so the applied rate is recorded at booking time
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS tax_country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS tax_vat_pct      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS tax_fixed_fee    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount       NUMERIC(12,2);

-- RLS: anyone can read tax rates (needed at checkout to show breakdown)
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_rates_read_all"
  ON tax_rates FOR SELECT USING (true);

CREATE POLICY "tax_rates_admin_write"
  ON tax_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RPC: get tax rate for a hotel (joins hotel → country → tax_rates)
CREATE OR REPLACE FUNCTION get_hotel_tax_rate(p_hotel_id BIGINT)
RETURNS TABLE (
  country_code        CHAR(2),
  country_name        TEXT,
  vat_pct             NUMERIC,
  fixed_fee_per_night NUMERIC,
  fixed_fee_currency  CHAR(3)
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    tr.country_code,
    tr.country_name,
    tr.vat_pct,
    tr.fixed_fee_per_night,
    tr.fixed_fee_currency
  FROM hotels h
  JOIN tax_rates tr ON tr.country_code = h.country_code
  WHERE h.id = p_hotel_id
  LIMIT 1;
$$;

-- ============================================================
-- END OF MIGRATION 048
-- ============================================================
