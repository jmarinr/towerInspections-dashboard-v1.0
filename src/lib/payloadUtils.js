/**
 * Smart extraction for PTI Inspect submissions stored in Supabase.
 *
 * !! CRITICAL: The actual column `payload` in Supabase contains a NESTED structure:
 *
 *   submission.payload = {
 *     org_code, device_id, form_code, app_version, form_version,
 *     _meta: { last_saved_at },
 *     payload: {                         ← INNER payload
 *       meta: { lat, lng, date, time, startedAt },
 *       autosave_bucket: "preventive-maintenance",
 *       data: {                          ← form snapshot
 *         formData: {...},
 *         checklistData: {...},
 *         photos: {...},
 *         ...
 *       },
 *       validation, profile,
 *       submitted_at, submitted_by: { name, role, username }
 *     }
 *   }
 *
 * So to get formData we need: submission.payload.payload.data.formData
 */

import { maintenanceFormConfig } from '../data/maintenanceFormConfig'
import { inspectionSections } from '../data/inspectionItems'

// ===== RESOLVE INNER DATA =====
// The "inner payload" is at submission.payload.payload (yes, nested)
// The form data is at inner.data
function resolveInner(submission) {
  const outer = submission?.payload || {}
  // Check for the nested payload.payload structure
  const inner = outer.payload || outer
  const data = inner.data || {}
  const meta = inner.meta || {}
  return { outer, inner, data, meta }
}

// ===== STATUS LABELS =====
const STATUS_LABELS = {
  bueno: '✅ Bueno',
  regular: '⚠️ Regular',
  malo: '❌ Malo',
  na: '➖ N/A',
  '': '—',
}
function statusLabel(val) {
  return STATUS_LABELS[val] || val || '—'
}

// ===== EXTRACT SITE INFO =====
export function extractSiteInfo(submission) {
  const { data } = resolveInner(submission)
  const siteInfo = data.siteInfo || {}
  const formData = data.formData || {}
  const datosSection = data.datos || {}

  return {
    nombreSitio: siteInfo.nombreSitio || formData.nombreSitio || datosSection.nombreSitio || '—',
    idSitio: siteInfo.idSitio || formData.idSitio || datosSection.idSitio || '—',
    proveedor: siteInfo.proveedor || formData.proveedor || datosSection.proveedor || '—',
    tipoSitio: siteInfo.tipoSitio || formData.tipoSitio || datosSection.tipoSitio || '',
    coordenadas: siteInfo.coordenadas || formData.coordenadas || '',
    direccion: siteInfo.direccion || formData.direccion || datosSection.direccion || '',
  }
}

// ===== EXTRACT META =====
export function extractMeta(submission) {
  const { meta } = resolveInner(submission)
  return {
    date: meta.date || null,
    time: meta.time || null,
    startedAt: meta.startedAt || null,
    lat: meta.lat || null,
    lng: meta.lng || null,
  }
}

// ===== EXTRACT SUBMITTED BY =====
export function extractSubmittedBy(submission) {
  const { inner } = resolveInner(submission)
  return inner.submitted_by || null
}

// ===== BUILD LABEL MAPS =====
function buildMaintenanceChecklistMap() {
  const map = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'checklist' && step.items) {
      for (const item of step.items) {
        map[item.id] = {
          name: item.name,
          description: item.description,
          stepTitle: step.title,
          stepIcon: step.icon || '📋',
          hasValueInput: item.hasValueInput || false,
          valueLabel: item.valueLabel || '',
        }
      }
    }
  }
  return map
}

function buildInspectionItemMap() {
  const map = {}
  for (const section of inspectionSections) {
    if (section.items) {
      for (const item of section.items) {
        map[item.id] = {
          text: item.text,
          sectionTitle: section.title,
          sectionIcon: section.icon || '📋',
        }
      }
    }
  }
  return map
}

const MAINT_CHECKLIST_MAP = buildMaintenanceChecklistMap()
const INSPECTION_ITEM_MAP = buildInspectionItemMap()

// ===== CLEAN VALUE =====
function cleanVal(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'string' && val.startsWith('data:')) return '📷 Foto capturada'
  if (val === '__photo__') return '📷 Foto subida'
  return val
}

// ===== MAINTENANCE BUILDER =====
function buildMaintenancePayload(data) {
  const result = {}
  const formData = data.formData || {}
  const checklistData = data.checklistData || {}
  const photos = data.photos || {}

  // 1. Form fields organized by step
  for (const step of maintenanceFormConfig.steps) {
    if (step.type !== 'form') continue
    const sectionFields = {}
    let hasData = false
    for (const f of step.fields) {
      const val = cleanVal(formData[f.id])
      if (val === null) continue
      sectionFields[f.label] = val
      hasData = true
    }
    if (hasData) {
      result[`${step.icon || '📋'} ${step.title}`] = sectionFields
    }
  }

  // 2. Checklist items organized by step
  for (const step of maintenanceFormConfig.steps) {
    if (step.type !== 'checklist') continue
    const items = []
    let hasAnyData = false

    for (const item of step.items) {
      const entry = checklistData[item.id]
      if (entry && (entry.status || entry.value || entry.observation)) {
        hasAnyData = true
        const row = {
          '#': item.id,
          'Ítem': item.name,
          'Estado': statusLabel(entry.status),
        }
        if (entry.value) row['Valor'] = entry.value
        if (entry.observation) row['Observación'] = entry.observation
        items.push(row)
      } else {
        items.push({
          '#': item.id,
          'Ítem': item.name,
          'Estado': '⏳ Pendiente',
        })
      }
    }

    if (items.length > 0) {
      result[`${step.icon || '📋'} ${step.title}`] = items
    }
  }

  // 3. Photo summary
  const photoKeys = Object.keys(photos).filter(k => photos[k] && photos[k] !== null)
  if (photoKeys.length > 0) {
    result['📷 Fotos capturadas en formulario'] = {
      'Total fotos': photoKeys.length,
      'Subidas a storage': photoKeys.filter(k => photos[k] === '__photo__').length,
    }
  }

  return result
}

// ===== INSPECTION BUILDER =====
function buildInspectionPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}
  const items = data.items || {}
  const photos = data.photos || {}

  // Site info
  const siteLabels = {
    proveedor: 'Proveedor', idSitio: 'ID Sitio', nombreSitio: 'Nombre Sitio',
    tipoSitio: 'Tipo de Sitio', coordenadas: 'Coordenadas GPS', direccion: 'Dirección',
    fecha: 'Fecha', hora: 'Hora', tipoTorre: 'Tipo de Torre', alturaTorre: 'Altura Torre (m)',
  }
  const siteFields = {}
  for (const [key, label] of Object.entries(siteLabels)) {
    if (siteInfo[key]) siteFields[label] = siteInfo[key]
  }
  if (Object.keys(siteFields).length > 0) result['📋 Información del sitio'] = siteFields

  // Items by section
  for (const section of inspectionSections) {
    if (!section.items) continue
    const sectionItems = []
    for (const item of section.items) {
      const entry = items[item.id] || {}
      sectionItems.push({
        '#': item.id,
        'Pregunta': item.text,
        'Estado': statusLabel(entry.status),
        ...(entry.observation ? { 'Observación': entry.observation } : {}),
      })
    }
    if (sectionItems.length > 0) {
      result[`${section.icon || '📋'} ${section.title}`] = sectionItems
    }
  }

  const photoKeys = Object.keys(photos).filter(k => photos[k])
  if (photoKeys.length > 0) result['📷 Fotos'] = { 'Total': photoKeys.length }

  return result
}

// ===== FLAT SECTION BUILDER (grounding, safety) =====
function buildFlatSectionPayload(data) {
  const result = {}
  const skipKeys = new Set(['currentStep', 'completedSteps'])

  for (const [sectionId, sectionData] of Object.entries(data)) {
    if (skipKeys.has(sectionId)) continue
    if (!sectionData || typeof sectionData !== 'object') continue

    const fields = {}
    for (const [key, val] of Object.entries(sectionData)) {
      const clean = cleanVal(val)
      if (clean !== null) fields[labelize(key)] = clean
    }
    if (Object.keys(fields).length > 0) {
      result[labelize(sectionId)] = fields
    }
  }

  return result
}

// ===== EQUIPMENT BUILDER =====
function buildEquipmentPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}

  const siteFields = {}
  for (const [k, v] of Object.entries(siteInfo)) {
    const clean = cleanVal(v)
    if (clean !== null) siteFields[labelize(k)] = clean
  }
  if (Object.keys(siteFields).length > 0) result['📋 Datos del sitio'] = siteFields

  if (data.torre?.items?.length > 0) {
    result['🗼 Equipos en torre'] = data.torre.items.filter(i => Object.values(i).some(v => v !== ''))
  }
  if (data.piso?.clientes?.length > 0) {
    result['🏗️ Clientes en piso'] = data.piso.clientes.map((c, i) => ({
      '#': i + 1,
      Tipo: c.tipoCliente,
      ...(c.nombreCliente ? { Cliente: c.nombreCliente } : {}),
    }))
  }

  return result
}

// ===== PM EXECUTED BUILDER =====
function buildPMExecutedPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}

  const siteFields = {}
  for (const [k, v] of Object.entries(siteInfo)) {
    const clean = cleanVal(v)
    if (clean !== null) siteFields[labelize(k)] = clean
  }
  if (Object.keys(siteFields).length > 0) result['📋 Datos del sitio'] = siteFields

  return result
}

// ===== MAIN EXPORT =====
export function getCleanPayload(submission) {
  const { inner, data, meta } = resolveInner(submission)
  const outer = submission?.payload || {}

  // Determine form code — check multiple locations
  const formCode = outer.form_code || inner.autosave_bucket || submission?.form_code || ''

  const result = {}

  // Meta
  if (meta && Object.keys(meta).some(k => meta[k])) {
    const m = {}
    if (meta.date) m['Fecha'] = meta.date
    if (meta.time) m['Hora'] = meta.time
    if (meta.startedAt) m['Inicio'] = new Date(meta.startedAt).toLocaleString()
    if (meta.lat) m['GPS'] = `${Number(meta.lat).toFixed(5)}, ${Number(meta.lng).toFixed(5)}`
    if (Object.keys(m).length) result['📍 Inicio de inspección'] = m
  }

  // Submitted by
  const submitter = inner.submitted_by
  if (submitter) {
    result['👤 Enviado por'] = {
      Nombre: submitter.name || '—',
      Rol: submitter.role || '—',
      Usuario: submitter.username || '—',
      ...(inner.submitted_at ? { 'Fecha envío': new Date(inner.submitted_at).toLocaleString() } : {}),
    }
  }

  // Form-specific
  const fc = formCode.toLowerCase()
  const isMantenimiento = fc.includes('preventive-maintenance') || fc === 'mantenimiento'
  const isInspeccion = fc.includes('inspection') || fc === 'inspeccion'
  const isEquipment = fc.includes('equipment') || fc === 'inventario'
  const isExecuted = fc.includes('executed') || fc === 'mantenimiento-ejecutado'
  const isGrounding = fc.includes('grounding') || fc === 'puesta-tierra'
  const isSafety = fc.includes('safety')

  let formResult = {}

  if (isMantenimiento && (data.formData || data.checklistData)) {
    formResult = buildMaintenancePayload(data)
  } else if (isInspeccion && (data.siteInfo || data.items)) {
    formResult = buildInspectionPayload(data)
  } else if (isEquipment) {
    formResult = buildEquipmentPayload(data)
  } else if (isExecuted) {
    formResult = buildPMExecutedPayload(data)
  } else if (isGrounding || isSafety) {
    formResult = buildFlatSectionPayload(data)
  } else {
    // Generic fallback
    formResult = buildFlatSectionPayload(data)
  }

  Object.assign(result, formResult)
  return result
}

// ===== HELPERS =====
function labelize(key) {
  if (!key) return ''
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/^\w/, c => c.toUpperCase())
}
