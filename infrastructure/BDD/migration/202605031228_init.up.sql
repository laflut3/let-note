CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS etudiant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  date_naissance DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS professeur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  date_naissance DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annee_debut DATE NOT NULL,
  annee_fin DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semestre INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matiere (
  code_matiere TEXT PRIMARY KEY,
  nom_matiere TEXT NOT NULL,
  annee DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS etu_promo (
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  id_promo UUID NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
  PRIMARY KEY (id_etu, id_promo)
);

CREATE TABLE IF NOT EXISTS mat_promo (
  id_mat TEXT NOT NULL REFERENCES matiere(code_matiere) ON DELETE CASCADE,
  id_promo UUID NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
  PRIMARY KEY (id_mat, id_promo)
);

CREATE TABLE IF NOT EXISTS role_etu (
  id_role UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  PRIMARY KEY (id_role, id_etu)
);

CREATE TABLE IF NOT EXISTS matiere_ue (
  id_matiere TEXT NOT NULL REFERENCES matiere(code_matiere) ON DELETE CASCADE,
  id_ue UUID NOT NULL REFERENCES ue(id) ON DELETE CASCADE,
  coef_ue REAL NOT NULL,
  PRIMARY KEY (id_matiere, id_ue)
);

CREATE TABLE IF NOT EXISTS note (
  id_mat TEXT NOT NULL REFERENCES matiere(code_matiere) ON DELETE CASCADE,
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  note REAL NOT NULL,
  coef REAL NOT NULL,
  PRIMARY KEY (id_mat, id_etu)
);
