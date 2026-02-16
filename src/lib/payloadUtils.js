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
 *       data: {                          ← form snapshot (varies per form)
 *         formData: {...},    // maintenance
 *         checklistData: {},  // maintenance
 *         siteInfo: {...},    // inspection, equipment, pmExecuted
 *         items: {...},       // inspection
 *         datos: {...},       // grounding, safety
 *         ...
 *       },
 *       submitted_at, submitted_by: { name, role, username }
 *     }
 *   }
 */

import { maintenanceFormConfig } from '../data/maintenanceFormConfig'
import { inspectionSections } from '../data/inspectionItems'
import { groundingSystemTestConfig } from '../data/groundingSystemTestConfig'
import { safetyClimbingSections, safetySectionFields } from '../data/safetyClimbingDeviceConfig'
import { PM_EXECUTED_ACTIVITIES, groupActivities } from '../data/preventiveMaintenanceExecutedConfig'

// ═══════════════════════════════════════════
// CORE: Navigate nested payload
// ═══════════════════════════════════════════

function resolveInner(submission) {
  const outer = submission?.payload || {}
  const inner = outer.payload || outer
  const data = inner.data || {}
  const meta = inner.meta || {}
  return { outer, inner, data, meta }
}

// ═══════════════════════════════════════════
// EXPORTS: Extractors
// ═══════════════════════════════════════════

export function extractSiteInfo(submission) {
  const { data } = resolveInner(submission)
  const si = data.siteInfo || {}
  const fd = data.formData || {}
  const dt = data.datos || {}
  return {
    nombreSitio: si.nombreSitio || fd.nombreSitio || dt.nombreSitio || '—',
    idSitio: si.idSitio || fd.idSitio || dt.idSitio || '—',
    proveedor: si.proveedor || fd.proveedor || dt.proveedor || '—',
    tipoSitio: si.tipoSitio || fd.tipoSitio || dt.tipoSitio || '',
    coordenadas: si.coordenadas || fd.coordenadas || '',
    direccion: si.direccion || fd.direccion || dt.direccion || '',
  }
}

export function extractMeta(submission) {
  const { meta } = resolveInner(submission)
  return { date: meta.date || null, time: meta.time || null, startedAt: meta.startedAt || null, lat: meta.lat || null, lng: meta.lng || null }
}

export function extractSubmittedBy(submission) {
  const { inner } = resolveInner(submission)
  return inner.submitted_by || null
}

export function isFinalized(submission) {
  const { inner } = resolveInner(submission)
  return inner.finalized === true
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const STATUS_LABELS = { bueno: '✅ Bueno', regular: '⚠️ Regular', malo: '❌ Malo', na: '➖ N/A', '': '—' }
function statusLabel(val) { return STATUS_LABELS[val] || val || '—' }

function cleanVal(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'string' && val.startsWith('data:')) return null
  if (typeof val === 'string' && val.startsWith('__photo')) return null
  return val
}

function labelize(key) {
  if (!key) return ''
  return String(key).replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim().replace(/^\w/, c => c.toUpperCase())
}

/**
 * Reads fields from a config array [{id, label, type}] and extracts values from a data object.
 * Skips photo fields (those are shown via submission_assets).
 */
function extractFieldsFromConfig(fields, dataObj) {
  if (!fields || !dataObj) return {}
  const out = {}
  for (const f of fields) {
    if (f.type === 'photo' || f.type === 'signature') continue
    const val = cleanVal(dataObj[f.id])
    if (val !== null) out[f.label] = val
  }
  return out
}

// ═══════════════════════════════════════════
// LOOKUP MAPS (for photo → section mapping)
// ═══════════════════════════════════════════

function buildMaintenanceChecklistMap() {
  const map = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'checklist' && step.items) {
      for (const item of step.items) {
        map[item.id] = { name: item.name, stepTitle: step.title, stepIcon: step.icon || '📋' }
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
        map[item.id] = { text: item.text, sectionTitle: section.title, sectionIcon: section.icon || '📋' }
      }
    }
  }
  return map
}

const MAINT_CHECKLIST_MAP = buildMaintenanceChecklistMap()
const INSPECTION_ITEM_MAP = buildInspectionItemMap()

// Build PM_EXECUTED lookup: activityId → { name, group, photoLabel }
const PM_EXECUTED_MAP = {}
for (const act of PM_EXECUTED_ACTIVITIES) {
  PM_EXECUTED_MAP[act.id] = { name: act.name, group: act.group, photoLabel: act.photoLabel }
}

// Build grounding field lookup: fieldId → label
const GROUNDING_FIELD_MAP = {}
for (const section of groundingSystemTestConfig.sections) {
  for (const f of section.fields) {
    GROUNDING_FIELD_MAP[f.id] = { label: f.label, section: section.title, type: f.type }
  }
}

// Build safety field lookup: fieldId → { label, section }
const SAFETY_FIELD_MAP = {}
for (const [sectionId, fields] of Object.entries(safetySectionFields)) {
  const sectionMeta = safetyClimbingSections.find(s => s.id === sectionId)
  const sectionTitle = sectionMeta?.title || labelize(sectionId)
  for (const f of fields) {
    SAFETY_FIELD_MAP[f.id] = { label: f.label, section: sectionTitle, type: f.type }
  }
}


// ═══════════════════════════════════════════
// BUILDER: Mantenimiento Preventivo (45 fields + 92 checklist)
// ═══════════════════════════════════════════

function buildMaintenancePayload(data) {
  const result = {}
  const formData = data.formData || {}
  const checklistData = data.checklistData || {}

  // Form fields by step (uses config labels)
  for (const step of maintenanceFormConfig.steps) {
    if (step.type !== 'form') continue
    const fields = extractFieldsFromConfig(step.fields, formData)
    if (Object.keys(fields).length > 0) {
      result[`${step.icon || '📋'} ${step.title}`] = fields
    }
  }

  // Checklist items by step
  for (const step of maintenanceFormConfig.steps) {
    if (step.type !== 'checklist') continue
    const items = []
    for (const item of step.items) {
      const entry = checklistData[item.id]
      if (entry && (entry.status || entry.value || entry.observation)) {
        const row = { '#': item.id, 'Ítem': item.name, 'Estado': statusLabel(entry.status) }
        if (entry.value) row['Valor'] = entry.value
        if (entry.observation) row['Observación'] = entry.observation
        items.push(row)
      } else {
        items.push({ '#': item.id, 'Ítem': item.name, 'Estado': '⏳ Pendiente' })
      }
    }
    if (items.length > 0) {
      result[`${step.icon || '📋'} ${step.title}`] = items
    }
  }

  return result
}


// ═══════════════════════════════════════════
// BUILDER: Inspección General (siteInfo + 32 items)
// ═══════════════════════════════════════════

function buildInspectionPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}
  const items = data.items || {}

  // Site info with human labels
  const siteLabels = {
    proveedor: 'Proveedor', idSitio: 'ID del Sitio', nombreSitio: 'Nombre del Sitio',
    tipoSitio: 'Tipo de Sitio', coordenadas: 'Coordenadas GPS', direccion: 'Dirección',
    fecha: 'Fecha', hora: 'Hora', tipoTorre: 'Tipo de Torre', alturaTorre: 'Altura de la Torre (m)',
  }
  const siteFields = {}
  for (const [key, label] of Object.entries(siteLabels)) {
    const val = cleanVal(siteInfo[key])
    if (val !== null) siteFields[label] = val
  }
  if (Object.keys(siteFields).length > 0) result['📋 Información del Sitio'] = siteFields

  // Items by section (uses config labels)
  for (const section of inspectionSections) {
    if (!section.items) continue
    const sectionItems = []
    for (const item of section.items) {
      const entry = items[item.id] || {}
      const row = { '#': item.id, 'Pregunta': item.text, 'Estado': statusLabel(entry.status) }
      if (entry.observation) row['Observación'] = entry.observation
      sectionItems.push(row)
    }
    if (sectionItems.length > 0) {
      result[`${section.icon || '📋'} ${section.title}`] = sectionItems
    }
  }

  return result
}


// ═══════════════════════════════════════════
// BUILDER: Puesta a Tierra (35 fields in 5 sections)
// ═══════════════════════════════════════════

function buildGroundingPayload(data) {
  const result = {}

  for (const section of groundingSystemTestConfig.sections) {
    const sectionData = data[section.id] || {}
    const fields = extractFieldsFromConfig(section.fields, sectionData)
    if (Object.keys(fields).length > 0) {
      result[`⚡ ${section.title}`] = fields
    }
  }

  return result
}


// ═══════════════════════════════════════════
// BUILDER: Sistema de Ascenso (38 fields in 6 sections)
// ═══════════════════════════════════════════

function buildSafetyClimbingPayload(data) {
  const result = {}

  for (const section of safetyClimbingSections) {
    const sectionData = data[section.id] || {}
    const fields = safetySectionFields[section.id] || []
    const extracted = extractFieldsFromConfig(fields, sectionData)

    // For status fields, convert to status labels
    for (const f of fields) {
      if (f.type === 'status' && sectionData[f.id]) {
        extracted[f.label] = statusLabel(sectionData[f.id])
      }
    }

    if (Object.keys(extracted).length > 0) {
      result[`🧗 ${section.title}`] = extracted
    }
  }

  return result
}


// ═══════════════════════════════════════════
// BUILDER: Inventario de Equipos (site + torre table + piso clients + drawings)
// ═══════════════════════════════════════════

function buildEquipmentPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}

  // Site info with proper labels
  const siteLabels = {
    proveedor: 'Proveedor', tipoVisita: 'Tipo de Visita', idSitio: 'ID del Sitio',
    nombreSitio: 'Nombre del Sitio', fechaInicio: 'Fecha de Inicio', direccion: 'Dirección',
    alturaMts: 'Altura (m)', tipoSitio: 'Tipo de Sitio', tipoEstructura: 'Tipo de Estructura',
    latitud: 'Latitud', longitud: 'Longitud',
  }
  const siteFields = {}
  for (const [key, label] of Object.entries(siteLabels)) {
    const val = cleanVal(siteInfo[key])
    if (val !== null) siteFields[label] = val
  }
  if (Object.keys(siteFields).length > 0) result['🧾 Datos del Sitio'] = siteFields

  // Torre items table
  const torreItems = (data.torre?.items || []).filter(i => Object.values(i).some(v => v !== '' && v != null))
  if (torreItems.length > 0) {
    result['🗼 Equipos en Torre'] = torreItems.map((item, idx) => ({
      '#': idx + 1,
      'Altura (m)': item.alturaMts || '—',
      'Orientación': item.orientacion || '—',
      'Tipo de Equipo': item.tipoEquipo || '—',
      'Cantidad': item.cantidad || '—',
      'Dimensiones (m)': item.dimensionesMts || '—',
      'Área (m²)': item.areaM2 || '—',
      'Carrier': item.carrier || '—',
    }))
  }

  // Piso: clientes + gabinetes
  const clientes = data.piso?.clientes || []
  const clientesWithData = clientes.filter(c => c.nombreCliente || c.areaArrendada || c.areaEnUso || c.placaEquipos)
  if (clientesWithData.length > 0) {
    for (const [i, cliente] of clientesWithData.entries()) {
      const clienteFields = {}
      if (cliente.tipoCliente) clienteFields['Tipo'] = cliente.tipoCliente === 'ancla' ? 'Ancla' : 'Colocación'
      if (cliente.nombreCliente) clienteFields['Nombre'] = cliente.nombreCliente
      if (cliente.areaArrendada) clienteFields['Área Arrendada'] = cliente.areaArrendada
      if (cliente.areaEnUso) clienteFields['Área en Uso'] = cliente.areaEnUso
      if (cliente.placaEquipos) clienteFields['Placa/Equipos'] = cliente.placaEquipos

      result[`🏢 Cliente ${i + 1}: ${cliente.nombreCliente || 'Sin nombre'}`] = clienteFields

      // Gabinetes for this client
      const gabs = (cliente.gabinetes || []).filter(g => g.gabinete || g.largo || g.ancho || g.alto)
      if (gabs.length > 0) {
        result[`📦 Gabinetes — ${cliente.nombreCliente || `Cliente ${i + 1}`}`] = gabs.map((g, gi) => ({
          '#': gi + 1,
          'Gabinete': g.gabinete || '—',
          'Largo': g.largo || '—',
          'Ancho': g.ancho || '—',
          'Alto': g.alto || '—',
        }))
      }
    }
  }

  // Drawings (distribution, croquis, plano) are shown as photos via submission_assets

  return result
}


// ═══════════════════════════════════════════
// BUILDER: Mantenimiento Ejecutado (siteInfo + 32 activities before/after)
// ═══════════════════════════════════════════

function buildPMExecutedPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}
  const photos = data.photos || {}

  // Site info with labels
  const siteLabels = {
    proveedor: 'Proveedor', idSitio: 'ID del Sitio', tipoVisita: 'Tipo de Visita',
    nombreSitio: 'Nombre del Sitio', tipoSitio: 'Tipo de Sitio', fecha: 'Fecha',
    hora: 'Hora', coordenadas: 'Coordenadas GPS', direccion: 'Dirección',
  }
  const siteFields = {}
  for (const [key, label] of Object.entries(siteLabels)) {
    const val = cleanVal(siteInfo[key])
    if (val !== null) siteFields[label] = val
  }
  if (Object.keys(siteFields).length > 0) result['📋 Datos del Sitio'] = siteFields

  // Activities grouped by category, showing execution status
  const groups = groupActivities()
  for (const group of groups) {
    const items = []
    for (const act of group.items) {
      const hasBefore = photos[`${act.id}-before`] && cleanVal(photos[`${act.id}-before`]) === null
        ? '✅ Sí' : photos[`${act.id}-before`] ? '✅ Sí' : '—'
      const hasAfter = photos[`${act.id}-after`] && cleanVal(photos[`${act.id}-after`]) === null
        ? '✅ Sí' : photos[`${act.id}-after`] ? '✅ Sí' : '—'
      
      // Determine if activity was executed (has at least one photo taken)
      const beforeKey = `${act.id}-before`
      const afterKey = `${act.id}-after`
      const executed = photos[beforeKey] || photos[afterKey]

      items.push({
        '#': act.item,
        'Actividad': act.name,
        'Referencia': act.photoLabel,
        'Estado': executed ? '✅ Ejecutada' : '⏳ Pendiente',
      })
    }
    if (items.length > 0) {
      result[`🔧 ${group.name}`] = items
    }
  }

  return result
}


// ═══════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════

export function getCleanPayload(submission) {
  const { inner, data, meta } = resolveInner(submission)
  const outer = submission?.payload || {}
  const formCode = outer.form_code || inner.autosave_bucket || submission?.form_code || ''

  const result = {}

  // Meta info
  if (meta && Object.keys(meta).some(k => meta[k])) {
    const m = {}
    if (meta.date) m['Fecha'] = meta.date
    if (meta.time) m['Hora'] = meta.time
    if (meta.startedAt) m['Inicio'] = new Date(meta.startedAt).toLocaleString()
    if (meta.finishedAt) m['Finalizado'] = new Date(meta.finishedAt).toLocaleString()
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
      ...(inner.submitted_at ? { 'Fecha de envío': new Date(inner.submitted_at).toLocaleString() } : {}),
    }
  }

  // Route to form-specific builder
  const fc = formCode.toLowerCase()
  let formResult = {}

  if ((fc.includes('preventive-maintenance') || fc === 'mantenimiento') && (data.formData || data.checklistData)) {
    formResult = buildMaintenancePayload(data)
  } else if ((fc.includes('inspection') || fc === 'inspeccion') && (data.siteInfo || data.items)) {
    formResult = buildInspectionPayload(data)
  } else if (fc.includes('grounding') || fc === 'puesta-tierra') {
    formResult = buildGroundingPayload(data)
  } else if (fc.includes('safety') || fc === 'sistema-ascenso') {
    formResult = buildSafetyClimbingPayload(data)
  } else if (fc.includes('equipment') || fc === 'inventario') {
    formResult = buildEquipmentPayload(data)
  } else if (fc.includes('executed') || fc === 'mantenimiento-ejecutado') {
    formResult = buildPMExecutedPayload(data)
  } else {
    // Generic fallback — still uses labelize but better than nothing
    formResult = buildGenericPayload(data)
  }

  Object.assign(result, formResult)
  return result
}

function buildGenericPayload(data) {
  const result = {}
  const skipKeys = new Set(['currentStep', 'completedSteps', 'photos'])
  for (const [key, val] of Object.entries(data)) {
    if (skipKeys.has(key)) continue
    if (!val || typeof val !== 'object') {
      const clean = cleanVal(val)
      if (clean !== null) {
        if (!result['📋 Datos']) result['📋 Datos'] = {}
        result['📋 Datos'][labelize(key)] = clean
      }
      continue
    }
    if (Array.isArray(val)) {
      if (val.length > 0) result[labelize(key)] = val
      continue
    }
    const fields = {}
    for (const [k, v] of Object.entries(val)) {
      const c = cleanVal(v)
      if (c !== null) fields[labelize(k)] = c
    }
    if (Object.keys(fields).length > 0) result[labelize(key)] = fields
  }
  return result
}


// ═══════════════════════════════════════════
// PHOTO MAPPING: Assets → Sections
// ═══════════════════════════════════════════

export function groupAssetsBySection(assets, formCode) {
  if (!assets || !assets.length) return {}

  const groups = {}
  const fc = (formCode || '').toLowerCase()

  for (const asset of assets) {
    if (!asset.public_url) continue
    const type = asset.asset_type || ''
    const parts = type.split(':')

    let sectionTitle = '📷 Otras fotos'
    let label = type

    // ── Mantenimiento Preventivo ──
    if (fc.includes('mantenimiento') || fc.includes('preventive-maintenance')) {
      const itemId = parts[1] || ''
      const photoType = parts[2] || 'photo'

      if (itemId === 'fotoTorre') {
        sectionTitle = '🗼 Información de la Torre'
        label = 'Foto de la Torre'
      } else if (itemId === 'fotoCandado') {
        sectionTitle = '🔑 Acceso al Sitio'
        label = 'Foto del Candado'
      } else {
        const info = MAINT_CHECKLIST_MAP[itemId]
        if (info) {
          sectionTitle = `${info.stepIcon} ${info.stepTitle}`
          label = `${info.name} (${photoType === 'before' ? 'Antes' : photoType === 'after' ? 'Después' : 'Foto'})`
        } else {
          label = `Ítem ${itemId} (${photoType})`
        }
      }

    // ── Inspección General ──
    } else if (fc.includes('inspeccion') || fc.includes('inspection')) {
      const itemId = parts[1] || ''
      const info = INSPECTION_ITEM_MAP[itemId]
      if (info) {
        sectionTitle = `${info.sectionIcon} ${info.sectionTitle}`
        label = info.text
      } else {
        label = `Ítem ${itemId}`
      }

    // ── Mantenimiento Ejecutado ──
    } else if (fc.includes('executed') || fc.includes('mantenimiento-ejecutado')) {
      const actId = parts[1] || ''
      const photoType = parts[2] || ''
      const actInfo = PM_EXECUTED_MAP[actId]
      if (actInfo) {
        sectionTitle = `🔧 ${actInfo.group}`
        label = `${actInfo.name} — ${actInfo.photoLabel} (${photoType === 'before' ? 'Antes' : 'Después'})`
      } else {
        sectionTitle = '📷 Fotos de actividades'
        label = `${actId} — ${photoType === 'before' ? 'Antes' : 'Después'}`
      }

    // ── Inventario de Equipos ──
    } else if (fc.includes('equipment') || fc.includes('inventario')) {
      const field = parts[1] || ''
      const fieldLabels = {
        fotoTorre: 'Foto de la Torre',
        croquisEsquematico: 'Croquis Esquemático',
        planoPlanta: 'Plano de Planta',
      }
      sectionTitle = '📐 Documentación del Sitio'
      label = fieldLabels[field] || labelize(field)

    // ── Puesta a Tierra ──
    } else if (fc.includes('grounding') || fc.includes('puesta-tierra')) {
      const fieldId = parts[1] || ''
      const info = GROUNDING_FIELD_MAP[fieldId]
      if (info) {
        sectionTitle = `⚡ ${info.section}`
        label = info.label
      } else {
        sectionTitle = '⚡ Evidencia Fotográfica'
        label = labelize(fieldId)
      }

    // ── Sistema de Ascenso ──
    } else if (fc.includes('safety') || fc.includes('sistema-ascenso')) {
      const fieldId = parts[1] || ''
      const info = SAFETY_FIELD_MAP[fieldId]
      if (info) {
        sectionTitle = `🧗 ${info.section}`
        label = info.label
      } else {
        sectionTitle = '🧗 Evidencia'
        label = labelize(fieldId)
      }

    // ── Genérico ──
    } else {
      label = parts.slice(1).join(' · ') || type
    }

    if (!groups[sectionTitle]) groups[sectionTitle] = []
    groups[sectionTitle].push({ ...asset, label })
  }

  return groups
}
