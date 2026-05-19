ALTER TABLE etudiant
ADD COLUMN IF NOT EXISTS numero_etudiant VARCHAR(8);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_etudiant_numero_8_digits'
  ) THEN
    ALTER TABLE etudiant
    ADD CONSTRAINT chk_etudiant_numero_8_digits
    CHECK (numero_etudiant IS NULL OR numero_etudiant ~ '^[0-9]{8}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_etudiant_numero_etudiant
ON etudiant (numero_etudiant)
WHERE numero_etudiant IS NOT NULL;

ALTER TABLE promotion
ADD COLUMN IF NOT EXISTS nom TEXT;

ALTER TABLE promotion
ADD COLUMN IF NOT EXISTS annee_arrivee INTEGER;

ALTER TABLE promotion
ADD COLUMN IF NOT EXISTS annee_depart INTEGER;

ALTER TABLE promotion
ADD COLUMN IF NOT EXISTS referent_prof_id UUID REFERENCES professeur(id) ON DELETE SET NULL;

UPDATE promotion
SET
  nom = COALESCE(NULLIF(nom, ''), CONCAT('Promo ', EXTRACT(YEAR FROM annee_debut)::INT)),
  annee_arrivee = COALESCE(annee_arrivee, EXTRACT(YEAR FROM annee_debut)::INT),
  annee_depart = COALESCE(annee_depart, EXTRACT(YEAR FROM annee_fin)::INT);

ALTER TABLE promotion
ALTER COLUMN nom SET NOT NULL;

ALTER TABLE promotion
ALTER COLUMN annee_arrivee SET NOT NULL;

ALTER TABLE promotion
ALTER COLUMN annee_depart SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_promotion_year_order'
  ) THEN
    ALTER TABLE promotion
    ADD CONSTRAINT chk_promotion_year_order
    CHECK (annee_arrivee <= annee_depart);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS note_resultat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mat TEXT NOT NULL REFERENCES matiere(code_matiere) ON DELETE CASCADE,
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  session INTEGER,
  note REAL NOT NULL,
  coef REAL NOT NULL DEFAULT 1,
  created_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_note_resultat_mat ON note_resultat(id_mat);
CREATE INDEX IF NOT EXISTS ix_note_resultat_etu ON note_resultat(id_etu);
