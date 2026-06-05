ALTER TABLE etudiant
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ;

UPDATE etudiant
SET email_verified = TRUE
WHERE email_verified = FALSE
  AND id IN (
    SELECT re.id_etu
    FROM role_etu re
    JOIN role r ON r.id = re.id_role
    WHERE r.role = 'admin'
  );

CREATE INDEX IF NOT EXISTS ix_etudiant_email_verification_token
ON etudiant (email_verification_token_hash)
WHERE email_verification_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_etudiant_password_reset_token
ON etudiant (password_reset_token_hash)
WHERE password_reset_token_hash IS NOT NULL;
