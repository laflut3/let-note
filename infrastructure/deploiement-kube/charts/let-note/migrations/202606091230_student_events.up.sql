CREATE TABLE IF NOT EXISTS student_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_etu UUID NOT NULL REFERENCES etudiant(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  event_month INTEGER NOT NULL,
  event_day INTEGER NOT NULL,
  created_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES etudiant(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_student_event_type CHECK (event_type IN ('croissantage')),
  CONSTRAINT chk_student_event_month CHECK (event_month BETWEEN 1 AND 12),
  CONSTRAINT chk_student_event_day CHECK (event_day BETWEEN 1 AND 31),
  CONSTRAINT ux_student_event_etu_type UNIQUE (id_etu, event_type)
);

CREATE INDEX IF NOT EXISTS ix_student_event_etu ON student_event(id_etu);
CREATE INDEX IF NOT EXISTS ix_student_event_month_day ON student_event(event_month, event_day);
