-- Migration 045: Saved payment cards (mock/tokenised)
-- Stores only masked card metadata — never raw card numbers.

CREATE TABLE IF NOT EXISTS saved_cards (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_holder TEXT        NOT NULL,
  last_four   CHAR(4)     NOT NULL,
  network     VARCHAR(20) NOT NULL DEFAULT 'unknown',
  expiry      VARCHAR(5)  NOT NULL,
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_cards_own"
  ON saved_cards FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
