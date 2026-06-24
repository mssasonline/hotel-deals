-- Allow multiple partner accounts per hotel (one hotel per account, many accounts per hotel)
-- Reverses the UNIQUE(hotel_id) from migration 071 and enforces UNIQUE(user_id) instead.

ALTER TABLE hotel_partners
  DROP CONSTRAINT IF EXISTS hotel_partners_hotel_id_unique;

ALTER TABLE hotel_partners
  ADD CONSTRAINT hotel_partners_user_id_unique UNIQUE (user_id);
