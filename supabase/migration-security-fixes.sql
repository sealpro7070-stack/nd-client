-- NilamDesk Security & Performance Fixes
-- Run this in your Supabase SQL Editor

-- 1. Fix submissions insert policy to validate family_slot_id ownership
DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
CREATE POLICY "Users can insert own submissions" ON submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (family_slot_id IS NULL OR EXISTS (
      SELECT 1 FROM family_slots WHERE id = family_slot_id AND user_id = auth.uid()
    ))
  );

-- 2. Add DB constraints
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_credits_check CHECK (credits >= 0);
ALTER TABLE payment_requests ADD CONSTRAINT IF NOT EXISTS payment_requests_type_check CHECK (type IN ('plan_upgrade', 'credit_topup'));
ALTER TABLE books ADD CONSTRAINT IF NOT EXISTS books_year_check CHECK (year BETWEEN 1800 AND 2100);

-- 3. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_submissions_book_id ON submissions(book_id);

-- 4. Add RPC for aggregated submission stats (avoids loading all rows into memory)
CREATE OR REPLACE FUNCTION get_submission_stats(
  p_user_id UUID,
  p_month INT,
  p_year INT,
  p_week_start TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_success BIGINT,
  this_month_success BIGINT,
  this_week_success BIGINT,
  this_month_pending BIGINT,
  this_month_failed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT AS total_success,
    COUNT(*) FILTER (WHERE month = p_month AND year = p_year AND status = 'success')::BIGINT AS this_month_success,
    COUNT(*) FILTER (WHERE status = 'success' AND created_at >= p_week_start)::BIGINT AS this_week_success,
    COUNT(*) FILTER (WHERE month = p_month AND year = p_year AND status = 'pending')::BIGINT AS this_month_pending,
    COUNT(*) FILTER (WHERE month = p_month AND year = p_year AND status = 'failed')::BIGINT AS this_month_failed
  FROM submissions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service_role should call this; authenticated users go through the backend
REVOKE EXECUTE ON FUNCTION get_submission_stats(UUID, INT, INT, TIMESTAMP WITH TIME ZONE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_submission_stats(UUID, INT, INT, TIMESTAMP WITH TIME ZONE) TO service_role;
