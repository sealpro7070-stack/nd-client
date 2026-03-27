-- Restore cookie-based AINS authentication
-- (Go back from username/password to session cookie capture via interactive browser login)

ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_cookie_encrypted text;
ALTER TABLE users DROP COLUMN IF EXISTS ains_username_encrypted;
ALTER TABLE users DROP COLUMN IF EXISTS ains_password_encrypted;
