-- Migration: Add 'starter' yearly plan
-- Starter: 1 year expiry, is_active=true, 40 credits (once per plan period).
-- A cheaper entry tier (RM25/year) that behaves like Pro but with fewer credits.
-- Run this in Supabase SQL Editor AFTER migration-tester-role.sql.

-- 1. Allow 'starter' in the users.plan check constraint.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free','plus','family','noob','tester','starter'));

-- 2. Allow 'starter' in the payment_requests.plan check constraint
--    (original schema only had 'plus','family').
ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS payment_requests_plan_check;
ALTER TABLE payment_requests ADD CONSTRAINT payment_requests_plan_check
  CHECK (plan IN ('plus','family','starter'));

-- 3. Teach grant_plan about 'starter' (1 year, active, 40 credits, once per period).
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
  -- Determine expiry, activation, and credit amount per plan
  IF target_plan IN ('plus', 'family') THEN
    v_expires       := now() + INTERVAL '1 year';
    v_active        := true;
    v_credit_amount := credit_amount;   -- default 150
  ELSIF target_plan = 'starter' THEN
    v_expires       := now() + INTERVAL '1 year';
    v_active        := true;
    v_credit_amount := 40;              -- always 40 for starter, ignore credit_amount param
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
  IF target_plan IN ('plus', 'family', 'tester', 'starter') AND v_credit_amount > 0 THEN
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

-- Permissions unchanged — only service_role can call this
REVOKE EXECUTE ON FUNCTION grant_plan(UUID, TEXT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION grant_plan(UUID, TEXT, INT) TO service_role;
