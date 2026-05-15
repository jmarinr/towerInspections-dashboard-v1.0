-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: Internal flag (v4.13.1 → v4.13.0)
--
-- IMPORTANTE:
--   • Antes de correr este rollback, revertir el frontend a v4.13.0.
--   • Esta migración solo agrega columnas y modifica RLS. El rollback restaura
--     las policies de v4.13.0 y opcionalmente puede mantener la columna
--     `internal` por si se quisiera reaplicar. Por seguridad, también drop.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: Restaurar regions_read sin internal ──────────────────────────────
DROP POLICY IF EXISTS "regions_read" ON regions;
CREATE POLICY "regions_read" ON regions FOR SELECT USING (
  get_my_role() IN ('admin', 'supervisor', 'inspector', 'viewer')
);

-- ── PASO 2: Restaurar companies_select sin internal ──────────────────────────
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  get_my_role() = 'admin'
  OR id = get_my_company_id()
);

-- ── PASO 3: Restaurar policies de submissions/site_visits/assets v4.13.0 ─────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global'
  )
  OR (
    get_my_role() IN ('supervisor','viewer')
    AND get_my_scope() = 'scoped'
    AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
    AND (
      get_my_region_ids() IS NULL
      OR region_id = ANY(get_my_region_ids())
    )
  )
  OR submitted_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS "submissions_update_supervisor" ON submissions;
CREATE POLICY "submissions_update_supervisor" ON submissions FOR UPDATE USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() = 'supervisor'
    AND (
      get_my_scope() = 'global'
      OR (
        get_my_scope() = 'scoped'
        AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
        AND (
          get_my_region_ids() IS NULL
          OR region_id = ANY(get_my_region_ids())
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "visits_select" ON site_visits;
CREATE POLICY "visits_select" ON site_visits FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global'
  )
  OR (
    get_my_role() IN ('supervisor','viewer')
    AND get_my_scope() = 'scoped'
    AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
    AND (
      get_my_region_ids() IS NULL
      OR region_id = ANY(get_my_region_ids())
    )
  )
);

DROP POLICY IF EXISTS "assets_select" ON submission_assets;
CREATE POLICY "assets_select" ON submission_assets FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM submissions s
     WHERE s.id = submission_assets.submission_id
       AND (
         (get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global')
         OR (
           get_my_role() IN ('supervisor','viewer')
           AND get_my_scope() = 'scoped'
           AND s.org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
           AND (
             get_my_region_ids() IS NULL
             OR s.region_id = ANY(get_my_region_ids())
           )
         )
         OR s.submitted_by_user_id = auth.uid()
       )
  )
);

-- ── PASO 4: Drop columnas internal ──────────────────────────────────────────
DROP INDEX IF EXISTS idx_companies_internal;
DROP INDEX IF EXISTS idx_regions_internal;
ALTER TABLE companies DROP COLUMN IF EXISTS internal;
ALTER TABLE regions   DROP COLUMN IF EXISTS internal;

NOTIFY pgrst, 'reload schema';

COMMIT;
