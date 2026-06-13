-- Migration 044: Remove redundant combined columns from profiles
--
-- profiles.phone   was a combined "+966 501234567" string derived from
--                  phone_country_code + phone_number — now removed
-- profiles.country was a full-name string ("Saudi Arabia") derived from
--                  addr_country (ISO-2) — now removed
--
-- Single source of truth:
--   phone  → phone_country_code + phone_country_iso + phone_number
--   country → addr_country (ISO-2)

ALTER TABLE profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE profiles DROP COLUMN IF EXISTS country;
