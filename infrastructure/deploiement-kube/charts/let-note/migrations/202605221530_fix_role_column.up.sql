CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL UNIQUE
);

ALTER TABLE role
ADD COLUMN IF NOT EXISTS role TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'role'
      AND column_name = 'nom'
  ) THEN
    EXECUTE 'UPDATE role SET role = nom WHERE role IS NULL';
  END IF;
END
$$;

ALTER TABLE role
ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'role_role_key'
  ) THEN
    ALTER TABLE role ADD CONSTRAINT role_role_key UNIQUE (role);
  END IF;
END
$$;
