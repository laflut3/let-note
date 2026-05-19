DROP INDEX IF EXISTS ix_note_resultat_etu;
DROP INDEX IF EXISTS ix_note_resultat_mat;
DROP TABLE IF EXISTS note_resultat;

ALTER TABLE promotion DROP CONSTRAINT IF EXISTS chk_promotion_year_order;
ALTER TABLE promotion DROP COLUMN IF EXISTS referent_prof_id;
ALTER TABLE promotion DROP COLUMN IF EXISTS annee_depart;
ALTER TABLE promotion DROP COLUMN IF EXISTS annee_arrivee;
ALTER TABLE promotion DROP COLUMN IF EXISTS nom;

DROP INDEX IF EXISTS ux_etudiant_numero_etudiant;
ALTER TABLE etudiant DROP CONSTRAINT IF EXISTS chk_etudiant_numero_8_digits;
ALTER TABLE etudiant DROP COLUMN IF EXISTS numero_etudiant;
