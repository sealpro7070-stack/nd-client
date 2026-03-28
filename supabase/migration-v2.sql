-- Nilam Auto: Migration V2
-- Adds plans, payment requests, and family slots
-- Run in Supabase SQL editor AFTER schema.sql

-- ── Users: plan fields ────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free'
  CHECK (plan IN ('free','plus','family'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_cookie_encrypted text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_email_encrypted text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_user_id_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ains_user_id_hash
  ON users(ains_user_id_hash) WHERE ains_user_id_hash IS NOT NULL;

-- ── Family slots (up to 3 child AINS accounts per family account) ─────────────
CREATE TABLE IF NOT EXISTS family_slots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES users(id) ON DELETE CASCADE,
  slot_name             text NOT NULL,
  ains_cookie_encrypted text,
  ains_email_encrypted  text,
  ains_user_id_hash     text,
  language              text DEFAULT 'Melayu'
    CHECK (language IN ('Melayu','Inggeris','Cina','Tamil')),
  books_per_month       int  DEFAULT 4 CHECK (books_per_month BETWEEN 1 AND 15),
  created_at            timestamptz DEFAULT now(),
  UNIQUE (user_id, slot_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_slots_ains_hash
  ON family_slots(ains_user_id_hash) WHERE ains_user_id_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_slots_user_id ON family_slots(user_id);

-- ── Payment requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  plan        text NOT NULL CHECK (plan IN ('plus','family')),
  amount      numeric NOT NULL,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reference   text,         -- user-supplied TNG reference / note
  created_at  timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status  ON payment_requests(status);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE family_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Family slots: users see only their own
CREATE POLICY IF NOT EXISTS "Users see own slots"
  ON family_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Service role full access family_slots"
  ON family_slots FOR ALL USING (auth.role() = 'service_role');

-- Payment requests: users see only their own
CREATE POLICY IF NOT EXISTS "Users see own payment requests"
  ON payment_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Service role full access payment_requests"
  ON payment_requests FOR ALL USING (auth.role() = 'service_role');

-- ── Books: relax pages constraint if needed ───────────────────────────────────
-- The new seed data uses pages 80-400, no change needed.

-- ── Submissions: allow family slot submissions ────────────────────────────────
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS family_slot_id uuid
  REFERENCES family_slots(id) ON DELETE SET NULL;
