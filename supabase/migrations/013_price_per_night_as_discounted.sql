-- Migration 013: Establish price_per_night as the discounted selling price
--
-- NEW BUSINESS RULE:
--   rooms.base_price     = original/strikethrough price (always displayed crossed out)
--   rooms.price_per_night = discounted selling price    (always the active payable price)
--
-- Before this migration, price_per_night = base_price (both were backfilled equal in migration 010).
-- After this migration, price_per_night = ROUND(base_price * 0.70), giving a ~30% same-day discount.
--
-- Only rows where price_per_night >= base_price are touched (safe to re-run).

UPDATE rooms
SET price_per_night = ROUND(CAST(base_price AS NUMERIC) * 0.70)
WHERE price_per_night >= base_price
   OR price_per_night IS NULL
   OR price_per_night = 0;

-- Enforce the invariant going forward
ALTER TABLE rooms
  ADD CONSTRAINT chk_price_per_night_lte_base_price
  CHECK (price_per_night <= base_price);

COMMENT ON COLUMN rooms.price_per_night IS
  'Discounted selling price for SelectedRoom same-day deals. Must be ≤ base_price.';

COMMENT ON COLUMN rooms.base_price IS
  'Original rack rate. Shown as strikethrough price. Must be ≥ price_per_night.';
