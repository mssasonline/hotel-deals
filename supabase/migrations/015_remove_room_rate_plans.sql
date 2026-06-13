-- ============================================================
-- Migration 015: Remove room_rate_plans system
-- Date: 2026-06-04
--
-- The platform now operates on a single price model:
--   rooms.base_price   — original rack rate (strikethrough)
--   rooms.price_per_night — discounted selling price
--
-- No rate plan selection exists. All bookings use room pricing
-- directly. This migration removes the rate plan table and the
-- foreign key reference from the bookings table.
-- ============================================================

-- Step 1: Drop foreign key constraint from bookings.rate_plan_id
-- (constraint name may vary; the column drop below is sufficient
--  if the FK was defined inline, but we guard both paths)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'bookings'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.column_name = 'rate_plan_id'
  ) THEN
    ALTER TABLE bookings
      DROP CONSTRAINT IF EXISTS bookings_rate_plan_id_fkey;
  END IF;
END;
$$;

-- Step 2: Drop rate_plan_id column from bookings
ALTER TABLE bookings
  DROP COLUMN IF EXISTS rate_plan_id;

-- Step 3: Drop RLS policies on room_rate_plans before dropping the table
DROP POLICY IF EXISTS "Rate plans are publicly readable"               ON room_rate_plans;
DROP POLICY IF EXISTS "Only authenticated users can manage rate plans"  ON room_rate_plans;
DROP POLICY IF EXISTS "rate_plans_select_public"                        ON room_rate_plans;
DROP POLICY IF EXISTS "rate_plans_insert_partner"                       ON room_rate_plans;
DROP POLICY IF EXISTS "rate_plans_update_partner"                       ON room_rate_plans;
DROP POLICY IF EXISTS "rate_plans_delete_partner"                       ON room_rate_plans;

-- Step 4: Drop the room_rate_plans table
DROP TABLE IF EXISTS room_rate_plans;

-- ============================================================
-- END OF MIGRATION 015
-- ============================================================
