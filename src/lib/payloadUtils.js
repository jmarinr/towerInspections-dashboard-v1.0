/**
 * Smart extraction utilities for PTI Inspect submission payloads.
 *
 * The payload structure from PTI Inspect is:
 * submission.payload = {
 *   meta: { lat, lng, date, time, startedAt },
 *   autosave_bucket: "preventive-maintenance",
 *   data: { ...form-specific snapshot },
 *   validation: null,
 *   profile: null
 * }
 *
 * Additionally, the row-level fields include: org_code, device_id, form_code, form_version, app_version
 *
 * Form-specific data structures:
 * - mantenimiento:     data.formData.{nombreSitio, idSitio, proveedor, ...}, data.checklistData, data.photos
 * - inspeccion:        data.siteInfo.{nombreSitio, idSitio, ...}, data.items, data.photos
 * - equipment:         data.siteInfo.{nombreSitio, idSitio, ...}, data.torre, data.piso, etc.
 * - grounding/safety:  data.{sectionId}.{fieldId} flat structure
 * - executed-maint:    data.siteInfo.{nombreSitio, idSitio, ...}, data.photos
 */

// Keys to hide from the supervisor view (internal/debugging metadata)
const HIDDEN_TOP_KEYS = new Set([
  'org_code', 'device_id', 'form_code', 'form_version', 'app_version',
  'autosave_bucket', 'validation', 'profile',
])

const HIDDEN_DATA_KEYS = new Set([
  'currentStep', 'completedSteps',
])

/**
 * Extract site info from any form type.
 */
export function extractSiteInfo(submission) {
  const payload = submission?.payload || {}
  const data = payload.data || {}

  // Try multiple locations where site info might live
  const siteInfo = data.siteInfo || {}
  const formData = data.formData || {}

  // For grounding/safety forms, data is flat: data.datos.{nombreSitio, idSitio}
  const datosSection = data.datos || {}

  const nombreSitio =
    siteInfo.nombreSitio || formData.nombreSitio || datosSection.nombreSitio || '—'
  const idSitio =
    siteInfo.idSitio || formData.idSitio || datosSection.idSitio || '—'
  const proveedor =
    siteInfo.proveedor || formData.proveedor || datosSection.proveedor || '—'
  const tipoSitio =
    siteInfo.tipoSitio || formData.tipoSitio || datosSection.tipoSitio || ''
  const coordenadas =
    siteInfo.coordenadas || formData.coordenadas || ''
  const direccion =
    siteInfo.direccion || formData.direccion || datosSection.direccion || ''

  return { nombreSitio, idSitio, proveedor, tipoSitio, coordenadas, direccion }
}

/**
 * Extract geo coordinates from meta or siteInfo.
 */
export function extractCoordinates(submission) {
  const meta = submission?.payload?.meta || {}
  const site = extractSiteInfo(submission)

  let lat = meta.lat || null
  let lng = meta.lng || null

  // Try parsing from coordenadas string "9.933, -84.082"
  if (!lat && site.coordenadas) {
    const parts = String(site.coordenadas).split(',').map(s => parseFloat(s.trim()))
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      lat = parts[0]
      lng = parts[1]
    }
  }

  return { lat, lng }
}

/**
 * Extract meta timing info.
 */
export function extractMeta(submission) {
  const meta = submission?.payload?.meta || {}
  return {
    date: meta.date || null,
    time: meta.time || null,
    startedAt: meta.startedAt || null,
    lat: meta.lat || null,
    lng: meta.lng || null,
  }
}

/**
 * Clean the payload for display: removes internal keys, surfaces useful data.
 * Returns an object structured for the StructuredData component.
 */
export function getCleanPayload(submission) {
  const payload = submission?.payload || {}
  const data = payload.data || {}
  const meta = payload.meta || {}
  const result = {}

  // 1. Inspection meta (date, time, location)
  if (meta && Object.keys(meta).length > 0) {
    const cleanMeta = {}
    if (meta.date) cleanMeta['Fecha'] = meta.date
    if (meta.time) cleanMeta['Hora'] = meta.time
    if (meta.lat) cleanMeta['Latitud'] = meta.lat
    if (meta.lng) cleanMeta['Longitud'] = meta.lng
    if (meta.startedAt) cleanMeta['Inicio'] = formatDate(meta.startedAt)
    if (Object.keys(cleanMeta).length > 0) {
      result['Información de la inspección'] = cleanMeta
    }
  }

  // 2. Site info / form data (the main fields)
  const siteInfo = data.siteInfo || null
  const formData = data.formData || null

  if (siteInfo && Object.keys(siteInfo).length > 0) {
    result['Datos del sitio'] = cleanObject(siteInfo)
  }

  if (formData && Object.keys(formData).length > 0) {
    result['Datos del formulario'] = cleanObject(formData)
  }

  // 3. Form-specific sections

  // Inspection items
  if (data.items && Object.keys(data.items).length > 0) {
    result['Ítems de inspección'] = data.items
  }

  // Checklist data (maintenance)
  if (data.checklistData && Object.keys(data.checklistData).length > 0) {
    result['Checklist'] = data.checklistData
  }

  // Photos references (not the actual images, just markers)
  if (data.photos && Object.keys(data.photos).length > 0) {
    const photoCount = Object.keys(data.photos).filter(k => data.photos[k] && data.photos[k] !== '__photo__' && data.photos[k] !== null).length
    const placeholderCount = Object.keys(data.photos).filter(k => data.photos[k] === '__photo__').length
    result['Fotos en formulario'] = {
      'Total referencias': Object.keys(data.photos).length,
      'Con datos': photoCount,
      'Subidas a storage': placeholderCount,
    }
  }

  // Equipment-specific sections
  if (data.torre) result['Torre (equipos)'] = data.torre
  if (data.piso) result['Piso (clientes)'] = data.piso
  if (data.distribucionTorre) result['Distribución torre'] = cleanObject(data.distribucionTorre)
  if (data.croquisEsquematico) result['Croquis esquemático'] = cleanObject(data.croquisEsquematico)
  if (data.planoPlanta) result['Plano de planta'] = cleanObject(data.planoPlanta)

  // Grounding / Safety - flat section-based structure
  const knownDataKeys = new Set([
    'siteInfo', 'formData', 'items', 'checklistData', 'photos',
    'torre', 'piso', 'distribucionTorre', 'croquisEsquematico', 'planoPlanta',
    'currentStep', 'completedSteps',
  ])

  for (const [key, val] of Object.entries(data)) {
    if (knownDataKeys.has(key) || HIDDEN_DATA_KEYS.has(key)) continue
    if (val && typeof val === 'object' && Object.keys(val).length > 0) {
      result[labelize(key)] = cleanObject(val)
    }
  }

  return result
}

/**
 * Remove image data URLs and __photo__ placeholders from display objects.
 */
function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(cleanObject)

  const cleaned = {}
  for (const [k, v] of Object.entries(obj)) {
    // Skip data URLs (large base64 strings)
    if (typeof v === 'string' && v.startsWith('data:')) {
      cleaned[k] = '📷 (foto capturada)'
      continue
    }
    // Skip empty/null
    if (v === null || v === undefined || v === '') continue
    // Recurse into objects
    if (typeof v === 'object') {
      cleaned[k] = cleanObject(v)
      continue
    }
    cleaned[k] = v
  }
  return cleaned
}

function labelize(key) {
  if (!key) return ''
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
