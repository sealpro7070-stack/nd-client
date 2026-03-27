-- Run this in your Supabase SQL editor
-- Adds encrypted AINS credential columns to the users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_username_encrypted text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_password_encrypted text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_creds_updated_at timestamptz;
