ALTER TABLE professeur
DROP COLUMN IF EXISTS mot_de_passe;

ALTER TABLE etudiant
DROP COLUMN IF EXISTS mot_de_passe;
