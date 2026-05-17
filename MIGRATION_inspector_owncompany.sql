-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Inspector de su propia empresa (v4.14.4)
-- Proyecto: kmdkiyrjmvxnmfdvsofq.supabase.co
--
-- PROBLEMA:
--   Cuando una empresa tiene flag `internal = true`, las policies SELECT de
--   v4.14.1 bloquean a TODO no-admin, incluyendo a los inspectores que trabajan
--   PARA esa misma empresa. Resultado: el INSERT de site_visits/submissions
--   funciona pero el RETURNING * filtra la fila recién creada y PostgREST
--   responde 403 Forbidden.
--
--   El flag `internal` debería ocultar la empresa a OTROS (viewers/supervisors
--   externos), no a su propio equipo operativo.
--
-- SOLUCIÓN:
--   Agregar una rama explícita en las policies SELECT de site_visits,
--   submissions y submission_assets que permita al inspector ver los datos
--   de SU propia empresa, aunque sea internal. Si tiene regiones asignadas,
--   se respeta el filtro de regiones.
--
-- IDEMPOTENTE: puede correrse varias veces sin efectos secundarios.
-- ROLLBACK:    ROLLBACK_inspector_owncompany.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: visits_select con excepción para inspector de la propia empresa ──
DROP POLICY IF EXISTS "visits_select" ON site_visits;
CREATE POLICY "visits_select" ON site_visits FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    -- Inspector ve datos de SU empresa, aunque sea internal
    get_my_role() = 'inspector'
    AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
    AND (
      get_my_region_ids() IS NULL
      OR region_id = ANY(get_my_region_ids())
    )
  )
  OR (
    -- Supervisor/Viewer respetan filtro internal (rama existente, sin cambios)
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

-- ── PASO 2: submissions_select con misma excepción ───────────────────────────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    -- Inspector ve datos de SU empresa, aunque sea internal
    get_my_role() = 'inspector'
    AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
    AND (
      get_my_region_ids() IS NULL
      OR region_id = ANY(get_my_region_ids())
    )
  )
  OR (
    -- Supervisor/Viewer respetan filtro internal
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
      -- Cualquier usuario puede ver lo que él mismo creó
      OR submitted_by_user_id = auth.uid()
    )
  )
);

-- ── PASO 3: assets_select con misma excepción ────────────────────────────────
DROP POLICY IF EXISTS "assets_select" ON submission_assets;
CREATE POLICY "assets_select" ON submission_assets FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM submissions s
     WHERE s.id = submission_assets.submission_id
       AND (
         -- Inspector ve assets de submissions de SU empresa
         (
           get_my_role() = 'inspector'
           AND s.org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
           AND (
             get_my_region_ids() IS NULL
             OR s.region_id = ANY(get_my_region_ids())
           )
         )
         OR (
           -- Supervisor/Viewer respetan internal
           NOT (s.org_code = ANY(get_internal_org_codes()))
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
       )
  )
);

-- ── PASO 4: NOTIFICAR ───────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================
-- 1. Confirmar las 3 policies reescritas:
--    SELECT tablename, policyname FROM pg_policies
--     WHERE tablename IN ('site_visits','submissions','submission_assets')
--       AND policyname IN ('visits_select','submissions_select','assets_select');
--    (esperado: 3 filas)
--
-- 2. Test funcional: login como inspector de HenkanCX (HK) en el app móvil
--    e intentar crear una orden. Antes: 403. Ahora: orden creada.
--
-- 3. Test de no-regresión: login como supervisor/viewer no-admin que NO sea
--    de HenkanCX y verificar que sigue SIN ver datos de HenkanCX (sigue
--    bloqueado por la rama de internal).
-- =============================================================================
