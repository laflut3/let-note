ALTER TABLE etudiant
  ADD COLUMN IF NOT EXISTS numero_etudiant VARCHAR(8);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_etudiant_numero_8_digits'
      AND conrelid = 'etudiant'::regclass
  ) THEN
    ALTER TABLE etudiant
      ADD CONSTRAINT chk_etudiant_numero_8_digits
      CHECK (numero_etudiant IS NULL OR numero_etudiant ~ '^[0-9]{8}$');
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_etudiant_numero_etudiant
ON etudiant (numero_etudiant)
WHERE numero_etudiant IS NOT NULL;
