-- =============================================================================
-- PTI Admin Panel — Migration: system_logs
-- Ejecutar en el SQL Editor de Supabase
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type  text        NOT NULL,
  severity    text        NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info','warning','error','critical')),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  text,
  user_role   text,
  company_id  uuid        REFERENCES companies(id) ON DELETE SET NULL,
  ip_address  text,
  metadata    jsonb       DEFAULT '{}'::jsonb,
  message     text        NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at  ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type  ON system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_severity    ON system_logs(severity);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id     ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_company_id  ON system_logs(company_id);

-- RLS: solo admins pueden leer logs, cualquier usuario autenticado puede insertar
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_select_admin" ON system_logs;
CREATE POLICY "logs_select_admin" ON system_logs
  FOR SELECT USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "logs_insert_auth" ON system_logs;
CREATE POLICY "logs_insert_auth" ON system_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Notificar cambio de schema
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Tipos de eventos registrados:
--   auth.login            — Login exitoso
--   auth.login_failed     — Intento de login fallido
--   auth.logout           — Logout
--   user.created          — Nuevo usuario creado
--   user.updated          — Usuario modificado
--   user.deactivated      — Usuario desactivado
--   submission.received   — Nuevo formulario recibido desde la app (Realtime)
--   submission.finalized  — Formulario marcado como finalizado (Realtime)
--   submission.edited     — Formulario editado con auditoría desde el dashboard
--   visit.received        — Nueva visita/orden recibida desde la app (Realtime)
--   visit.status_changed  — Estado de visita cambiado (Realtime)
--   system.error          — Error del sistema
-- =============================================================================
