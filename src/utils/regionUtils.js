/**
 * regionUtils.js
 * Extrae la región desde el order_number.
 * Formato: OT-{REGION}-{AÑO}-{MES}-{SITIO}
 * Ej: OT-OESTE-2026-04-PA-CH-1041 → "OESTE"
 *     OT-CENTRAL-2026-03-1033     → "CENTRAL"
 */

export function extractRegion(orderNumber) {
  if (!orderNumber) return null
  const parts = orderNumber.split('-')
  // Parte 0 = OT, parte 1 = REGIÓN
  if (parts.length >= 2) {
    const reg = parts[1].toUpperCase()
    // Excluir tokens que no son regiones (años, números solos)
    if (/^\d{4}$/.test(reg)) return null
    return reg
  }
  return null
}

// Mapa de etiquetas para mostrar nombres bonitos
export const REGION_LABELS = {
  'OESTE':   'Región Oeste',
  'CENTRAL': 'Región Central',
  'PRUEBA':  'Prueba / Test',
}

export function regionLabel(code) {
  return REGION_LABELS[code] || code
}
