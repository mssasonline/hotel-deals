-- Migration 037: Drop rooms.description
-- The column is never populated via any UI (no form in admin or partner portal)
-- and is redundant with the features[] array which covers room details.

ALTER TABLE rooms DROP COLUMN IF EXISTS description;
