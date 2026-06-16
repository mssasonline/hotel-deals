-- ============================================================
-- Migration 053: Currency Tracking on Bookings
-- Date: 2026-06-15
--
-- Implements Option A: DB stores amounts in AED (base currency).
-- Adds two columns to bookings so we know:
--   1. Which currency the guest chose to pay in
--   2. The AED→charged_currency rate locked at booking time
--
-- Example: 1000 AED booking, guest pays in EUR
--   total_price         = 1000   (AED, unchanged)
--   charged_currency    = 'eur'
--   locked_exchange_rate = 0.2507 (= EUR_rate / AED_rate at booking time)
--   → guest was charged: 1000 × 0.2507 = 250.7 EUR
--
-- Fix payments.currency default: was 'USD', now 'AED'.
-- ============================================================

-- 1. bookings: charged currency
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS charged_currency     VARCHAR(10)    NOT NULL DEFAULT 'aed',
  ADD COLUMN IF NOT EXISTS locked_exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000;

COMMENT ON COLUMN bookings.charged_currency
  IS 'ISO currency code the guest paid in (e.g. eur, usd). total_price is always AED.';

COMMENT ON COLUMN bookings.locked_exchange_rate
  IS 'AED → charged_currency rate at booking time. charged_amount = total_price × locked_exchange_rate.';

-- 2. Fix payments table default (was USD, should be AED)
ALTER TABLE payments
  ALTER COLUMN currency SET DEFAULT 'AED';
