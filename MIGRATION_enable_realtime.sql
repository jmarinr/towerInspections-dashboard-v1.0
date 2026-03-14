-- ─────────────────────────────────────────────────────────────────────────────
-- Habilitar Supabase Realtime para la tabla submissions
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Agregar la tabla al publication de Realtime
--    (supabase_realtime ya existe en todos los proyectos Supabase)
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

-- 2. Verificar que quedó activa (debe aparecer 'submissions' en el resultado)
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- ─────────────────────────────────────────────────────────────────────────────
-- OPCIONAL: Si también quieres Realtime en site_visits (para el módulo Orders)
-- ALTER PUBLICATION supabase_realtime ADD TABLE site_visits;
-- ─────────────────────────────────────────────────────────────────────────────

-- NOTA: No se requiere ningún cambio en RLS para Realtime.
-- El cliente anon solo recibirá eventos de filas que la anon key
-- tiene permiso de SELECT — el mismo control de acceso que ya existe.
