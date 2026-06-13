-- ============================================================
-- Migration 016: Add guest contact fields to profiles
-- Date: 2026-06-04
--
-- Adds phone and country columns to the profiles table so that
-- guest details entered on the first booking can be stored and
-- pre-filled on subsequent bookings.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100);
