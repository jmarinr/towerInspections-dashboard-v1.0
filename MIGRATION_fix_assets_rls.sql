-- ══════════════════════════════════════════════════════════════
-- MIGRATION: Fix RLS en submission_assets para dashboard uploads
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Ampliar INSERT: admin y supervisor pueden subir fotos desde el dashboard
DROP POLICY IF EXISTS "assets_insert" ON submission_assets;
CREATE POLICY "assets_insert" ON submission_assets
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin', 'supervisor', 'inspector')
  );

-- 2. Agregar UPDATE: admin y supervisor pueden actualizar assets
DROP POLICY IF EXISTS "assets_update" ON submission_assets;
CREATE POLICY "assets_update" ON submission_assets
  FOR UPDATE USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'supervisor'
      AND EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = submission_assets.submission_id
        AND s.org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
      )
    )
  );

-- 3. Agregar columna uploaded_by a submission_assets (nullable)
ALTER TABLE submission_assets
  ADD COLUMN IF NOT EXISTS uploaded_by text;

-- ── Storage bucket policies ────────────────────────────────────
-- El bucket inspection-assets necesita permitir uploads desde admin/supervisor.
-- Ir a Supabase → Storage → inspection-assets → Policies y agregar:
--
--  Policy name: "dashboard_authenticated_upload"
--  Allowed operation: INSERT
--  Policy definition:
--    (auth.role() = 'authenticated' AND (
--      SELECT role FROM app_users WHERE id = auth.uid()
--    ) IN ('admin', 'supervisor', 'inspector'))
--
-- O alternativamente, hacer el bucket público para uploads autenticados:
-- En Storage Settings → inspection-assets → toggle "Public bucket" ON
-- (más simple para este caso de uso interno)

NOTIFY pgrst, 'reload schema';
