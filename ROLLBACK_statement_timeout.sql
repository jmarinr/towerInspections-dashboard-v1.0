-- ══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: Statement timeout (v4.14.2 → v4.14.1)
--
-- Vuelve el statement_timeout del rol authenticated al default de Supabase.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER ROLE authenticated RESET statement_timeout;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verificación:
--   SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'authenticated';
--   Esperado: rolconfig NO contiene statement_timeout (vuelve al default global)
