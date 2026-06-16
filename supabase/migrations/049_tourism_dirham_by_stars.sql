-- ============================================================
-- Migration 049: Tourism Dirham by Hotel Stars
--
-- Problem: fixed_fee_per_night was a single value per country (AED 15).
-- UAE Tourism Dirham actually varies by hotel star rating:
--   5★ → AED 20 / night
--   4★ → AED 15 / night
--   3★ → AED 10 / night
--   1-2★ → AED 7 / night
--
-- Fix: Add fixed_fee_by_stars JSONB column to tax_rates.
--      When present, the app uses star-specific value instead of fixed_fee_per_night.
-- ============================================================

ALTER TABLE tax_rates
  ADD COLUMN IF NOT EXISTS fixed_fee_by_stars JSONB;

-- Update UAE with star-based Tourism Dirham rates
UPDATE tax_rates
   SET fixed_fee_by_stars = '{"1": 7, "2": 7, "3": 10, "4": 15, "5": 20}'::JSONB
 WHERE country_code = 'AE';

-- ============================================================
-- END OF MIGRATION 049
-- ============================================================
