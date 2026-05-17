-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Normalizar scope/company para admin (v4.14.6)
-- Proyecto: kmdkiyrjmvxnmfdvsofq.supabase.co
--
-- PROBLEMA (descubierto en pruebas):
--   Admin jolumariv@gmail.com tenía scope='scoped' y company_id de HenkanCX.
--   Eso disparaba guards de frontend (SubmissionDetail, OrderDetail) que
--   bloqueaban incluso al admin.
--
--   Causa raíz: cuando hicimos v4.13.0 (scope), no garantizamos que el rol
--   admin siempre tenga scope=NULL. Si el usuario era supervisor antes y se
--   cambió a admin, el scope viejo persistía.
--
-- SOLUCIÓN:
--   1) Backfill: setear scope=NULL para todos los admins existentes.
--      (company_id se deja por si el admin opera operativamente con una
--      empresa propia — no rompe nada.)
--   2) Trigger BEFORE INSERT/UPDATE que fuerza scope=NULL cuando role=admin.
--      Previene que vuelva a pasar.
--
-- IDEMPOTENTE.
-- ROLLBACK: ROLLBACK_admin_scope_null.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── PASO 1: Backfill admins existentes ──────────────────────────────────────
UPDATE app_users
   SET scope = NULL
 WHERE role = 'admin'
   AND scope IS NOT NULL;

-- ── PASO 2: Trigger que normaliza scope para admin ──────────────────────────
CREATE OR REPLACE FUNCTION app_users_normalize_admin_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    -- Admin nunca tiene scope (es global por definición)
    NEW.scope := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_admin_scope ON app_users;
CREATE TRIGGER trg_normalize_admin_scope
  BEFORE INSERT OR UPDATE OF role, scope ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION app_users_normalize_admin_scope();

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================
-- 1. Confirmar que no quedan admins con scope:
--    SELECT email, role, scope FROM app_users WHERE role='admin' AND scope IS NOT NULL;
--    (esperado: 0 filas)
--
-- 2. Confirmar trigger:
--    SELECT trigger_name, event_manipulation FROM information_schema.triggers
--     WHERE event_object_table='app_users' AND trigger_name='trg_normalize_admin_scope';
--    (esperado: 2 filas — INSERT y UPDATE)
--
-- 3. Test del trigger (debería fallar silenciosamente — scope queda NULL):
--    UPDATE app_users SET scope='scoped' WHERE email='jolumariv@gmail.com';
--    SELECT email, scope FROM app_users WHERE email='jolumariv@gmail.com';
--    (esperado: scope = NULL, no 'scoped')
-- =============================================================================
