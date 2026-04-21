-- ============================================================
-- MIGRATION: Daños Agrupados — group_key + group_comment
-- Tabla afectada: report_damage_tracking (additive-only, seguro)
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- Añadir columnas (nullable, sin default — cero impacto en filas existentes)
ALTER TABLE report_damage_tracking
  ADD COLUMN IF NOT EXISTS group_key     TEXT,
  ADD COLUMN IF NOT EXISTS group_comment TEXT;

-- Índice para lecturas rápidas por group_key
CREATE INDEX IF NOT EXISTS idx_damage_tracking_group_key
  ON report_damage_tracking (group_key)
  WHERE group_key IS NOT NULL;

-- Refrescar schema de PostgREST para que reconozca las columnas nuevas
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificación post-migración (opcional, ejecutar por separado)
-- ============================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'report_damage_tracking'
--   AND column_name IN ('group_key', 'group_comment');
