/**
 * Utilidad compartida para nombres de archivo de PDFs y ZIPs.
 * Formato: {N}_{NombreBase}_{IDSitio}_{MES}_{AÑO}.{ext}
 *
 * Los nombres base están en INGLÉS, alineados exactamente con los títulos
 * numerados que muestra el Inspector App (ej. "1 Preventive Maintenance
 * Inspection" → "1_Preventive_Maintenance_Inspection").
 */

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']

// Nombres base con número de orden incluido (mismo número que el Inspector App).
// Indexados por form_code normalizado (ver normalizeFormCode en formTypes.js).
export const PDF_BASE_NAMES = {
  'preventive-maintenance':  '1_Preventive_Maintenance_Inspection',
  'executed-maintenance':    '2_Preventive_Maintenance_Executed',
  'grounding-system-test':   '4_Grounding_System_Test',
  'equipment-v2':            '8_Equipment_Inventory',
  'additional-photo-report': '9_Additional_Photo_Report',
  'safety-system':           '10_Safety_Climbing_Device',
}

/**
 * Construye el nombre de archivo para PDFs y ZIPs.
 * @param {string} baseName  Nombre base (usar PDF_BASE_NAMES[formCode])
 * @param {string} idSitio   ID del sitio (se sanitiza)
 * @param {string} fecha     Fecha ISO del submission; fallback a hoy
 * @param {string} ext       Extensión sin punto (default 'pdf')
 * @returns {string} ej. "1_Preventive_Maintenance_Inspection_SITIO-001_MAY_2026.pdf"
 */
export function buildFileName(baseName, idSitio, fecha, ext = 'pdf') {
  const date = fecha ? new Date(fecha) : new Date()
  const valid = !isNaN(date)
  const d    = valid ? date : new Date()
  const mes  = MESES[d.getMonth()]
  const anio = d.getFullYear()
  const sitio = (idSitio || 'SITIO').replace(/[^a-zA-Z0-9\-]/g, '')
  return `${baseName}_${sitio}_${mes}_${anio}.${ext}`
}
