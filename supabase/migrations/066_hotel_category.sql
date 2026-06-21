-- Add category column to hotels table
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Hotel';
