-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Statement timeout para rol authenticated (v4.14.2)
-- Proyecto: kmdkiyrjmvxnmfdvsofq.supabase.co
--
-- CONTEXTO:
--   Supabase tiene un statement_timeout default bajo (típicamente 8s) para el
--   rol `authenticated`. Bajo RLS de varias tablas + JOINs implícitos en
--   embeds del cliente, queries de usuarios globales han alcanzado ese límite
--   incluso después de las optimizaciones de v4.14.1.
--
--   v4.14.2 también remueve los embeds cruzados en el frontend (fetchSubmissions
--   y fetchSiteVisits), pero este ajuste de timeout actúa como red de seguridad
--   para que cualquier query lenta sobreviva en el corto plazo y no rompa UX.
--
--   30s es generoso: la mayoría de queries deberían correr en <2s. Si una query
--   llega cerca de 30s, es señal clara de un problema que conviene atacar a
--   nivel de schema/index, no de timeout.
--
-- IDEMPOTENTE: puede correrse varias veces sin efectos secundarios.
-- ROLLBACK:    ROLLBACK_statement_timeout.sql
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- statement_timeout solo aplica a queries del rol authenticated
-- (usuarios logueados). El rol anon y service_role no son afectados.
ALTER ROLE authenticated SET statement_timeout = '30s';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================
-- 1. Confirmar el timeout configurado:
--    SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'authenticated';
--    Esperado: rolconfig contiene "statement_timeout=30s"
-- =============================================================================
