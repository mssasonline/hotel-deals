-- Allow public to read all active deals that haven't expired yet.
-- Upcoming deals (start_date > today) are now visible so users can plan ahead.
-- The /special-deals page separates them into "Active Now" vs "Coming Soon" sections.
DROP POLICY IF EXISTS "deals_public" ON partner_deals;

CREATE POLICY "deals_public" ON partner_deals
  FOR SELECT USING (
    status   = 'active'
    AND end_date >= CURRENT_DATE
  );
