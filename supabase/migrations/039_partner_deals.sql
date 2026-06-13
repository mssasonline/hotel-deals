-- Special Deals: partner-managed room promotions with fixed prices and date ranges.
-- Separate from the automatic time-based pricing track.
CREATE TABLE partner_deals (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id    INTEGER        NOT NULL REFERENCES hotels(id)     ON DELETE CASCADE,
  room_id     INTEGER        NOT NULL REFERENCES rooms(id)      ON DELETE CASCADE,
  title       TEXT,
  deal_price  NUMERIC(10,2)  NOT NULL,
  start_date  DATE           NOT NULL,
  end_date    DATE           NOT NULL,
  status      TEXT           NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'ended')),
  created_at  TIMESTAMPTZ    DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

ALTER TABLE partner_deals ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own deals
CREATE POLICY "deals_own" ON partner_deals
  FOR ALL USING (partner_id = auth.uid());

-- Public (unauthenticated) can read active deals within their date range
CREATE POLICY "deals_public" ON partner_deals
  FOR SELECT USING (
    status = 'active'
    AND start_date <= CURRENT_DATE
    AND end_date   >= CURRENT_DATE
  );
