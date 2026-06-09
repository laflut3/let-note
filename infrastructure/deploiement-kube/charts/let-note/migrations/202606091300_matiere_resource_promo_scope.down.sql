ALTER TABLE matiere_resource
  DROP CONSTRAINT IF EXISTS fk_matiere_resource_mat_promo;

ALTER TABLE matiere_resource
  ALTER COLUMN id_promo DROP NOT NULL;
