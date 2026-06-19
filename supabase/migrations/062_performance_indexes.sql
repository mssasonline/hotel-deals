-- Migration 062: Performance indexes for hot-path queries
--
-- Three gaps identified:
--
-- 1. get_room_availability() does a full scan of bookings filtered by
--    room_id + status + date overlap on every room card click.
--    The existing idx_bookings_dates_status covers (check_in, check_out)
--    but not room_id, so Postgres must re-filter a large set.
--
-- 2. saved_cards has no index on user_id; every booking page
--    runs SELECT * FROM saved_cards WHERE user_id = <uid>.
--
-- 3. handle_failed_payment trigger counts failed payments per user
--    (COUNT(*) WHERE user_id = X AND payment_status = 'failed') on
--    every failed booking insert/update. Only user_id is indexed.


-- ── 1. Room availability check ───────────────────────────────────────────────
-- Covers: WHERE room_id = X AND status IN ('upcoming','active')
--           AND check_in < $check_out AND check_out > $check_in
CREATE INDEX IF NOT EXISTS idx_bookings_room_availability
  ON bookings (room_id, check_in, check_out)
  WHERE status IN ('upcoming', 'active');


-- ── 2. Saved cards per user ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_saved_cards_user_id
  ON saved_cards (user_id);


-- ── 3. Failed payment count per user (trigger) ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_user_payment_failed
  ON bookings (user_id)
  WHERE payment_status = 'failed';
