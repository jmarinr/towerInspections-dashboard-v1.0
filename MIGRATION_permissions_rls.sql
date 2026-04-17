-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Permisos granulares para Admin Panel
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Política RLS: Admin Panel puede actualizar submissions ─────────────────
-- Permite a usuarios con rol admin o supervisor en app_users
-- actualizar submissions aunque no sean el inspector original.

DROP POLICY IF EXISTS "admin_panel_can_update_submissions" ON submissions;

CREATE POLICY "admin_panel_can_update_submissions"
ON submissions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'supervisor')
      AND active = true
  )
  OR submitted_by_user_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'supervisor')
      AND active = true
  )
  OR submitted_by_user_id = auth.uid()
);

-- ── 2. Política RLS: Admin Panel puede actualizar site_visits ─────────────────
DROP POLICY IF EXISTS "admin_panel_can_update_site_visits" ON site_visits;

CREATE POLICY "admin_panel_can_update_site_visits"
ON site_visits FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'supervisor')
      AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'supervisor')
      AND active = true
  )
);

-- ── 3. Seed de los nuevos permisos granulares ─────────────────────────────────
-- Solo inserta si no existen — no sobreescribe configuración ya guardada.

INSERT INTO role_permissions (role, permission, enabled)
VALUES
  ('supervisor', 'submissions.change_status', true),
  ('supervisor', 'visits.change_status',      true),
  ('supervisor', 'reports.view',              true),
  ('supervisor', 'reports.export_excel',      true),
  ('inspector',  'submissions.change_status', false),
  ('inspector',  'visits.change_status',      false),
  ('inspector',  'reports.view',              false),
  ('inspector',  'reports.export_excel',      false)
ON CONFLICT (role, permission) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ── Verificación ──────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('submissions', 'site_visits')
  AND policyname LIKE 'admin_panel%'
ORDER BY tablename, policyname;
