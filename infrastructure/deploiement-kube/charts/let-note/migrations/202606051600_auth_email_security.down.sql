DROP INDEX IF EXISTS ix_etudiant_password_reset_token;
DROP INDEX IF EXISTS ix_etudiant_email_verification_token;

ALTER TABLE etudiant
  DROP COLUMN IF EXISTS password_reset_requested_at,
  DROP COLUMN IF EXISTS password_reset_expires_at,
  DROP COLUMN IF EXISTS password_reset_token_hash,
  DROP COLUMN IF EXISTS locked_until,
  DROP COLUMN IF EXISTS failed_login_attempts,
  DROP COLUMN IF EXISTS email_verification_expires_at,
  DROP COLUMN IF EXISTS email_verification_token_hash,
  DROP COLUMN IF EXISTS email_verified;
