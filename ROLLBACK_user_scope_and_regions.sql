-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: User Scope + User-Region Assignments (v4.13.0 → v4.12.8)
--
-- REVIERTE TODOS los cambios de MIGRATION_user_scope_and_regions.sql en orden
-- inverso. Restaura el schema y las políticas RLS al estado v4.12.8.
--
-- IMPORTANTE:
--   • Antes de correr este rollback, hacer downgrade del frontend a v4.12.8.
--     De lo contrario el panel v4.13.0 fallará al consultar columnas/tablas
--     que ya no existen.
--   • Los datos de app_user_regions se PIERDEN definitivamente.
--   • site_visits.region_id se elimina; el backfill se pierde, pero las
--     submissions mantienen su region_id porque era columna preexistente.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: Restaurar policies originales de site_visits ────────────────────
DROP POLICY IF EXISTS "visits_select" ON site_visits;
CREATE POLICY "visits_select" ON site_visits FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM companies
     WHERE companies.id = get_my_company_id()
       AND site_visits.org_code = companies.org_code
  )
);

-- ── PASO 2: Restaurar policies originales de submissions ────────────────────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (get_my_role() = 'supervisor'
      AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id()))
  OR submitted_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS "submissions_update_supervisor" ON submissions;
CREATE POLICY "submissions_update_supervisor" ON submissions FOR UPDATE USING (
  get_my_role() IN ('admin','supervisor')
  AND (
    get_my_role() = 'admin'
    OR org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
  )
);

-- ── PASO 3: Restaurar policy original de submission_assets ──────────────────
DROP POLICY IF EXISTS "assets_select" ON submission_assets;
CREATE POLICY "assets_select" ON submission_assets FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM submissions s
     WHERE s.id = submission_assets.submission_id
       AND (
         get_my_role() = 'supervisor'
         AND s.org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
         OR s.submitted_by_user_id = auth.uid()
       )
  )
);

-- ── PASO 4: Eliminar policies de app_user_regions ───────────────────────────
DROP POLICY IF EXISTS "aur_admin_all" ON app_user_regions;
DROP POLICY IF EXISTS "aur_self_read" ON app_user_regions;

-- ── PASO 5: Eliminar trigger de bloqueo de company_regions ──────────────────
DROP TRIGGER IF EXISTS trg_company_regions_protect ON company_regions;
DROP FUNCTION IF EXISTS protect_company_region_in_use();

-- ── PASO 6: Eliminar trigger de coherencia user_region ──────────────────────
DROP TRIGGER IF EXISTS trg_app_user_regions_enforce ON app_user_regions;
DROP FUNCTION IF EXISTS enforce_user_region_company();

-- ── PASO 7: Eliminar tabla app_user_regions ─────────────────────────────────
DROP TABLE IF EXISTS app_user_regions;

-- ── PASO 8: Eliminar helpers RLS ────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_my_region_ids();
DROP FUNCTION IF EXISTS get_my_scope();

-- ── PASO 9: Eliminar site_visits.region_id ──────────────────────────────────
DROP INDEX IF EXISTS idx_site_visits_region;
ALTER TABLE site_visits DROP COLUMN IF EXISTS region_id;

-- ── PASO 10: Eliminar trigger de scope en app_users ─────────────────────────
DROP TRIGGER IF EXISTS trg_app_users_enforce_scope ON app_users;
DROP FUNCTION IF EXISTS enforce_user_scope();

-- ── PASO 11: Eliminar columna app_users.scope ───────────────────────────────
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_scope_check;
ALTER TABLE app_users DROP COLUMN IF EXISTS scope;

-- ── PASO 12: NOTIFICAR ──────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- POST-ROLLBACK — verificaciones manuales sugeridas:
--   • Confirmar que el panel v4.12.8 funciona contra esta BD revertida.
--   • Confirmar que las policies de submissions/site_visits comportan como
--     antes de v4.13.0 (supervisor de empresa ve solo su empresa, etc.).
--   • Que el supervisor general (sin company_id) sigue viendo todo.
-- =============================================================================
