-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Índice parcial para queries de reportes (equipment-v2)
-- Ejecutar en Supabase SQL Editor antes del primer deploy de la sección Reportes
-- ══════════════════════════════════════════════════════════════════════════

-- Índice compuesto parcial: solo filas finalizadas (las únicas que aparecen en reportes)
-- Reduce el costo de sequential scan en la tabla submissions para queries como:
--   WHERE form_code IN ('equipment-v2', 'inventario-v2') AND finalized = true
--
-- El índice es parcial (WHERE finalized = true) → más pequeño y eficiente
-- que un índice completo, ya que los reportes nunca consultan borradores.
CREATE INDEX IF NOT EXISTS idx_submissions_formcode_finalized
  ON submissions (form_code, finalized)
  WHERE finalized = true;

-- Notificar a PostgREST para que recargue el schema
NOTIFY pgrst, 'reload schema';

-- Verificar que el índice fue creado correctamente:
-- SELECT indexname, indexdef
--   FROM pg_indexes
--  WHERE tablename = 'submissions'
--    AND indexname = 'idx_submissions_formcode_finalized';
