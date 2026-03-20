-- ============================================================
-- PTI Admin Panel — Migration: submission_edits
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS submission_edits (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id  uuid NOT NULL,
  edited_by      text NOT NULL,
  edited_at      timestamptz DEFAULT now(),
  changes        jsonb NOT NULL,
  note           text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_edits_submission_id
  ON submission_edits(submission_id);

CREATE INDEX IF NOT EXISTS idx_submission_edits_edited_by
  ON submission_edits(edited_by);

-- Si tu proyecto usa RLS, descomenta:
-- ALTER TABLE submission_edits ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON submission_edits FOR ALL USING (true);
