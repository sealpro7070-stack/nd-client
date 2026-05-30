-- NilamDesk Security Fixes — Run in Supabase SQL Editor
-- ⚠️  Back up your database before executing.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. SUBMISSIONS RLS — Drop client INSERT; only service_role may insert
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
-- No replacement — the backend service role inserts submissions.
-- SELECT policy remains:
--   CREATE POLICY "Users can view own submissions" ON submissions FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SCHEMA FIXES for credit top-ups
-- ═══════════════════════════════════════════════════════════════════════════════
-- payment_requests.plan must allow NULL for credit_topup rows
ALTER TABLE payment_requests ALTER COLUMN plan DROP NOT NULL;

-- Ensure type column exists (credit_topup vs plan_upgrade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_requests' AND column_name = 'type'
  ) THEN
    ALTER TABLE payment_requests ADD COLUMN type TEXT NOT NULL DEFAULT 'plan_upgrade';
  END IF;
END $$;

-- Ensure credits_amount column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_requests' AND column_name = 'credits_amount'
  ) THEN
    ALTER TABLE payment_requests ADD COLUMN credits_amount INT;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CHECK CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_credits_check;
ALTER TABLE users ADD CONSTRAINT users_credits_check CHECK (credits >= 0);

ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS payment_requests_type_check;
ALTER TABLE payment_requests ADD CONSTRAINT payment_requests_type_check CHECK (type IN ('plan_upgrade', 'credit_topup'));

ALTER TABLE books DROP CONSTRAINT IF EXISTS books_year_check;
ALTER TABLE books ADD CONSTRAINT books_year_check CHECK (year BETWEEN 1800 AND 2100);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'tester', 'plus', 'family', 'noob'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. UNIQUE PARTIAL INDEXES — prevent race-condition duplicates
-- ═══════════════════════════════════════════════════════════════════════════════
-- One pending payment request per user (plan upgrades)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_payment_per_user
  ON payment_requests (user_id)
  WHERE status = 'pending' AND type = 'plan_upgrade';

-- One pending credit top-up per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_credit_topup_per_user
  ON payment_requests (user_id)
  WHERE status = 'pending' AND type = 'credit_topup';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. FAMILY SLOT COUNT TRIGGER — enforce max 3 slots at DB level
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION enforce_max_family_slots()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM family_slots WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 family slots allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_max_family_slots ON family_slots;
CREATE TRIGGER trg_enforce_max_family_slots
  BEFORE INSERT ON family_slots
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_family_slots();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_submissions_family_slot ON submissions(family_slot_id) WHERE family_slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_user_month_year ON submissions(user_id, month, year);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RPC: get_submission_stats — aggregated stats (avoid loading all rows)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_submission_stats(
  p_user_id UUID,
  p_month   INT,
  p_year    INT,
  p_week_start TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_success      BIGINT,
  this_month_success BIGINT,
  this_week_success  BIGINT,
  this_month_pending BIGINT,
  this_month_failed  BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT,
    COUNT(*) FILTER (WHERE month = p_month AND year = p_year AND status = 'success')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'success' AND created_at >= p_week_start)::BIGINT,
    COUNT(*) FILTER (WHERE month = p_month AND year = p_year AND status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE month = p_month AND year = p_year AND status = 'failed')::BIGINT
  FROM submissions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION get_submission_stats(UUID, INT, INT, TIMESTAMP WITH TIME ZONE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_submission_stats(UUID, INT, INT, TIMESTAMP WITH TIME ZONE) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. RPC: grant_plan — atomic idempotent plan grant with credit ledger
--     (Preserves existing 3-arg signature for backend compatibility)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION grant_plan(
  target_user_id UUID,
  target_plan    TEXT,
  credit_amount  INT DEFAULT 150
)
RETURNS TABLE(plan TEXT, credits INTEGER, is_active BOOLEAN, credited BOOLEAN) AS $$
DECLARE
  v_expires        TIMESTAMPTZ;
  v_active         BOOLEAN;
  v_credited       BOOLEAN := false;
  v_existing       INT;
  v_credit_amount  INT;
BEGIN
  IF target_plan NOT IN ('free', 'tester', 'plus', 'family', 'noob') THEN
    RAISE EXCEPTION 'Invalid plan: %', target_plan;
  END IF;

  -- Determine expiry, activation, and credit amount per plan
  IF target_plan IN ('plus', 'family') THEN
    v_expires       := now() + INTERVAL '1 year';
    v_active        := true;
    v_credit_amount := credit_amount;   -- default 150
  ELSIF target_plan = 'tester' THEN
    v_expires       := now() + INTERVAL '1 month';
    v_active        := true;
    v_credit_amount := 10;              -- always 10 for tester, ignore credit_amount param
  ELSIF target_plan = 'noob' THEN
    v_expires       := NULL;            -- never expires
    v_active        := true;
    v_credit_amount := 0;               -- noob bypasses credit checks in the bot
  ELSE  -- 'free' (downgrade): leave is_active unchanged, no credits
    v_expires       := NULL;
    v_active        := NULL;
    v_credit_amount := 0;
  END IF;

  UPDATE users
  SET plan            = target_plan,
      plan_expires_at = v_expires,
      -- Qualify with table name: bare "is_active" is ambiguous against the
      -- function's RETURNS TABLE(... is_active ...) output column.
      is_active       = COALESCE(v_active, users.is_active)
  WHERE id = target_user_id;

  -- Grant credits ONCE per active plan period (idempotent via ledger)
  IF target_plan IN ('plus', 'family', 'tester') AND v_credit_amount > 0 THEN
    SELECT count(*) INTO v_existing
    FROM credit_grants cg
    WHERE cg.user_id = target_user_id
      AND cg.plan    = target_plan
      AND (cg.expires_at IS NULL OR cg.expires_at > now());

    IF v_existing = 0 THEN
      UPDATE users SET credits = GREATEST(0, users.credits + v_credit_amount)
      WHERE id = target_user_id;

      INSERT INTO credit_grants (user_id, plan, amount, expires_at)
      VALUES (target_user_id, target_plan, v_credit_amount, v_expires);

      v_credited := true;
    END IF;
  END IF;

  RETURN QUERY
  SELECT u.plan, u.credits, u.is_active, v_credited
  FROM users u WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION grant_plan(UUID, TEXT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION grant_plan(UUID, TEXT, INT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. RPC: add_credits — atomic credit adjustment (used by bot + admin)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION add_credits(
  target_user_id UUID,
  amount         INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET credits = GREATEST(COALESCE(credits, 0) + amount, 0)
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION add_credits(UUID, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION add_credits(UUID, INT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. Enable RLS on all tables (safety check)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_grants ENABLE ROW LEVEL SECURITY;
