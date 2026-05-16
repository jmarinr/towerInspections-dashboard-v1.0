-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: Performance fix RLS (v4.14.1 → v4.13.1)
--
-- Vuelve a las policies con subconsultas correlacionadas (las de v4.13.1).
-- Mantiene las columnas internal de companies y regions intactas.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: Restaurar policies de v4.13.1 ────────────────────────────────────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    NOT EXISTS (
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

DROP POLICY IF EXISTS "submissions_update_supervisor" ON submissions;
CREATE POLICY "submissions_update_supervisor" ON submissions FOR UPDATE USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() = 'supervisor'
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

-- ── PASO 2: Drop helpers ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_internal_org_codes();
DROP FUNCTION IF EXISTS get_internal_region_ids();

NOTIFY pgrst, 'reload schema';

COMMIT;
