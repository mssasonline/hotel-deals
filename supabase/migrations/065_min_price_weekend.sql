-- Add weekend minimum price floor to rooms
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS min_price_weekend NUMERIC(10,2);
