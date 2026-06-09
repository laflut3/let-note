ALTER TABLE etudiant
  DROP CONSTRAINT IF EXISTS chk_etudiant_numero_8_digits;

DROP INDEX IF EXISTS ux_etudiant_numero_etudiant;

ALTER TABLE etudiant
  DROP COLUMN IF EXISTS numero_etudiant;
