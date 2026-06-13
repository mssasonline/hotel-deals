-- ============================================================
-- Migration 018: Profiles table — full profile schema
-- Date: 2026-06-04
--
-- Adds all user profile fields directly to profiles so it
-- becomes the single source of truth (like booking.com).
-- Also backfills existing rows from auth.users metadata.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS phone_country_iso  CHAR(2),
  ADD COLUMN IF NOT EXISTS phone_number       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS date_of_birth      DATE,
  ADD COLUMN IF NOT EXISTS nationality        CHAR(2),
  ADD COLUMN IF NOT EXISTS gender             VARCHAR(10),
  ADD COLUMN IF NOT EXISTS addr_country       CHAR(2),
  ADD COLUMN IF NOT EXISTS addr_city          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS addr_district      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS addr_building      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS addr_apartment     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS addr_street        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS addr_postal_code   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS addr_additional    TEXT;

-- Backfill all fields from auth metadata for existing users
UPDATE public.profiles p
SET
  full_name          = COALESCE(NULLIF(TRIM(p.full_name), ''),
                         u.raw_user_meta_data->>'full_name',
                         u.raw_user_meta_data->>'name',
                         split_part(u.email, '@', 1)),
  phone_country_code = COALESCE(p.phone_country_code,
                         u.raw_user_meta_data->>'phone_country_code', '+971'),
  phone_country_iso  = COALESCE(p.phone_country_iso,
                         u.raw_user_meta_data->>'phone_country_iso', 'AE'),
  phone_number       = COALESCE(p.phone_number,
                         u.raw_user_meta_data->>'phone_number'),
  date_of_birth      = CASE
                         WHEN p.date_of_birth IS NULL
                          AND u.raw_user_meta_data->>'date_of_birth' IS NOT NULL
                         THEN (u.raw_user_meta_data->>'date_of_birth')::DATE
                         ELSE p.date_of_birth
                       END,
  nationality        = COALESCE(p.nationality,
                         u.raw_user_meta_data->>'nationality'),
  gender             = COALESCE(p.gender,
                         u.raw_user_meta_data->>'gender'),
  addr_country       = COALESCE(p.addr_country,
                         u.raw_user_meta_data->>'addr_country'),
  addr_city          = COALESCE(p.addr_city,
                         u.raw_user_meta_data->>'addr_city'),
  addr_district      = COALESCE(p.addr_district,
                         u.raw_user_meta_data->>'addr_district'),
  addr_building      = COALESCE(p.addr_building,
                         u.raw_user_meta_data->>'addr_building'),
  addr_apartment     = COALESCE(p.addr_apartment,
                         u.raw_user_meta_data->>'addr_apartment'),
  addr_street        = COALESCE(p.addr_street,
                         u.raw_user_meta_data->>'addr_street'),
  addr_postal_code   = COALESCE(p.addr_postal_code,
                         u.raw_user_meta_data->>'addr_postal_code'),
  addr_additional    = COALESCE(p.addr_additional,
                         u.raw_user_meta_data->>'addr_additional')
FROM auth.users u
WHERE p.id = u.id;

-- Also rebuild profiles.phone (combined) from the new separated fields
UPDATE public.profiles
SET phone = CASE
  WHEN phone_number IS NOT NULL AND phone_number <> ''
  THEN TRIM(COALESCE(phone_country_code, '') || ' ' || phone_number)
  ELSE phone
END
WHERE phone IS NULL OR phone = '';
