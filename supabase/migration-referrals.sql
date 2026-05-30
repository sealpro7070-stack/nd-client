-- Migration: Referral / marketer program
-- Marketers get a code; when a referred user makes their FIRST approved paid
-- order, a commission row is recorded (default 10%). Payouts are manual:
-- admin pays the marketer via TNG and marks the commission "paid".
-- Run this in the Supabase SQL Editor.

-- 1. Referral codes (one per marketer)
CREATE TABLE IF NOT EXISTS referral_codes (
  code          TEXT PRIMARY KEY,
  owner_name    TEXT NOT NULL,
  owner_contact TEXT,
  rate          NUMERIC NOT NULL DEFAULT 0.10 CHECK (rate >= 0 AND rate <= 1),
  active        BOOLEAN NOT NULL DEFAULT true,
  -- Secret token a marketer uses to view their own stats page (no login):
  --   nilamdesk.vercel.app/m?token=<view_token>
  view_token    UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent: add view_token if the table already existed without it
ALTER TABLE referral_codes
  ADD COLUMN IF NOT EXISTS view_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_referral_codes_view_token ON referral_codes(view_token);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access referral_codes" ON referral_codes
  FOR ALL USING (auth.role() = 'service_role');

-- 2. Which code (if any) referred each user. Set once at signup.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES referral_codes(code);

-- 3. Commission ledger. UNIQUE(referred_user_id) enforces "first order only":
--    a given user can generate at most one commission.
CREATE TABLE IF NOT EXISTS referral_commissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL REFERENCES referral_codes(code),
  referred_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_request_id UUID REFERENCES payment_requests(id) ON DELETE SET NULL,
  order_amount       NUMERIC NOT NULL,
  commission_amount  NUMERIC NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','paid','void')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at            TIMESTAMPTZ,
  UNIQUE (referred_user_id)
);

ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access referral_commissions" ON referral_commissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_referral_commissions_code   ON referral_commissions(code);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_users_referred_by           ON users(referred_by) WHERE referred_by IS NOT NULL;
