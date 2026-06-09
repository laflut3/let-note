ALTER TABLE promotion
  ADD COLUMN IF NOT EXISTS image_s3_bucket TEXT,
  ADD COLUMN IF NOT EXISTS image_s3_key TEXT,
  ADD COLUMN IF NOT EXISTS image_content_type TEXT;
