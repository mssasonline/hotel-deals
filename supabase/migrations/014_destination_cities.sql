-- Create destination_cities table for dynamic city card data
CREATE TABLE destination_cities (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  country     VARCHAR(100) NOT NULL,
  deals_count INTEGER      DEFAULT 0,
  gradient    TEXT,
  emoji       VARCHAR(20),
  sort_order  INTEGER      DEFAULT 0,
  active      BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Seed with existing hardcoded cities
INSERT INTO destination_cities (name, country, deals_count, gradient, emoji, sort_order) VALUES
  ('Dubai',    'UAE',      1240, 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', '🏙️', 1),
  ('Paris',    'France',    980, 'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)', '🗼',  2),
  ('London',   'UK',       1140, 'linear-gradient(135deg, #373b44 0%, #4286f4 100%)', '🎡', 3),
  ('New York', 'USA',      1650, 'linear-gradient(135deg, #141e30 0%, #243b55 100%)', '🗽', 4),
  ('Maldives', 'Maldives',  320, 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', '🌊', 5),
  ('Tokyo',    'Japan',     890, 'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)', '⛩️', 6);

-- Allow public read access (cities are non-sensitive public display data)
ALTER TABLE destination_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "destination_cities_public_read"
  ON destination_cities FOR SELECT
  USING (active = TRUE);
