-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Internal flag para empresas y regiones (v4.13.1)
-- Proyecto: kmdkiyrjmvxnmfdvsofq.supabase.co
--
-- INTRODUCE:
--   • companies.internal (boolean) — empresas que solo los admin ven.
--   • regions.internal (boolean)   — regiones que solo los admin ven.
--   • Seed inicial:
--       - companies.internal = true WHERE org_code = 'HK' (HenkanCX)
--       - regions.internal   = true para las 3 regiones de prueba existentes
--   • RLS actualizada: submissions, site_visits, submission_assets ocultan
--     filas marcadas como internal a TODO rol que no sea admin (incluso scope
--     global de supervisor/viewer).
--   • companies y regions también filtran lecturas no-admin para que las
--     listas y selectores no muestren empresas/regiones internas a no-admins.
--
-- IDEMPOTENTE: puede correrse varias veces sin efectos secundarios.
-- ROLLBACK:    ROLLBACK_internal_flag.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: companies.internal ───────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS internal boolean NOT NULL DEFAULT false;

-- ── PASO 2: regions.internal ─────────────────────────────────────────────────
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS internal boolean NOT NULL DEFAULT false;

-- ── PASO 3: Índices (filtros frecuentes) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_companies_internal ON companies(internal) WHERE internal = true;
CREATE INDEX IF NOT EXISTS idx_regions_internal   ON regions(internal)   WHERE internal = true;

-- ── PASO 4: Seed — marcar HK y regiones de prueba como internal ──────────────
UPDATE companies SET internal = true WHERE org_code = 'HK';

UPDATE regions SET internal = true
 WHERE name IN ('Cocle Prueba', 'prueba sitio 6', 'PRUEBA 7');

-- ── PASO 5: RLS submissions — bloquear internal salvo admin ──────────────────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    -- non-admin: bloquea filas cuyo org_code sea de empresa internal
    -- (vía subquery contra companies)
    NOT EXISTS (
      SELECT 1 FROM companies c
       WHERE c.org_code = submissions.org_code AND c.internal = true
    )
    -- también bloquea por region_id internal
    AND (
      submissions.region_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM regions r
         WHERE r.id = submissions.region_id AND r.internal = true
      )
    )
    AND (
      -- supervisor/viewer GLOBAL (ya filtramos internals arriba)
      (get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global')
      OR (
        -- supervisor/viewer SCOPED a empresa (+ regiones opcionales)
        get_my_role() IN ('supervisor','viewer')
        AND get_my_scope() = 'scoped'
        AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
        AND (
          get_my_region_ids() IS NULL
          OR region_id = ANY(get_my_region_ids())
        )
      )
      OR submitted_by_user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "submissions_update_supervisor" ON submissions;
CREATE POLICY "submissions_update_supervisor" ON submissions FOR UPDATE USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() = 'supervisor'
    -- supervisor (cualquier scope) NO puede editar filas de empresas/regiones internal
    AND NOT EXISTS (
      SELECT 1 FROM companies c
       WHERE c.org_code = submissions.org_code AND c.internal = true
    )
    AND (
      submissions.region_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM regions r
         WHERE r.id = submissions.region_id AND r.internal = true
      )
    )
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

-- ── PASO 6: RLS site_visits ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "visits_select" ON site_visits;
CREATE POLICY "visits_select" ON site_visits FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    NOT EXISTS (
      SELECT 1 FROM companies c
       WHERE c.org_code = site_visits.org_code AND c.internal = true
    )
    AND (
      site_visits.region_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM regions r
         WHERE r.id = site_visits.region_id AND r.internal = true
      )
    )
    AND (
      (get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global')
      OR (
        get_my_role() IN ('supervisor','viewer')
        AND get_my_scope() = 'scoped'
        AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
        AND (
          get_my_region_ids() IS NULL
          OR region_id = ANY(get_my_region_ids())
        )
      )
    )
  )
);

-- ── PASO 7: RLS submission_assets ────────────────────────────────────────────
DROP POLICY IF EXISTS "assets_select" ON submission_assets;
CREATE POLICY "assets_select" ON submission_assets FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM submissions s
     WHERE s.id = submission_assets.submission_id
       AND NOT EXISTS (
         SELECT 1 FROM companies c
          WHERE c.org_code = s.org_code AND c.internal = true
       )
       AND (
         s.region_id IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM regions r
            WHERE r.id = s.region_id AND r.internal = true
         )
       )
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

-- ── PASO 8: RLS companies — non-admin no ve empresas internal ────────────────
-- Necesario para que los selectores y listas no expongan HenkanCX a viewers.
-- La policy "companies_select" original permitía admin OR id=company del usuario;
-- ahora filtramos internal salvo admin.
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    internal = false
    AND (
      -- non-admin global ve todas las companies no-internal
      get_my_scope() = 'global'
      -- o la suya si es scoped
      OR id = get_my_company_id()
    )
  )
);

-- ── PASO 9: RLS regions — non-admin no ve regiones internal ──────────────────
DROP POLICY IF EXISTS "regions_read" ON regions;
CREATE POLICY "regions_read" ON regions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    internal = false
    AND get_my_role() IN ('admin', 'supervisor', 'inspector', 'viewer')
  )
);

-- ── PASO 10: NOTIFICAR ───────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- REPORTE POST-MIGRACIÓN — ejecutar manualmente al final
-- =============================================================================
-- 1. Empresas internal:
--    SELECT id, name, org_code, internal FROM companies WHERE internal = true;
--    (esperado: 1 fila — HenkanCX)
--
-- 2. Regiones internal:
--    SELECT id, name, internal FROM regions WHERE internal = true;
--    (esperado: 3 filas — Cocle Prueba, prueba sitio 6, PRUEBA 7)
--
-- 3. Distribución submissions por empresa internal vs no:
--    SELECT c.internal, count(*) FROM submissions s
--      JOIN companies c ON c.org_code = s.org_code
--     GROUP BY c.internal;
-- =============================================================================
