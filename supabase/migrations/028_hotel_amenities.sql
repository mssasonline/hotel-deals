-- Migration 028: Add amenities array to hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
