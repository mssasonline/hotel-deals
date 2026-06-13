-- Migration 034: Clear price_per_night — now computed at runtime
-- price_per_night is no longer a stored value. The live price is calculated as:
--   MAX(min_price, ROUND(base_price * (1 - tier_discount / 100)))
-- This update ensures no stale static value misleads any query.

UPDATE rooms SET price_per_night = NULL;
