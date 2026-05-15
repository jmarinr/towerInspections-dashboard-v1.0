-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: User Scope + User-Region Assignments (v4.13.0)
-- Proyecto: kmdkiyrjmvxnmfdvsofq.supabase.co
--
-- INTRODUCE:
--   • app_users.scope (global | scoped) — separa supervisor general de uno
--     vinculado a una empresa concreta.
--   • app_user_regions (user_id, region_id) — scoping fino para supervisor y
--     viewer a regiones específicas dentro de su empresa.
--   • site_visits.region_id — backfill desde sites.site_id, para filtrado
--     server-side de órdenes por región.
--   • RLS actualizado: submissions, submission_assets y site_visits respetan
--     scope + asignación de regiones del usuario.
--   • Trigger BEFORE DELETE en company_regions que bloquea si hay usuarios
--     asignados a esa (empresa, región).
--
-- IDEMPOTENTE: puede correrse varias veces sin efectos secundarios.
-- ROLLBACK:    ROLLBACK_user_scope_and_regions.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: app_users.scope ──────────────────────────────────────────────────
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'scoped';

-- Backfill: supervisor/viewer sin empresa actual = 'global' (preserva supervisor general).
UPDATE app_users
   SET scope = 'global'
 WHERE role IN ('supervisor', 'viewer')
   AND company_id IS NULL;

-- CHECK al final, después del backfill, para no fallar en datos legacy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_users_scope_check'
  ) THEN
    ALTER TABLE app_users
      ADD CONSTRAINT app_users_scope_check CHECK (scope IN ('global', 'scoped'));
  END IF;
END $$;

-- ── PASO 2: Trigger de coherencia de scope ──────────────────────────────────
-- Reglas:
--   admin     → scope siempre 'scoped' (irrelevante en RLS), company_id libre.
--   inspector → siempre 'scoped', company_id obligatoria.
--   supervisor/viewer:
--     scope='global' → company_id DEBE ser NULL.
--     scope='scoped' → company_id DEBE NO ser NULL.
-- Si scope='scoped' y company_id es NULL → el trigger NORMALIZA a 'global'
-- para mantener compat con la edge function legacy que no envía scope.
CREATE OR REPLACE FUNCTION enforce_user_scope() RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    NEW.scope := 'scoped';
    RETURN NEW;
  END IF;

  IF NEW.role = 'inspector' THEN
    NEW.scope := 'scoped';
    IF NEW.company_id IS NULL THEN
      RAISE EXCEPTION 'Inspector debe tener company_id asignado';
    END IF;
    RETURN NEW;
  END IF;

  -- supervisor / viewer
  IF NEW.role IN ('supervisor', 'viewer') THEN
    -- Normalizar si no se especificó scope explícito y no hay company_id
    IF NEW.scope = 'scoped' AND NEW.company_id IS NULL THEN
      NEW.scope := 'global';
    END IF;

    IF NEW.scope = 'global' AND NEW.company_id IS NOT NULL THEN
      RAISE EXCEPTION 'Usuario con scope=global no puede tener company_id';
    END IF;

    IF NEW.scope = 'scoped' AND NEW.company_id IS NULL THEN
      RAISE EXCEPTION 'Usuario con scope=scoped debe tener company_id';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_users_enforce_scope ON app_users;
CREATE TRIGGER trg_app_users_enforce_scope
  BEFORE INSERT OR UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION enforce_user_scope();

-- ── PASO 3: app_user_regions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_user_regions (
  user_id    uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  region_id  uuid NOT NULL REFERENCES regions(id)   ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, region_id)
);

CREATE INDEX IF NOT EXISTS idx_app_user_regions_user   ON app_user_regions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_regions_region ON app_user_regions(region_id);

-- ── PASO 4: Trigger de coherencia user_region ↔ company_regions ─────────────
-- Garantiza que un usuario solo se asigne a regiones donde su empresa opera.
-- Admin global no puede tener app_user_regions (carece de empresa).
CREATE OR REPLACE FUNCTION enforce_user_region_company() RETURNS trigger AS $$
DECLARE
  u_role text;
  u_scope text;
  u_company_id uuid;
BEGIN
  SELECT role, scope, company_id
    INTO u_role, u_scope, u_company_id
    FROM app_users WHERE id = NEW.user_id;

  IF u_role = 'admin' OR u_scope = 'global' THEN
    RAISE EXCEPTION 'Solo usuarios scoped (supervisor/viewer/inspector con empresa) pueden tener regiones asignadas';
  END IF;

  IF u_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario debe tener company_id antes de asignarle regiones';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM company_regions
     WHERE company_id = u_company_id
       AND region_id  = NEW.region_id
  ) THEN
    RAISE EXCEPTION 'La región % no pertenece a la empresa del usuario', NEW.region_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_user_regions_enforce ON app_user_regions;
CREATE TRIGGER trg_app_user_regions_enforce
  BEFORE INSERT OR UPDATE ON app_user_regions
  FOR EACH ROW EXECUTE FUNCTION enforce_user_region_company();

-- ── PASO 5: Bloqueo de DELETE en company_regions con usuarios asignados ─────
CREATE OR REPLACE FUNCTION protect_company_region_in_use() RETURNS trigger AS $$
DECLARE
  affected_count int;
BEGIN
  SELECT count(*) INTO affected_count
    FROM app_user_regions aur
    JOIN app_users au ON au.id = aur.user_id
   WHERE au.company_id = OLD.company_id
     AND aur.region_id = OLD.region_id;

  IF affected_count > 0 THEN
    RAISE EXCEPTION 'No se puede desvincular la región de la empresa: % usuario(s) están asignados a esta combinación. Reasígnelos primero.', affected_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_regions_protect ON company_regions;
CREATE TRIGGER trg_company_regions_protect
  BEFORE DELETE ON company_regions
  FOR EACH ROW EXECUTE FUNCTION protect_company_region_in_use();

-- ── PASO 6: site_visits.region_id + backfill ────────────────────────────────
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_site_visits_region ON site_visits(region_id);

-- Backfill: site_visits.site_id (text) → sites.site_id (text) → regions.id
UPDATE site_visits sv
   SET region_id = s.region_id
  FROM sites s
 WHERE s.site_id  = sv.site_id
   AND sv.region_id IS NULL;

-- Backfill paralelo de submissions.region_id desde la visita (si quedó NULL).
UPDATE submissions sub
   SET region_id = sv.region_id
  FROM site_visits sv
 WHERE sv.id           = sub.site_visit_id
   AND sub.region_id IS NULL
   AND sv.region_id   IS NOT NULL;

-- ── PASO 7: Helper RLS — region_ids del usuario actual ──────────────────────
CREATE OR REPLACE FUNCTION get_my_region_ids() RETURNS uuid[]
LANGUAGE sql STABLE AS $$
  SELECT array_agg(region_id) FROM app_user_regions WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_scope() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT scope FROM app_users WHERE id = auth.uid()
$$;

-- ── PASO 8: RLS actualizado para submissions ────────────────────────────────
-- Reemplaza la policy SELECT con la versión que respeta scope y regiones.
DROP POLICY IF EXISTS "submissions_select" ON submissions;
CREATE POLICY "submissions_select" ON submissions FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    -- supervisor / viewer GLOBAL → ve todo (la lista negra HK queda client-side)
    get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global'
  )
  OR (
    -- supervisor / viewer SCOPED a empresa
    get_my_role() IN ('supervisor','viewer')
    AND get_my_scope() = 'scoped'
    AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
    AND (
      -- si el usuario no tiene regiones asignadas → ve todas las de su empresa
      get_my_region_ids() IS NULL
      -- si tiene regiones → submission debe estar en una de ellas (excluyente: NULL no pasa)
      OR region_id = ANY(get_my_region_ids())
    )
  )
  OR submitted_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS "submissions_update_supervisor" ON submissions;
CREATE POLICY "submissions_update_supervisor" ON submissions FOR UPDATE USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() = 'supervisor'
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

-- ── PASO 9: RLS actualizado para site_visits ────────────────────────────────
DROP POLICY IF EXISTS "visits_select" ON site_visits;
CREATE POLICY "visits_select" ON site_visits FOR SELECT USING (
  get_my_role() = 'admin'
  OR (
    get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global'
  )
  OR (
    get_my_role() IN ('supervisor','viewer')
    AND get_my_scope() = 'scoped'
    AND org_code IN (SELECT org_code FROM companies WHERE id = get_my_company_id())
    AND (
      get_my_region_ids() IS NULL
      OR region_id = ANY(get_my_region_ids())
    )
  )
);

-- ── PASO 10: RLS actualizado para submission_assets ─────────────────────────
DROP POLICY IF EXISTS "assets_select" ON submission_assets;
CREATE POLICY "assets_select" ON submission_assets FOR SELECT USING (
  get_my_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM submissions s
     WHERE s.id = submission_assets.submission_id
       AND (
         -- supervisor / viewer global
         (get_my_role() IN ('supervisor','viewer') AND get_my_scope() = 'global')
         OR (
           -- supervisor / viewer scoped a empresa
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

-- ── PASO 11: RLS para app_user_regions ──────────────────────────────────────
ALTER TABLE app_user_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aur_admin_all" ON app_user_regions;
CREATE POLICY "aur_admin_all" ON app_user_regions FOR ALL USING (
  get_my_role() = 'admin'
);

DROP POLICY IF EXISTS "aur_self_read" ON app_user_regions;
CREATE POLICY "aur_self_read" ON app_user_regions FOR SELECT USING (
  user_id = auth.uid()
);

-- ── PASO 12: NOTIFICAR ──────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- REPORTE POST-MIGRACIÓN — ejecutar manualmente al final
-- =============================================================================
-- 1. Cuántas site_visits quedaron con region_id NULL (legacy sin match en sites):
--    SELECT count(*) FROM site_visits WHERE region_id IS NULL;
--
-- 2. Cuántas submissions quedaron con region_id NULL:
--    SELECT count(*) FROM submissions WHERE region_id IS NULL;
--
-- 3. Distribución de scope:
--    SELECT role, scope, count(*) FROM app_users GROUP BY role, scope ORDER BY role, scope;
--
-- 4. Verificar el supervisor general:
--    SELECT id, email, full_name, role, scope, company_id FROM app_users WHERE scope = 'global';
-- =============================================================================
