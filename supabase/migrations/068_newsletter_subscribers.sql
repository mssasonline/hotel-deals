-- Newsletter subscribers: stores emails from the footer "Notify Me" form.
-- Subscribers receive an email whenever a partner publishes a new active deal.

CREATE TABLE newsletter_subscribers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public can insert their own email (subscribe).
CREATE POLICY "newsletter_subscribe" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Admins (service role) can read/update all rows.
