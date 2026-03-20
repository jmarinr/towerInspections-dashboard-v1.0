-- =============================================================================
-- PTI Admin Panel — User Management Migration
-- Ejecutar en orden en el SQL Editor de Supabase
-- =============================================================================

-- ── 1. EMPRESAS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  org_code    text        NOT NULL UNIQUE,
  country     text        NOT NULL DEFAULT '',
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── 2. USUARIOS DE LA APP ─────────────────────────────────────────────────────
-- Vinculado a auth.users de Supabase (id = mismo UUID que auth.users.id)
CREATE TABLE IF NOT EXISTS app_users (
  id            uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    uuid    REFERENCES companies(id) ON DELETE SET NULL,
  email         text    NOT NULL,
  full_name     text    NOT NULL DEFAULT '',
  role          text    NOT NULL DEFAULT 'inspector'
                        CHECK (role IN ('admin','supervisor','inspector')),
  supervisor_id uuid    REFERENCES app_users(id) ON DELETE SET NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── 3. PERMISOS POR ROL ───────────────────────────────────────────────────────
-- Permite al admin activar/desactivar funcionalidades por rol
CREATE TABLE IF NOT EXISTS role_permissions (
  id          uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  role        text  NOT NULL CHECK (role IN ('admin','supervisor','inspector')),
  permission  text  NOT NULL,   -- clave de funcionalidad (ej: 'submissions.edit')
  enabled     boolean NOT NULL DEFAULT true,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (role, permission)
);

-- Valores por defecto de permisos
INSERT INTO role_permissions (role, permission, enabled) VALUES
  -- admin: todo habilitado
  ('admin', 'dashboard.view',              true),
  ('admin', 'submissions.view_all',        true),
  ('admin', 'submissions.edit',            true),
  ('admin', 'submissions.export_pdf',      true),
  ('admin', 'submissions.export_photos',   true),
  ('admin', 'visits.view',                 true),
  ('admin', 'audit.view',                  true),
  ('admin', 'admin.companies',             true),
  ('admin', 'admin.users',                 true),
  ('admin', 'admin.permissions',           true),
  -- supervisor: su empresa, sin admin
  ('supervisor', 'dashboard.view',         true),
  ('supervisor', 'submissions.view_all',   false),
  ('supervisor', 'submissions.edit',       true),
  ('supervisor', 'submissions.export_pdf', true),
  ('supervisor', 'submissions.export_photos', true),
  ('supervisor', 'visits.view',            true),
  ('supervisor', 'audit.view',             true),
  ('supervisor', 'admin.companies',        false),
  ('supervisor', 'admin.users',            false),
  ('supervisor', 'admin.permissions',      false),
  -- inspector: solo app móvil, no dashboard
  ('inspector', 'dashboard.view',          false),
  ('inspector', 'submissions.view_all',    false),
  ('inspector', 'submissions.edit',        false),
  ('inspector', 'submissions.export_pdf',  false),
  ('inspector', 'submissions.export_photos', false),
  ('inspector', 'visits.view',             false),
  ('inspector', 'audit.view',              false),
  ('inspector', 'admin.companies',         false),
  ('inspector', 'admin.users',             false),
  ('inspector', 'admin.permissions',       false)
ON CONFLICT (role, permission) DO NOTHING;

-- ── 4. FK EN SUBMISSIONS ──────────────────────────────────────────────────────
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid
  REFERENCES app_users(id) ON DELETE SET NULL;

-- ── 4b. CREAR submission_edits SI NO EXISTE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS submission_edits (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id  uuid NOT NULL,
  edited_by      text NOT NULL,
  edited_at      timestamptz DEFAULT now(),
  changes        jsonb NOT NULL,
  note           text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submission_edits_submission_id
  ON submission_edits(submission_id);

CREATE INDEX IF NOT EXISTS idx_submission_edits_edited_by
  ON submission_edits(edited_by);

-- ── 5. TRIGGER: updated_at en app_users ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. HABILITAR RLS ──────────────────────────────────────────────────────────
ALTER TABLE companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits       ENABLE ROW LEVEL SECURITY;

-- ── 7. FUNCIÓN HELPER: obtener rol del usuario autenticado ────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM app_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM app_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 8. POLÍTICAS RLS ─────────────────────────────────────────────────────────

-- companies: admin ve todo, supervisor/inspector ven solo la suya
DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT USING (
  get_my_role() = 'admin'
  OR id = get_my_company_id()
);
DROP POLICY IF EXISTS "companies_all_admin" ON companies;
CREATE POLICY "companies_all_admin" ON companies FOR ALL USING (
  get_my_role() = 'admin'
);

-- app_users: admin ve todos, supervisor ve su empresa, inspector solo él
DROP POLICY IF EXISTS "app_users_select" ON app_users;
CREATE POLICY "app_users_select" ON app_users FOR SELECT USING (
  get_my_role() = 'admin'
  OR company_id = get_my_company_id()
  OR id = auth.uid()
);
DROP POLICY IF EXISTS "app_users_all_admin" ON app_users;
CREATE POLICY "app_users_all_admin" ON app_users FOR ALL USING (
  get_my_role() = 'admin'
);

-- role_permissions: admin gestiona, todos pueden leer
DROP POLICY IF EXISTS "rp_select" ON role_permissions;
CREATE POLICY "rp_select" ON role_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "rp_all_admin" ON role_permissions;
CREATE POLICY "rp_all_admin" ON role_permissions FOR ALL USING (
  get_my_role() = 'admin'
);

-- submissions: admin ve todo, supervisor ve su empresa, inspector ve las suyas
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (get_my_role() = 'supervisor'
      AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id()))
  OR submitted_by_user_id = auth.uid()
);
DROP POLICY IF EXISTS "submissions_insert_inspector" ON submissions;
CREATE POLICY "submissions_insert_inspector" ON submissions FOR INSERT WITH CHECK (
  get_my_role() IN ('admin','inspector')
);
DROP POLICY IF EXISTS "submissions_update_supervisor" ON submissions;
CREATE POLICY "submissions_update_supervisor" ON submissions FOR UPDATE USING (
  get_my_role() IN ('admin','supervisor')
  AND (
    get_my_role() = 'admin'
    OR org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
  )
);

-- submission_assets: misma lógica que submissions via JOIN
DROP POLICY IF EXISTS "assets_select" ON submission_assets;
CREATE POLICY "assets_select" ON submission_assets FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM submissions s
    WHERE s.id = submission_assets.submission_id
    AND (
      get_my_role() = 'supervisor'
      AND s.org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
      OR s.submitted_by_user_id = auth.uid()
    )
  )
);
DROP POLICY IF EXISTS "assets_insert" ON submission_assets;
CREATE POLICY "assets_insert" ON submission_assets FOR INSERT WITH CHECK (
  get_my_role() IN ('admin','inspector')
);

-- site_visits: igual que submissions (asume que tiene org_code, si no ajustar)
DROP POLICY IF EXISTS "visits_select" ON site_visits;
CREATE POLICY "visits_select" ON site_visits FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = get_my_company_id()
    AND (
      -- si site_visits tiene org_code directo
      site_visits.org_code = companies.org_code
    )
  )
);

-- submission_edits: admin y supervisor de la empresa
DROP POLICY IF EXISTS "edits_select" ON submission_edits;
CREATE POLICY "edits_select" ON submission_edits FOR SELECT USING (
  get_my_role() IN ('admin','supervisor')
);
DROP POLICY IF EXISTS "edits_insert" ON submission_edits;
CREATE POLICY "edits_insert" ON submission_edits FOR INSERT WITH CHECK (
  get_my_role() IN ('admin','supervisor')
);

-- ── 9. NOTIFICAR CAMBIO DE SCHEMA A POSTGREST ────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- DESPUÉS DE EJECUTAR ESTE SQL:
-- 1. Ir a Authentication > Users en Supabase
-- 2. Crear el usuario admin con su email real
-- 3. Insertar en app_users: INSERT INTO app_users (id, email, full_name, role)
--    VALUES ('<uuid-del-auth-user>', 'tu@email.com', 'Tu Nombre', 'admin');
-- 4. Crear las empresas: INSERT INTO companies (name, org_code, country)
--    VALUES ('PTI Costa Rica', 'PTI-CR', 'CR');
-- =============================================================================

-- ── 10. POLÍTICA RLS PARA REALTIME ───────────────────────────────────────────
-- Supabase Realtime necesita política SELECT explícita para postgres_changes
-- Esto permite que el canal Realtime reciba eventos de submissions y site_visits

-- Admin y supervisor reciben todos los cambios de su empresa
-- (la política de SELECT ya existente aplica también a Realtime)

-- Habilitar Realtime en ambas tablas (por si no está)
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE site_visits;

NOTIFY pgrst, 'reload schema';
