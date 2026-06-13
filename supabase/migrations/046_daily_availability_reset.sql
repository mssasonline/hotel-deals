-- 046_daily_availability_reset.sql
-- Every day at 12:00 PM UAE time (08:00 UTC), reset quantity_available = quantity_total
-- so the booking window opens with the hotel's full room allocation.

-- Enable pg_cron (if not already enabled; can also be done from Supabase Dashboard → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: reset available count back to hotel's total allocation
CREATE OR REPLACE FUNCTION public.reset_daily_room_availability()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE rooms
  SET quantity_available = quantity_total
  WHERE quantity_total IS NOT NULL
    AND quantity_total > 0;
$$;

-- Remove existing schedule if re-running this migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-room-availability-daily') THEN
    PERFORM cron.unschedule('reset-room-availability-daily');
  END IF;
END $$;

-- Schedule: 08:00 UTC = 12:00 PM UAE (UTC+4)
-- Adjust the hour if your timezone differs: UTC+3 → 09:00, UTC+2 → 10:00, etc.
SELECT cron.schedule(
  'reset-room-availability-daily',
  '0 8 * * *',
  'SELECT public.reset_daily_room_availability()'
);
