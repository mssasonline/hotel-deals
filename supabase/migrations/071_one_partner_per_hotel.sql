-- Enforce one partner account per hotel (one-to-one model)
-- Each hotel branch has its own independent partner account

ALTER TABLE hotel_partners
  ADD CONSTRAINT hotel_partners_hotel_id_unique UNIQUE (hotel_id);
