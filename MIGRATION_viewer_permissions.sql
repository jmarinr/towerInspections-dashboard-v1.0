-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Permisos para rol viewer
-- viewer puede ver reportes Y exportar Excel, pero NO cambiar estados
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO role_permissions (role, permission, enabled)
VALUES
  ('viewer', 'reports.view',              true),   -- puede ver todos los reportes
  ('viewer', 'reports.export_excel',      true),   -- puede exportar Excel
  ('viewer', 'submissions.change_status', false),  -- NO puede cambiar estado
  ('viewer', 'visits.change_status',      false)   -- NO puede cambiar estado
ON CONFLICT (role, permission) DO UPDATE
  SET enabled = EXCLUDED.enabled;

NOTIFY pgrst, 'reload schema';

-- ── Verificación ──────────────────────────────────────────────────────────────
SELECT role, permission, enabled
FROM role_permissions
WHERE role IN ('viewer', 'supervisor', 'inspector')
ORDER BY role, permission;
