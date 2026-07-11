-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Estado 'deleted' en site_visits y submissions
-- v4.16.0 — Soft delete total: excluido de toda pantalla, reporte y estadística.
-- Solo visible en system_logs (bitácora de auditoría).
--
-- ORDEN DE EJECUCIÓN: ejecutar completo antes de cualquier deploy de código.
-- REVERSIBLE: ver sección ROLLBACK al final.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Extender CHECK constraint de site_visits para incluir 'deleted' ────────
ALTER TABLE site_visits DROP CONSTRAINT IF EXISTS site_visits_status_check;
ALTER TABLE site_visits
  ADD CONSTRAINT site_visits_status_check
  CHECK (status IN ('open', 'closed', 'cancelled', 'deleted'));

-- ── 2. Columnas de auditoría en site_visits ───────────────────────────────────
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

-- ── 3. Columnas de auditoría en submissions ───────────────────────────────────
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 4. Índices para queries eficientes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_site_visits_deleted
  ON site_visits (status)
  WHERE status = 'deleted';

CREATE INDEX IF NOT EXISTS idx_submissions_deleted
  ON submissions (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── 5. Trigger: cascada automática visita → submissions ───────────────────────
-- Cuando site_visit.status cambia a 'deleted', marca todas sus submissions
-- como deleted en la misma transacción. Garantiza consistencia aunque el
-- frontend falle a mitad del proceso.
CREATE OR REPLACE FUNCTION cascade_visit_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'deleted' AND (OLD.status IS NULL OR OLD.status <> 'deleted') THEN
    UPDATE submissions
    SET
      deleted_at = NOW(),
      deleted_by = NEW.deleted_by
    WHERE site_visit_id = NEW.id
      AND deleted_at IS NULL;  -- no re-marcar las ya eliminadas
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_visit_deleted ON site_visits;
CREATE TRIGGER trg_cascade_visit_deleted
  AFTER UPDATE OF status ON site_visits
  FOR EACH ROW
  EXECUTE FUNCTION cascade_visit_deleted();

-- ── 6. RLS: excluir deleted a nivel servidor (protege todas las apps) ─────────
-- site_visits: actualizar las policies de SELECT existentes.
-- Las policies de UPDATE no necesitan cambio (solo los 2 emails autorizados
-- pueden hacer el update a 'deleted', controlado en el frontend y en la RLS).

-- Policy de SELECT: excluir visitas deleted para todos los roles
DROP POLICY IF EXISTS "visits_select_no_deleted" ON site_visits;
CREATE POLICY "visits_select_no_deleted" ON site_visits
  FOR SELECT
  USING (status <> 'deleted' OR status IS NULL);

-- submissions: excluir submissions con deleted_at para todos los roles
DROP POLICY IF EXISTS "submissions_select_no_deleted" ON submissions;
CREATE POLICY "submissions_select_no_deleted" ON submissions
  FOR SELECT
  USING (deleted_at IS NULL);

-- ── 7. Refrescar schema de PostgREST ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN POST-MIGRACIÓN
-- ══════════════════════════════════════════════════════════════════════════════
-- Ejecutar después para confirmar que todo quedó bien:

-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'site_visits_status_check';
-- → Debe mostrar: status IN ('open', 'closed', 'cancelled', 'deleted')

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('site_visits', 'submissions')
--   AND column_name IN ('deleted_at', 'deleted_by', 'delete_reason')
-- ORDER BY table_name, column_name;
-- → Debe mostrar 5 filas (3 en site_visits, 2 en submissions)

-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name = 'trg_cascade_visit_deleted';
-- → Debe mostrar 1 fila

-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename IN ('site_visits', 'submissions')
--   AND policyname LIKE '%deleted%';
-- → Debe mostrar 2 filas

-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (ejecutar SOLO si hay que revertir)
-- ══════════════════════════════════════════════════════════════════════════════
-- DROP TRIGGER IF EXISTS trg_cascade_visit_deleted ON site_visits;
-- DROP FUNCTION IF EXISTS cascade_visit_deleted();
-- DROP POLICY IF EXISTS "visits_select_no_deleted" ON site_visits;
-- DROP POLICY IF EXISTS "submissions_select_no_deleted" ON submissions;
-- ALTER TABLE submissions DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE submissions DROP COLUMN IF EXISTS deleted_by;
-- ALTER TABLE site_visits DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE site_visits DROP COLUMN IF EXISTS deleted_by;
-- ALTER TABLE site_visits DROP COLUMN IF EXISTS delete_reason;
-- ALTER TABLE site_visits DROP CONSTRAINT IF EXISTS site_visits_status_check;
-- ALTER TABLE site_visits ADD CONSTRAINT site_visits_status_check
--   CHECK (status IN ('open', 'closed', 'cancelled'));
-- NOTIFY pgrst, 'reload schema';
