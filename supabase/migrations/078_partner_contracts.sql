-- ─────────────────────────────────────────────────────────────
-- 078 · Partner Contracts
-- Table to store signed partnership contracts linked to hotels
-- + private Supabase Storage bucket for PDF files
-- ─────────────────────────────────────────────────────────────

-- 1. Table
CREATE TABLE partner_contracts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          BIGINT      NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  contract_number   TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'active', 'expired', 'terminated')),
  file_path         TEXT,
  date_sent         DATE,
  date_accepted     DATE,
  accepted_by_name  TEXT,
  accepted_by_title TEXT,
  acceptance_text   TEXT,
  message_id        TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX partner_contracts_hotel_id_idx ON partner_contracts(hotel_id);

-- 2. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_partner_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_contracts_updated_at
  BEFORE UPDATE ON partner_contracts
  FOR EACH ROW EXECUTE FUNCTION update_partner_contracts_updated_at();

-- 3. RLS — admins only
ALTER TABLE partner_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contracts"
  ON partner_contracts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Storage bucket (private, PDF only, 10 MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS
CREATE POLICY "Admins upload contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins read contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete contracts"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contracts' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
