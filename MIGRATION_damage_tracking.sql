-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Tabla de tracking para Reporte de Daños
-- Ejecutar en Supabase SQL Editor antes del primer deploy del reporte
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS report_damage_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  damage_key      TEXT NOT NULL,
  -- damage_key identifica de forma única un daño dentro de un submission.
  -- Formato: "{form_code}_{submissionId}_{itemIndex}"
  -- Ejemplo:  "preventive-maintenance_abc123_2"
  status          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (status IN ('pendiente', 'cotizado', 'reparado')),
  audit_comment   TEXT,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by      UUID REFERENCES auth.users(id),
  UNIQUE (submission_id, damage_key)
);

-- Índice para lecturas por submission_id
CREATE INDEX IF NOT EXISTS idx_damage_tracking_submission
  ON report_damage_tracking (submission_id);

-- RLS
ALTER TABLE report_damage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tracking"
  ON report_damage_tracking FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tracking"
  ON report_damage_tracking FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tracking"
  ON report_damage_tracking FOR UPDATE
  USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
