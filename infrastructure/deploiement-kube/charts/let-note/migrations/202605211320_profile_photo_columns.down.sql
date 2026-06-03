ALTER TABLE etudiant
DROP COLUMN IF EXISTS photo_content_type,
DROP COLUMN IF EXISTS photo_s3_key,
DROP COLUMN IF EXISTS photo_s3_bucket;
