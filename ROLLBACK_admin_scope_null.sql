-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: admin scope null (v4.14.6 → v4.14.5)
--
-- NOTA: no revertimos el backfill (sería peligroso restaurar scope='scoped'
-- a admins porque no sabemos qué scope tenían originalmente). Solo
-- removemos el trigger.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TRIGGER IF EXISTS trg_normalize_admin_scope ON app_users;
DROP FUNCTION IF EXISTS app_users_normalize_admin_scope();

COMMIT;
