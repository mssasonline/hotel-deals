-- Migration 058: Mark past-checkout bookings as completed.
-- Any booking where check_out < today and status is not already
-- 'cancelled' or 'completed' is considered finished and should be completed.

UPDATE bookings
SET
  status     = 'completed',
  updated_at = NOW()
WHERE
  check_out < CURRENT_DATE
  AND status NOT IN ('cancelled', 'completed');
