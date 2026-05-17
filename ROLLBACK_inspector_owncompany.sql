-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: Inspector de su propia empresa (v4.14.4 → v4.14.3)
--
-- Restaura las policies SELECT exactamente como estaban en v4.14.1
-- (que se mantuvieron sin cambios en v4.14.2 y v4.14.3).
--
-- ATENCIÓN: después del rollback, los inspectores de empresas marcadas como
-- internal volverán a tener 403 al crear órdenes. Asegurate de desmarcar
-- la empresa como internal o el sistema queda parcialmente inoperante.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

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

DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
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
      OR submitted_by_user_id = auth.uid()
    )
  )
);

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

NOTIFY pgrst, 'reload schema';

COMMIT;
