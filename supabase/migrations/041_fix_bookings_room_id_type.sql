-- Migration 041: Fix bookings.room_id type mismatch (UUID → BIGINT)
--
-- bookings.room_id was created as UUID (migration 002) while rooms.id
-- is BIGSERIAL (BIGINT). PostgreSQL cannot cast UUID to BIGINT, so every
-- booking insert that passes a real room ID fails with:
--   "invalid input syntax for type uuid"
--
-- Fix: change the column type to BIGINT. Existing UUID values cannot be
-- mapped to room IDs, so they are reset to NULL. All application inserts
-- already send numeric room IDs and will work correctly after this change.

-- Drop the FK constraint (it may not have been enforced due to type mismatch)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_room_id_fkey;

-- Change column type; existing UUID values cannot convert to BIGINT → set NULL
ALTER TABLE bookings
  ALTER COLUMN room_id TYPE BIGINT
  USING (NULL::BIGINT);

-- Re-add FK now that types match
ALTER TABLE bookings
  ADD CONSTRAINT bookings_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
