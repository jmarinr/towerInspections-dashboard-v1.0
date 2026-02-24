/**
 * payloadUtils.js — PTI Admin Panel
 *
 * Extracts, labels, and organizes submission data for display.
 *
 * PAYLOAD NESTING:
 *   submission.payload.payload.data.{formData|checklistData|siteInfo|datos|...}
 *
 * PHOTO ASSET_TYPE PATTERNS (in submission_assets table):
 *   Maintenance:  "maintenance:{itemId}:{photo|before|after}"
 *   Inspection:   "inspection:{itemId}:{photo|before|after}"
 *   Equipment:    "equipment:{field}"
 *   PM Executed:  "executed:{activityId}:{before|after}"
 *   Grounding:    "{fieldId}"          ← NO prefix! e.g. "fotoPataTorre"
 *   Safety:       "{fieldId}"          ← NO prefix! e.g. "fotoEscalera"
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
  const si = data.siteInfo || {}; const fd = data.formData || {}; const dt = data.datos || {}
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
  return { date: meta.date || null, time: meta.time || null, startedAt: meta.startedAt || null, finishedAt: meta.finishedAt || null, lat: meta.lat || null, lng: meta.lng || null }
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
  if (typeof val === 'string' && val === 'blob:null') return null
  return val
}

function labelize(key) {
  if (!key) return ''
  return String(key).replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim().replace(/^\w/, c => c.toUpperCase())
}

/** Read fields from config [{id, label, type}] into { label: value } */
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
// LOOKUP MAPS
// ═══════════════════════════════════════════

// Maintenance checklist: itemId → { name, stepTitle, stepIcon }
const MAINT_CHECKLIST_MAP = (() => {
  const map = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'checklist' && step.items) {
      for (const item of step.items) {
        map[item.id] = { name: item.name, stepTitle: step.title, stepIcon: step.icon || '📋' }
      }
    }
  }
  return map
})()

// Inspection items: itemId → { text, sectionTitle, sectionIcon }
const INSPECTION_ITEM_MAP = (() => {
  const map = {}
  for (const section of inspectionSections) {
    if (section.items) {
      for (const item of section.items) {
        map[item.id] = { text: item.text, sectionTitle: section.title, sectionIcon: section.icon || '📋' }
      }
    }
  }
  return map
})()

// PM Executed: activityId → { name, group, photoLabel }
const PM_EXECUTED_MAP = {}
for (const act of PM_EXECUTED_ACTIVITIES) {
  PM_EXECUTED_MAP[act.id] = { name: act.name, group: act.group, photoLabel: act.photoLabel }
}

// Grounding: fieldId → { label, sectionTitle }
const GROUNDING_FIELD_MAP = {}
for (const section of groundingSystemTestConfig.sections) {
  for (const f of section.fields) {
    GROUNDING_FIELD_MAP[f.id] = { label: f.label, sectionTitle: section.title, type: f.type }
  }
}

// Safety: fieldId → { label, sectionTitle }
const SAFETY_FIELD_MAP = {}
for (const [sectionId, fields] of Object.entries(safetySectionFields)) {
  const sec = safetyClimbingSections.find(s => s.id === sectionId)
  const title = sec?.title || labelize(sectionId)
  for (const f of fields) {
    SAFETY_FIELD_MAP[f.id] = { label: f.label, sectionTitle: title, type: f.type }
  }
}

// All grounding photo fieldIds (for matching unprefixed asset types)
const GROUNDING_PHOTO_IDS = new Set(
  groundingSystemTestConfig.sections
    .flatMap(s => s.fields)
    .filter(f => f.type === 'photo')
    .map(f => f.id)
)

// All safety photo fieldIds
const SAFETY_PHOTO_IDS = new Set(
  Object.values(safetySectionFields)
    .flat()
    .filter(f => f.type === 'photo')
    .map(f => f.id)
)


// ═══════════════════════════════════════════
// BUILDER 1: Mantenimiento Preventivo
// ═══════════════════════════════════════════

function buildMaintenancePayload(data) {
  const result = {}
  const formData = data.formData || {}
  const checklistData = data.checklistData || {}

  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'form') {
      const fields = extractFieldsFromConfig(step.fields, formData)
      if (Object.keys(fields).length > 0) result[`${step.icon || '📋'} ${step.title}`] = fields
    } else if (step.type === 'checklist') {
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
      if (items.length > 0) result[`${step.icon || '📋'} ${step.title}`] = items
    }
  }
  return result
}


// ═══════════════════════════════════════════
// BUILDER 2: Inspección General
// ═══════════════════════════════════════════

function buildInspectionPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}
  const items = data.items || {}

  const siteLabels = {
    proveedor: 'Proveedor', idSitio: 'ID del Sitio', nombreSitio: 'Nombre del Sitio',
    tipoSitio: 'Tipo de Sitio', coordenadas: 'Coordenadas GPS', direccion: 'Dirección',
    fecha: 'Fecha', hora: 'Hora', tipoTorre: 'Tipo de Torre', alturaTorre: 'Altura de la Torre (m)',
  }
  const sf = {}
  for (const [k, label] of Object.entries(siteLabels)) {
    const v = cleanVal(siteInfo[k])
    if (v !== null) sf[label] = v
  }
  if (Object.keys(sf).length) result['📋 Información del Sitio'] = sf

  for (const section of inspectionSections) {
    if (!section.items) continue
    const rows = section.items.map(item => {
      const e = items[item.id] || {}
      const row = { '#': item.id, 'Pregunta': item.text, 'Estado': statusLabel(e.status) }
      if (e.observation) row['Observación'] = e.observation
      return row
    })
    if (rows.length) result[`${section.icon || '📋'} ${section.title}`] = rows
  }
  return result
}


// ═══════════════════════════════════════════
// BUILDER 3: Puesta a Tierra (5 sections, config-based labels)
// ═══════════════════════════════════════════

function buildGroundingPayload(data) {
  const result = {}
  for (const section of groundingSystemTestConfig.sections) {
    const sectionData = data[section.id] || {}
    const fields = extractFieldsFromConfig(section.fields, sectionData)
    if (Object.keys(fields).length) result[`⚡ ${section.title}`] = fields
  }
  return result
}


// ═══════════════════════════════════════════
// BUILDER 4: Sistema de Ascenso (6 sections, config-based labels)
// ═══════════════════════════════════════════

function buildSafetyClimbingPayload(data) {
  const result = {}
  for (const section of safetyClimbingSections) {
    const sectionData = data[section.id] || {}
    const fields = safetySectionFields[section.id] || []
    const extracted = extractFieldsFromConfig(fields, sectionData)
    // Status fields → pill-friendly labels
    for (const f of fields) {
      if (f.type === 'status' && sectionData[f.id]) {
        extracted[f.label] = statusLabel(sectionData[f.id])
      }
    }
    if (Object.keys(extracted).length) result[`🧗 ${section.title}`] = extracted
  }
  return result
}


// ═══════════════════════════════════════════
// BUILDER 5: Inventario de Equipos
// ═══════════════════════════════════════════

function buildEquipmentPayload(data) {
  const result = {}
  const si = data.siteInfo || {}

  const siteLabels = {
    proveedor: 'Proveedor', tipoVisita: 'Tipo de Visita', idSitio: 'ID del Sitio',
    nombreSitio: 'Nombre del Sitio', fechaInicio: 'Fecha de Inicio', direccion: 'Dirección',
    alturaMts: 'Altura (m)', tipoSitio: 'Tipo de Sitio', tipoEstructura: 'Tipo de Estructura',
    latitud: 'Latitud', longitud: 'Longitud',
  }
  const sf = {}
  for (const [k, label] of Object.entries(siteLabels)) {
    const v = cleanVal(si[k])
    if (v !== null) sf[label] = v
  }
  if (Object.keys(sf).length) result['🧾 Datos del Sitio'] = sf

  // Torre items
  const torreItems = (data.torre?.items || []).filter(i => Object.values(i).some(v => v !== '' && v != null))
  if (torreItems.length) {
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

  // Piso clients + cabinets
  const clientes = (data.piso?.clientes || []).filter(c => c.nombreCliente || c.areaArrendada || c.areaEnUso)
  for (const [i, c] of clientes.entries()) {
    const cf = {}
    if (c.tipoCliente) cf['Tipo'] = c.tipoCliente === 'ancla' ? 'Ancla' : 'Colocación'
    if (c.nombreCliente) cf['Nombre'] = c.nombreCliente
    if (c.areaArrendada) cf['Área Arrendada'] = c.areaArrendada
    if (c.areaEnUso) cf['Área en Uso'] = c.areaEnUso
    if (c.placaEquipos) cf['Placa/Equipos'] = c.placaEquipos
    result[`🏢 Cliente ${i + 1}: ${c.nombreCliente || 'Sin nombre'}`] = cf

    const gabs = (c.gabinetes || []).filter(g => g.gabinete || g.largo || g.ancho || g.alto)
    if (gabs.length) {
      result[`📦 Gabinetes — ${c.nombreCliente || `Cliente ${i + 1}`}`] = gabs.map((g, gi) => ({
        '#': gi + 1, 'Gabinete': g.gabinete || '—', 'Largo': g.largo || '—', 'Ancho': g.ancho || '—', 'Alto': g.alto || '—',
      }))
    }
  }
  return result
}


// ═══════════════════════════════════════════
// BUILDER 6: Mantenimiento Ejecutado (siteInfo + 32 activities)
// ═══════════════════════════════════════════

function buildPMExecutedPayload(data) {
  const result = {}
  const si = data.siteInfo || {}
  const photos = data.photos || {}

  const siteLabels = {
    proveedor: 'Proveedor', idSitio: 'ID del Sitio', tipoVisita: 'Tipo de Visita',
    nombreSitio: 'Nombre del Sitio', tipoSitio: 'Tipo de Sitio', fecha: 'Fecha',
    hora: 'Hora', coordenadas: 'Coordenadas GPS', direccion: 'Dirección',
  }
  const sf = {}
  for (const [k, label] of Object.entries(siteLabels)) {
    const v = cleanVal(si[k])
    if (v !== null) sf[label] = v
  }
  if (Object.keys(sf).length) result['📋 Datos del Sitio'] = sf

  // Activities grouped by category
  const groups = groupActivities()
  for (const group of groups) {
    const items = group.items.map(act => {
      const beforeKey = `${act.id}-before`
      const afterKey = `${act.id}-after`
      const executed = photos[beforeKey] || photos[afterKey]
      return {
        '#': act.item,
        'Actividad': act.name,
        'Referencia': act.photoLabel,
        'Estado': executed ? '✅ Ejecutada' : '⏳ Pendiente',
      }
    })
    if (items.length) result[`🔧 ${group.name}`] = items
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

  // Meta
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

  // Route to builder
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
    formResult = buildGenericPayload(data)
  }

  Object.assign(result, formResult)
  return result
}

function buildGenericPayload(data) {
  const result = {}
  const skip = new Set(['currentStep', 'completedSteps', 'photos'])
  for (const [key, val] of Object.entries(data)) {
    if (skip.has(key)) continue
    if (!val || typeof val !== 'object') {
      const c = cleanVal(val)
      if (c !== null) {
        if (!result['📋 Datos']) result['📋 Datos'] = {}
        result['📋 Datos'][labelize(key)] = c
      }
      continue
    }
    if (Array.isArray(val)) { if (val.length) result[labelize(key)] = val; continue }
    const fields = {}
    for (const [k, v] of Object.entries(val)) {
      const c = cleanVal(v)
      if (c !== null) fields[labelize(k)] = c
    }
    if (Object.keys(fields).length) result[labelize(key)] = fields
  }
  return result
}


// ═══════════════════════════════════════════
// PHOTO MAPPING: submission_assets → sections
//
// CRITICAL: Different forms use different asset_type patterns.
// Grounding & Safety use raw fieldId WITHOUT prefix.
// All others use "prefix:itemId:photoType" format.
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
        sectionTitle = '🗼 Información de la Torre'; label = 'Foto de la Torre'
      } else if (itemId === 'fotoCandado') {
        sectionTitle = '🔑 Acceso al Sitio'; label = 'Foto del Candado'
      } else if (itemId === 'firmaProveedor') {
        sectionTitle = '📝 Cierre'; label = 'Firma del Proveedor'
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
      const photoType = parts[2] || 'photo'
      const info = INSPECTION_ITEM_MAP[itemId]
      if (info) {
        sectionTitle = `${info.sectionIcon} ${info.sectionTitle}`
        label = `${info.text} (${photoType === 'before' ? 'Antes' : photoType === 'after' ? 'Después' : 'Foto'})`
      } else {
        label = `Ítem ${itemId}`
      }

    // ── Mantenimiento Ejecutado ──
    } else if (fc.includes('executed') || fc.includes('mantenimiento-ejecutado')) {
      const actId = parts[1] || ''
      const photoType = parts[2] || ''
      const info = PM_EXECUTED_MAP[actId]
      if (info) {
        sectionTitle = `🔧 ${info.group}`
        label = `${info.photoLabel} (${photoType === 'before' ? 'Antes' : 'Después'})`
      } else {
        sectionTitle = '📷 Fotos de actividades'
        label = `${actId} — ${photoType === 'before' ? 'Antes' : 'Después'}`
      }

    // ── Inventario de Equipos ──
    } else if (fc.includes('equipment') || fc.includes('inventario')) {
      const field = parts[1] || ''
      const labels = { fotoTorre: 'Foto de la Torre', croquisEsquematico: 'Croquis Esquemático', planoPlanta: 'Plano de Planta' }
      sectionTitle = '📐 Documentación del Sitio'
      label = labels[field] || labelize(field)

    // ── Puesta a Tierra ──
    // Photos have NO prefix — asset_type is the raw fieldId like "fotoPataTorre"
    } else if (fc.includes('grounding') || fc.includes('puesta-tierra')) {
      if (GROUNDING_PHOTO_IDS.has(type)) {
        const info = GROUNDING_FIELD_MAP[type]
        sectionTitle = `⚡ ${info?.sectionTitle || 'Evidencia Fotográfica'}`
        label = info?.label || labelize(type)
      } else if (GROUNDING_PHOTO_IDS.has(parts[1])) {
        // Fallback: maybe has a prefix like "grounding:fotoPataTorre"
        const info = GROUNDING_FIELD_MAP[parts[1]]
        sectionTitle = `⚡ ${info?.sectionTitle || 'Evidencia Fotográfica'}`
        label = info?.label || labelize(parts[1])
      } else {
        label = labelize(type)
      }

    // ── Sistema de Ascenso ──
    // Photos have NO prefix — asset_type is the raw fieldId like "fotoEscalera"
    } else if (fc.includes('safety') || fc.includes('sistema-ascenso')) {
      if (SAFETY_PHOTO_IDS.has(type)) {
        const info = SAFETY_FIELD_MAP[type]
        sectionTitle = `🧗 ${info?.sectionTitle || 'Evidencia'}`
        label = info?.label || labelize(type)
      } else if (SAFETY_PHOTO_IDS.has(parts[1])) {
        const info = SAFETY_FIELD_MAP[parts[1]]
        sectionTitle = `🧗 ${info?.sectionTitle || 'Evidencia'}`
        label = info?.label || labelize(parts[1])
      } else {
        label = labelize(type)
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
