-- Migration: Credits system + payment request types
-- Run this in Supabase SQL Editor

-- 1. Add credits balance to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- 2. Extend payment_requests with type and credits_amount
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'plan_upgrade';
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS credits_amount INTEGER;

-- 3. Atomic credit adjustment function (amount can be negative to deduct)
--    GREATEST(0, ...) prevents credits from going below zero
CREATE OR REPLACE FUNCTION add_credits(target_user_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET credits = GREATEST(0, credits + amount)
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
