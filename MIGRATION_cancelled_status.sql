-- ══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Nuevo estatus 'cancelled' en site_visits
-- Ejecutar en: SQL Editor de la base de datos
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Ver el nombre exacto del constraint actual (ejecutar primero para verificar)
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'site_visits' AND constraint_type = 'CHECK';

-- 2. Eliminar constraint actual de status (nombre más común — ajustar si es diferente)
ALTER TABLE site_visits
  DROP CONSTRAINT IF EXISTS site_visits_status_check;

-- También intentar con nombres alternativos por si acaso
ALTER TABLE site_visits
  DROP CONSTRAINT IF EXISTS site_visits_status_fkey;

-- 3. Agregar nuevo constraint con 'cancelled'
ALTER TABLE site_visits
  ADD CONSTRAINT site_visits_status_check
  CHECK (status IN ('open', 'closed', 'cancelled'));

-- 4. Agregar columnas de auditoría para cancelaciones
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by  UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 5. Índice para filtrar canceladas eficientemente
CREATE INDEX IF NOT EXISTS idx_site_visits_cancelled
  ON site_visits (status)
  WHERE status = 'cancelled';

-- 6. Refrescar schema
NOTIFY pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════════════
-- Verificación post-migración
-- ══════════════════════════════════════════════════════════════════════════════
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'site_visits_status_check';
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'site_visits'
--   AND column_name IN ('cancelled_at', 'cancelled_by', 'cancel_reason');
