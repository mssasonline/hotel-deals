-- ============================================================
-- Migration 064: Hotel contact information & operations
--
-- Adds front desk, WhatsApp, emergency contact, check-in/out
-- times, and parking info to the hotels table.
-- These fields are shown in guest booking confirmation emails.
-- ============================================================

ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS contact_phone    TEXT,
  ADD COLUMN IF NOT EXISTS contact_email    TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone  TEXT,
  ADD COLUMN IF NOT EXISTS checkin_time     TEXT DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS checkout_time    TEXT DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS parking_info     TEXT;

-- ============================================================
-- END OF MIGRATION 064
-- ============================================================
