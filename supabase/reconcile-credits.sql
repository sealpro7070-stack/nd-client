-- Reconciliation after introducing the credit_grants ledger (migration-grant-plan.sql).
-- The ledger starts EMPTY, so existing paid users have no grant record. Without a
-- backfill, the next "Approve Role" click would add another 150 credits on top of
-- their current balance. This script (1) audits, then (2) backfills, then (3) helps
-- fix obvious outliers. RUN EACH STEP SEPARATELY and review output before proceeding.
--
-- NOTE: credits = (grants) - (submission deductions), and deductions are NOT ledgered,
-- so we cannot auto-recompute "correct" balances. We only freeze current balances and
-- fix clear cases. Everything mutating below is commented out on purpose.

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 1 — AUDIT (read-only, safe). Run this first and eyeball the results.
-- ──────────────────────────────────────────────────────────────────────────
SELECT
  u.id,
  u.email,
  u.plan,
  u.credits,
  u.is_active,
  u.plan_expires_at,
  (u.plan_expires_at IS NOT NULL AND u.plan_expires_at < now()) AS plan_expired,
  COUNT(cg.id) AS ledger_rows,
  COALESCE(SUM(cg.amount), 0) AS ledger_total
FROM users u
LEFT JOIN credit_grants cg ON cg.user_id = u.id
WHERE u.plan IN ('plus', 'family')
GROUP BY u.id, u.email, u.plan, u.credits, u.is_active, u.plan_expires_at
ORDER BY u.credits DESC, u.email;

-- Look for:
--   * ledger_rows = 0 on an active paid user  -> needs the STEP 2 backfill
--   * credits far above 150 (e.g. 300)        -> likely a pre-ledger double-grant; fix in STEP 3
--   * credits = 0 on an active paid user       -> never got credited; decide in STEP 3

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 2 — BACKFILL (mutating). Marks each ACTIVE paid user as "already credited"
-- by inserting ONE ledger row matching their plan period. Does NOT change credits.
-- This prevents a future Approve click from re-adding 150. Uncomment to run.
-- ──────────────────────────────────────────────────────────────────────────
-- INSERT INTO credit_grants (user_id, plan, amount, expires_at)
-- SELECT u.id, u.plan, 150, u.plan_expires_at
-- FROM users u
-- WHERE u.plan IN ('plus', 'family')
--   AND u.is_active = true
--   AND (u.plan_expires_at IS NULL OR u.plan_expires_at > now())
--   AND NOT EXISTS (
--     SELECT 1 FROM credit_grants cg
--     WHERE cg.user_id = u.id
--       AND cg.plan = u.plan
--       AND (cg.expires_at IS NULL OR cg.expires_at > now())
--   );

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 3 — MANUAL OUTLIER FIXES (mutating, per-user). Edit the email + value.
-- Example: correct the client who ended up with 300 credits back to 150.
-- ──────────────────────────────────────────────────────────────────────────
-- UPDATE users SET credits = 150 WHERE email = 'REPLACE_ME@example.com';

-- Example: a paid user who never received credits — grant them 150 the proper way
-- (idempotent; also writes the ledger row, so do NOT also run STEP 2 for them):
-- SELECT * FROM grant_plan('00000000-0000-0000-0000-000000000000'::uuid, 'plus');
