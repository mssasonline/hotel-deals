-- Migration 060: Add UAE-specific hotel fee columns to tax_rates
-- UAE law requires: 10% service charge + 7% municipality fee + AED 15 tourism dirham + 5% VAT

ALTER TABLE tax_rates
  ADD COLUMN IF NOT EXISTS service_charge_pct   NUMERIC(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS municipality_fee_pct NUMERIC(5,2) DEFAULT 7;

UPDATE tax_rates
SET
  service_charge_pct   = 10,
  municipality_fee_pct = 7
WHERE country_code = 'AE';
