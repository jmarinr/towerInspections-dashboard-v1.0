-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Permisos para rol viewer
-- El rol viewer puede ver reportes pero NO puede exportar ni cambiar estados
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO role_permissions (role, permission, enabled)
VALUES
  ('viewer', 'reports.view',              true),   -- puede ver todos los reportes
  ('viewer', 'reports.export_excel',      false),  -- NO puede exportar Excel
  ('viewer', 'submissions.change_status', false),  -- NO puede cambiar estado de submissions
  ('viewer', 'visits.change_status',      false)   -- NO puede cambiar estado de visitas
ON CONFLICT (role, permission) DO UPDATE
  SET enabled = EXCLUDED.enabled;

NOTIFY pgrst, 'reload schema';

-- ── Verificación ──────────────────────────────────────────────────────────────
SELECT role, permission, enabled
FROM role_permissions
WHERE role IN ('viewer', 'supervisor', 'inspector')
ORDER BY role, permission;
