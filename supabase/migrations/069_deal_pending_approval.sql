-- Add pending_approval status to partner_deals.
-- Deals start as pending_approval; partner must confirm via email link before going live.

ALTER TABLE partner_deals
  DROP CONSTRAINT partner_deals_status_check;

ALTER TABLE partner_deals
  ADD CONSTRAINT partner_deals_status_check
  CHECK (status IN ('pending_approval', 'active', 'paused', 'ended'));

ALTER TABLE partner_deals
  ALTER COLUMN status SET DEFAULT 'pending_approval';
