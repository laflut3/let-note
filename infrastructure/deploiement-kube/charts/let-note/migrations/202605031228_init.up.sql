CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type_metier') THEN
    CREATE TYPE resource_type_metier AS ENUM ('cours', 'td', 'tp', 'exam');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS etudiant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_etudiant VARCHAR(8),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  date_naissance DATE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_token_hash TEXT,
  email_verification_expires_at TIMESTAMPTZ,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  password_reset_token_hash TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  password_reset_requested_at TIMESTAMPTZ,
  CONSTRAINT chk_etudiant_numero_8_digits
    CHECK (numero_etudiant IS NULL OR numero_etudiant ~ '^[0-9]{8}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_etudiant_numero_etudiant
ON etudiant (numero_etudiant)
WHERE numero_etudiant IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_etudiant_email_verification_token
ON etudiant (email_verification_token_hash)
WHERE email_verification_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_etudiant_password_reset_token
ON etudiant (password_reset_token_hash)
WHERE password_reset_token_hash IS NOT NULL;

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
  nom_ue TEXT NOT NULL,
  semestre INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promo_ue (
  id_promo UUID NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
  id_ue UUID NOT NULL REFERENCES ue(id) ON DELETE CASCADE,
  PRIMARY KEY (id_promo, id_ue)
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

CREATE TABLE IF NOT EXISTS devoir (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_promo UUID NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
  id_mat TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  date_rendu TIMESTAMPTZ,
  created_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_devoir_mat_promo
    FOREIGN KEY (id_mat, id_promo)
    REFERENCES mat_promo(id_mat, id_promo)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_devoir_promo ON devoir(id_promo);
CREATE INDEX IF NOT EXISTS ix_devoir_mat ON devoir(id_mat);

CREATE TABLE IF NOT EXISTS role_etu (
  id_role UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  PRIMARY KEY (id_role, id_etu)
);

CREATE TABLE IF NOT EXISTS matiere_ue (
  id_promo UUID NOT NULL,
  id_ue UUID NOT NULL,
  id_matiere TEXT NOT NULL REFERENCES matiere(code_matiere) ON DELETE CASCADE,
  coef_ue REAL NOT NULL,
  PRIMARY KEY (id_promo, id_matiere),
  CONSTRAINT fk_matiere_ue_promo_ue
    FOREIGN KEY (id_promo, id_ue)
    REFERENCES promo_ue(id_promo, id_ue)
    ON DELETE CASCADE,
  CONSTRAINT fk_matiere_ue_mat_promo
    FOREIGN KEY (id_matiere, id_promo)
    REFERENCES mat_promo(id_mat, id_promo)
    ON DELETE CASCADE
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
  id_promo UUID NOT NULL,
  id_mat TEXT NOT NULL REFERENCES matiere(code_matiere) ON DELETE CASCADE,
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  session INTEGER,
  note REAL NOT NULL,
  coef REAL NOT NULL DEFAULT 1,
  created_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_note_resultat_mat_promo
    FOREIGN KEY (id_mat, id_promo)
    REFERENCES mat_promo(id_mat, id_promo)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_note_resultat_mat ON note_resultat(id_mat);
CREATE INDEX IF NOT EXISTS ix_note_resultat_promo ON note_resultat(id_promo);
CREATE INDEX IF NOT EXISTS ix_note_resultat_etu ON note_resultat(id_etu);

CREATE TABLE IF NOT EXISTS matiere_resource (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mat TEXT NOT NULL REFERENCES matiere(code_matiere) ON DELETE CASCADE,
  id_promo UUID REFERENCES promotion(id) ON DELETE CASCADE,
  type_metier resource_type_metier NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  s3_bucket TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  url TEXT,
  content_type TEXT,
  size_bytes BIGINT,
  created_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_matiere_resource_mat ON matiere_resource(id_mat);
CREATE INDEX IF NOT EXISTS ix_matiere_resource_promo ON matiere_resource(id_promo);
CREATE INDEX IF NOT EXISTS ix_matiere_resource_type ON matiere_resource(type_metier);
