ALTER TABLE promotion
ADD COLUMN IF NOT EXISTS ical_url TEXT;

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
