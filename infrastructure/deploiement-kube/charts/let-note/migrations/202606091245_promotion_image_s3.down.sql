ALTER TABLE promotion
  DROP COLUMN IF EXISTS image_content_type,
  DROP COLUMN IF EXISTS image_s3_key,
  DROP COLUMN IF EXISTS image_s3_bucket;
