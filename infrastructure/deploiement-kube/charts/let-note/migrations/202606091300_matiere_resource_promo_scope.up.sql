DELETE FROM matiere_resource
WHERE id_promo IS NULL
  OR NOT EXISTS (
    SELECT 1
    FROM mat_promo mp
    WHERE mp.id_mat = matiere_resource.id_mat
      AND mp.id_promo = matiere_resource.id_promo
  );

ALTER TABLE matiere_resource
  ALTER COLUMN id_promo SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_matiere_resource_mat_promo'
  ) THEN
    ALTER TABLE matiere_resource
      ADD CONSTRAINT fk_matiere_resource_mat_promo
      FOREIGN KEY (id_mat, id_promo)
      REFERENCES mat_promo(id_mat, id_promo)
      ON DELETE CASCADE;
  END IF;
END $$;
