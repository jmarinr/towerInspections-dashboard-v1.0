-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Performance fix RLS para usuarios globales (v4.14.1)
-- Proyecto: kmdkiyrjmvxnmfdvsofq.supabase.co
--
-- PROBLEMA:
--   La RLS de v4.13.1 evalúa por cada fila dos subconsultas correlacionadas
--   contra companies.internal y regions.internal. Para usuarios globales
--   (sin filtro previo de org_code) esto provoca statement timeout en queries
--   de site_visits / submissions cuando hay >500 filas.
--
-- SOLUCIÓN:
--   Reemplazar las subconsultas correlacionadas por dos funciones STABLE que
--   devuelven el array de org_codes y region_ids internal. Postgres las evalúa
--   una sola vez por query (no por fila) y los checks se vuelven lookups en
--   array, prácticamente gratis.
--
-- IDEMPOTENTE: puede correrse varias veces sin efectos secundarios.
-- ROLLBACK:    ROLLBACK_perf_rls_internal.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: Funciones helper STABLE ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_internal_org_codes() RETURNS text[]
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(array_agg(org_code), ARRAY[]::text[])
    FROM companies WHERE internal = true
$$;

CREATE OR REPLACE FUNCTION get_internal_region_ids() RETURNS uuid[]
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    FROM regions WHERE internal = true
$$;

-- ── PASO 2: RLS submissions (reescrita con helpers) ──────────────────────────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    -- non-admin: bloquea filas de empresas/regiones internal
    NOT (org_code = ANY(get_internal_org_codes()))
    AND (
      region_id IS NULL
      OR NOT (region_id = ANY(get_internal_region_ids()))
    )
    AND (
      -- supervisor/viewer GLOBAL
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
    AND NOT (org_code = ANY(get_internal_org_codes()))
    AND (
      region_id IS NULL
      OR NOT (region_id = ANY(get_internal_region_ids()))
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

-- ── PASO 3: RLS site_visits ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "visits_select" ON site_visits;
CREATE POLICY "visits_select" ON site_visits FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    NOT (org_code = ANY(get_internal_org_codes()))
    AND (
      region_id IS NULL
      OR NOT (region_id = ANY(get_internal_region_ids()))
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

-- ── PASO 4: RLS submission_assets ────────────────────────────────────────────
DROP POLICY IF EXISTS "assets_select" ON submission_assets;
CREATE POLICY "assets_select" ON submission_assets FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM submissions s
     WHERE s.id = submission_assets.submission_id
       AND NOT (s.org_code = ANY(get_internal_org_codes()))
       AND (
         s.region_id IS NULL
         OR NOT (s.region_id = ANY(get_internal_region_ids()))
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

-- ── PASO 5: RLS companies — usando array de internal org_codes ──────────────
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    internal = false
    AND (
      get_my_scope() = 'global'
      OR id = get_my_company_id()
    )
  )
);

-- ── PASO 6: RLS regions — sin cambios funcionales, solo refresh ─────────────
DROP POLICY IF EXISTS "regions_read" ON regions;
CREATE POLICY "regions_read" ON regions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    internal = false
    AND get_my_role() IN ('admin', 'supervisor', 'inspector', 'viewer')
  )
);

-- ── PASO 7: NOTIFICAR ───────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================
-- 1. Confirmar que las dos funciones existen y devuelven datos:
--    SELECT get_internal_org_codes();    -- esperado: {HK}
--    SELECT get_internal_region_ids();   -- esperado: 3 uuids
--
-- 2. Test rápido de performance (correr como usuario global):
--    EXPLAIN ANALYZE SELECT count(*) FROM site_visits;
--    Esperado: <500ms (antes timeout >8s)
-- =============================================================================
