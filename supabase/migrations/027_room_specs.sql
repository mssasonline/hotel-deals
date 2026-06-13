-- Migration 027: Add room specification columns
-- Adds area_sqm and bed_type to the rooms table for partner management.

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS area_sqm  NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS bed_type  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS features  TEXT[] DEFAULT '{}';
