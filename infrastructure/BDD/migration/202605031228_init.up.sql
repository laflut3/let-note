CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS etudiant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_etudiant VARCHAR(8),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  date_naissance DATE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  CONSTRAINT chk_etudiant_numero_8_digits
    CHECK (numero_etudiant IS NULL OR numero_etudiant ~ '^[0-9]{8}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_etudiant_numero_etudiant
ON etudiant (numero_etudiant)
WHERE numero_etudiant IS NOT NULL;

CREATE TABLE IF NOT EXISTS professeur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  date_naissance DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  ical_url TEXT,
  annee_arrivee INTEGER NOT NULL,
  annee_depart INTEGER NOT NULL,
  annee_debut DATE NOT NULL,
  annee_fin DATE NOT NULL,
  referent_prof_id UUID REFERENCES professeur(id) ON DELETE SET NULL,
  CONSTRAINT chk_promotion_year_order CHECK (annee_arrivee <= annee_depart)
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

CREATE TABLE IF NOT EXISTS delegue_promo (
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  id_promo UUID NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_etu, id_promo)
);

CREATE TABLE IF NOT EXISTS prof_promo (
  id_prof UUID NOT NULL REFERENCES professeur(id) ON DELETE CASCADE,
  id_promo UUID NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
  PRIMARY KEY (id_prof, id_promo)
);

CREATE TABLE IF NOT EXISTS referent_matiere_promo (
  id_mat TEXT NOT NULL,
  id_promo UUID NOT NULL,
  id_prof UUID NOT NULL,
  PRIMARY KEY (id_mat, id_promo),
  CONSTRAINT fk_referent_mat_promo
    FOREIGN KEY (id_mat, id_promo)
    REFERENCES mat_promo(id_mat, id_promo)
    ON DELETE CASCADE,
  CONSTRAINT fk_referent_prof_promo
    FOREIGN KEY (id_prof, id_promo)
    REFERENCES prof_promo(id_prof, id_promo)
    ON DELETE CASCADE
);

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
