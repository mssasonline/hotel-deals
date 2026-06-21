-- ─────────────────────────────────────────────────────────────────────────────
-- 067: Partner payout bank details + monthly payout records
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Bank / payout details filled in by the partner
CREATE TABLE IF NOT EXISTS partner_payout_details (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name       TEXT,
  account_holder  TEXT,
  iban            TEXT,
  swift_bic       TEXT,
  bank_country    TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partner_payout_details_user_id_key UNIQUE (user_id)
);

-- 2. Monthly payout records created/managed by admin
CREATE TABLE IF NOT EXISTS monthly_payouts (
  id              BIGSERIAL PRIMARY KEY,
  partner_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id        BIGINT      REFERENCES hotels(id) ON DELETE SET NULL,
  period_year     SMALLINT    NOT NULL,   -- e.g. 2026
  period_month    SMALLINT    NOT NULL,   -- 1–12
  gross_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission      NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- admin side
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','confirmed')),
  transfer_ref    TEXT,                   -- filled by admin when marking paid
  paid_at         TIMESTAMPTZ,
  paid_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- partner side
  confirmed_at    TIMESTAMPTZ,            -- filled when partner confirms receipt
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monthly_payouts_unique UNIQUE (partner_user_id, hotel_id, period_year, period_month)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_payouts_partner  ON monthly_payouts (partner_user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payouts_hotel    ON monthly_payouts (hotel_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payouts_period   ON monthly_payouts (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_monthly_payouts_status   ON monthly_payouts (status);

-- 4. updated_at trigger helper (reuse pattern from rest of schema)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_partner_payout_details_updated
  BEFORE UPDATE ON partner_payout_details
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_monthly_payouts_updated
  BEFORE UPDATE ON monthly_payouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. RLS
ALTER TABLE partner_payout_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_payouts        ENABLE ROW LEVEL SECURITY;

-- Partner can read/write only their own bank details
CREATE POLICY "partner_payout_details_own"
  ON partner_payout_details
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Partner can read their own payout records
CREATE POLICY "monthly_payouts_partner_read"
  ON monthly_payouts
  FOR SELECT
  USING (auth.uid() = partner_user_id);

-- Partner can update confirmed_at on their own records (confirm receipt)
CREATE POLICY "monthly_payouts_partner_confirm"
  ON monthly_payouts
  FOR UPDATE
  USING  (auth.uid() = partner_user_id)
  WITH CHECK (auth.uid() = partner_user_id);

-- Admin (service role / admin client) bypasses RLS — no extra policy needed.
