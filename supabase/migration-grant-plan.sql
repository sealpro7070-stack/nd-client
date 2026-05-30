-- Migration: Idempotent plan granting + credit grant ledger
-- Fixes:
--   (1) "300 credits" — admin clicking Approve twice double-credited the user
--   (2) "doesn't get credit" — plan + credits were two non-atomic steps
-- Run this in Supabase SQL Editor.

-- 1. Ledger of credit grants, so each plan period is credited at most once.
CREATE TABLE IF NOT EXISTS credit_grants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_grants_user_plan ON credit_grants (user_id, plan);

ALTER TABLE credit_grants ENABLE ROW LEVEL SECURITY;
-- No policies => only service_role (bypasses RLS) can read/write this ledger.

-- 2. Atomic + idempotent plan grant.
--    Sets plan + expiry + is_active, and grants `credit_amount` credits
--    ONCE per active plan period (repeat clicks do not re-credit).
CREATE OR REPLACE FUNCTION grant_plan(
  target_user_id UUID,
  target_plan    TEXT,
  credit_amount  INT DEFAULT 150
)
RETURNS TABLE(plan TEXT, credits INTEGER, is_active BOOLEAN, credited BOOLEAN) AS $$
DECLARE
  v_expires   TIMESTAMPTZ;
  v_active    BOOLEAN;
  v_credited  BOOLEAN := false;
  v_existing  INT;
BEGIN
  -- Determine expiry + activation per plan
  IF target_plan IN ('plus', 'family') THEN
    v_expires := now() + INTERVAL '1 year';
    v_active  := true;
  ELSIF target_plan = 'noob' THEN
    v_expires := NULL;   -- noob never expires
    v_active  := true;
  ELSE  -- 'free' (downgrade): leave is_active unchanged
    v_expires := NULL;
    v_active  := NULL;
  END IF;

  UPDATE users
  SET plan = target_plan,
      plan_expires_at = v_expires,
      is_active = COALESCE(v_active, is_active)
  WHERE id = target_user_id;

  -- Grant credits ONCE per active plan period (idempotent)
  IF target_plan IN ('plus', 'family') AND credit_amount > 0 THEN
    SELECT count(*) INTO v_existing
    FROM credit_grants cg
    WHERE cg.user_id = target_user_id
      AND cg.plan = target_plan
      AND (cg.expires_at IS NULL OR cg.expires_at > now());

    IF v_existing = 0 THEN
      UPDATE users SET credits = GREATEST(0, credits + credit_amount)
      WHERE id = target_user_id;

      INSERT INTO credit_grants (user_id, plan, amount, expires_at)
      VALUES (target_user_id, target_plan, credit_amount, v_expires);

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
