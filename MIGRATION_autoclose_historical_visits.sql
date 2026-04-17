-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Auto-cierre de órdenes históricas inconsistentes
-- Cierra todas las visitas donde todos los 6 formularios requeridos
-- están finalizados pero la visita sigue en status 'open'.
--
-- Ejecutar UNA sola vez en Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════════════

-- Los 6 form_codes requeridos (incluyendo aliases históricos)
-- La condición: para cada visita open, todos sus submissions finalizados
-- deben cubrir los 6 grupos de formularios requeridos.

WITH required_groups AS (
  -- Cada "grupo" agrupa aliases del mismo formulario
  SELECT unnest(ARRAY[
    'mantenimiento', 'preventive-maintenance'
  ]) AS form_code, 'mantenimiento' AS group_id
  UNION ALL SELECT unnest(ARRAY[
    'mantenimiento-ejecutado', 'executed-maintenance'
  ]), 'mantenimiento-ejecutado'
  UNION ALL SELECT unnest(ARRAY[
    'equipment-v2', 'inventario-v2'
  ]), 'equipment-v2'
  UNION ALL SELECT unnest(ARRAY[
    'sistema-ascenso', 'safety-system'
  ]), 'sistema-ascenso'
  UNION ALL SELECT unnest(ARRAY[
    'additional-photo-report', 'additional-photo'
  ]), 'additional-photo-report'
  UNION ALL SELECT unnest(ARRAY[
    'grounding-system-test', 'puesta-tierra'
  ]), 'grounding-system-test'
),

-- Para cada visita abierta, cuántos grupos distintos están finalizados
finalized_groups_per_visit AS (
  SELECT
    s.site_visit_id,
    COUNT(DISTINCT rg.group_id) AS finalized_group_count
  FROM submissions s
  JOIN required_groups rg ON s.form_code = rg.form_code
  WHERE s.finalized = true
    AND s.site_visit_id IS NOT NULL
  GROUP BY s.site_visit_id
),

-- Visitas que tienen los 6 grupos completos pero siguen abiertas
visits_to_close AS (
  SELECT sv.id
  FROM site_visits sv
  JOIN finalized_groups_per_visit fgpv ON sv.id = fgpv.site_visit_id
  WHERE sv.status = 'open'
    AND fgpv.finalized_group_count >= 6
)

-- Cerrar las visitas y registrar closed_at
UPDATE site_visits
SET
  status    = 'closed',
  closed_at = COALESCE(closed_at, updated_at, now())
WHERE id IN (SELECT id FROM visits_to_close);

-- Ver cuántas visitas se cerraron
SELECT COUNT(*) AS visitas_cerradas
FROM site_visits
WHERE status = 'closed'
  AND closed_at IS NOT NULL;
