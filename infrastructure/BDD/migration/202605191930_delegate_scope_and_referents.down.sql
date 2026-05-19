DROP TABLE IF EXISTS referent_matiere_promo;
DROP TABLE IF EXISTS prof_promo;
DROP TABLE IF EXISTS delegue_promo;

ALTER TABLE promotion
DROP COLUMN IF EXISTS ical_url;
