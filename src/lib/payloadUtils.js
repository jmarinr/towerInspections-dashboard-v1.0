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
  // Check top-level flag (set by normalizeSubmission)
  if (submission?.finalized === true) return true
  // Dig into payload nesting
  const { inner } = resolveInner(submission)
  // Only trust explicit finalized flag — submitted_at is NOT reliable
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
// Campos que NUNCA son editables desde el panel
export const NEVER_EDIT_FIELDS = new Set([
  'coordenadas', 'gps', 'startedAt', 'finishedAt', 'submitted_at',
  'device_id', 'app_version', 'horaEntrada', 'fecha', 'hora',
  'firmaProveedor', 'alturaTotal', 'sumResistencias', 'rg',
  'idSitio', 'nombreSitio', 'tipoVisita',
  // Meta del sistema
  'lat', 'lng', 'startTime', 'endTime',
])

// Tipo de control a renderizar en el dashboard según tipo del campo en el app
export function resolveControlType(field) {
  if (NEVER_EDIT_FIELDS.has(field.id)) return 'readonly'
  if (field.readOnly) return 'readonly'
  if (field.type === 'calculated') return 'readonly'
  if (field.type === 'signature') return 'readonly'
  if (field.type === 'photo') return 'readonly'
  if (field.type === 'select' || field.type === 'toggle') return 'select'
  if (field.type === 'status') return 'select'
  if (field.type === 'number') return 'number'
  if (field.type === 'textarea') return 'textarea'
  return 'text'
}

// Opciones para campos status
const STATUS_OPTIONS = [
  { value: 'bueno', label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
  { value: 'malo', label: 'Malo' },
  { value: 'na', label: 'N/A' },
]

/**
 * Extrae campos de un config con metadatos completos para edición.
 * Retorna { [fieldId]: { label, value, type, options, readOnly } }
 */
function extractFieldsFromConfig(fields, dataObj) {
  if (!fields || !dataObj) return {}
  const out = {}
  for (const f of fields) {
    if (f.type === 'photo' || f.type === 'signature') continue
    if (f.type === 'calculated') {
      // Campos calculados: solo mostrar, no editar
      let displayVal = null
      if (f.id === 'sumResistencias') {
        const keys = ['rPataTorre','rCerramiento','rPorton','rPararrayos','rBarraSPT','rEscalerilla1','rEscalerilla2']
        const sum = keys.reduce((s, k) => s + (parseFloat(dataObj[k]) || 0), 0)
        displayVal = sum.toFixed(4) + ' Ohm'
      } else if (f.id === 'rg') {
        const keys = ['rPataTorre','rCerramiento','rPorton','rPararrayos','rBarraSPT','rEscalerilla1','rEscalerilla2']
        const vals = keys.map(k => parseFloat(dataObj[k]) || 0)
        const nonZero = vals.filter(v => v > 0)
        const rg = nonZero.length > 0 ? vals.reduce((a, b) => a + b, 0) / nonZero.length : 0
        displayVal = rg.toFixed(4) + ' Ohm'
      } else if (f.id === 'alturaTotal') {
        const at = (parseFloat(dataObj.alturaTorre) || 0) + (parseFloat(dataObj.alturaEdificio) || 0)
        if (at > 0) displayVal = at + ' m'
      }
      if (displayVal !== null) {
        out[f.id] = { label: f.label, value: displayVal, type: 'readonly', fieldId: f.id }
      }
      continue
    }
    const val = dataObj[f.id]
    const cleanedVal = cleanVal(val)
    if (cleanedVal === null && !f.required) continue
    const controlType = resolveControlType(f)
    const options = f.type === 'status'
      ? STATUS_OPTIONS
      : (f.options || null)
    out[f.id] = {
      label: f.label,
      value: cleanedVal ?? '',
      type: controlType,
      options,
      fieldId: f.id,
      readOnly: controlType === 'readonly',
    }
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
        const entry = checklistData[item.id] || {}
        items.push({
          // Identificadores internos (no se muestran como labels)
          __itemId__: item.id,
          __itemName__: item.name,
          // Campos del item
          '#': item.id,
          'Ítem': item.name,
          'Estado': statusLabel(entry.status) || '⏳ Pendiente',
          'Observación': entry.observation || '',
          // Metadatos para edición
          __editable__: true,
          __statusKey__: `checklist.${item.id}.status`,
          __obsKey__: `checklist.${item.id}.observation`,
          __rawStatus__: entry.status || '',
          __rawObs__: entry.observation || '',
        })
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

  // Campos de info del sitio con metadatos de edición
  const siteFields = [
    { id: 'proveedor',   label: 'Proveedor',          type: 'text' },
    { id: 'idSitio',     label: 'ID del Sitio',        type: 'text',    readOnly: true },
    { id: 'nombreSitio', label: 'Nombre del Sitio',    type: 'text',    readOnly: true },
    { id: 'tipoSitio',   label: 'Tipo de Sitio',       type: 'text' },
    { id: 'coordenadas', label: 'Coordenadas GPS',     type: 'text',    readOnly: true },
    { id: 'direccion',   label: 'Dirección',           type: 'textarea' },
    { id: 'fecha',       label: 'Fecha',               type: 'text',    readOnly: true },
    { id: 'hora',        label: 'Hora',                type: 'text',    readOnly: true },
  ]
  const sf = extractFieldsFromConfig(siteFields, siteInfo)
  if (Object.keys(sf).length) result['📋 Información del Sitio'] = sf

  for (const section of inspectionSections) {
    if (!section.items) continue
    const rows = section.items.map(item => {
      const e = items[item.id] || {}
      return {
        __itemId__: item.id,
        __itemName__: item.text,
        '#': item.id,
        'Pregunta': item.text,
        'Estado': statusLabel(e.status) || '⏳ Sin evaluar',
        'Observación': e.observation || '',
        __editable__: true,
        __statusKey__: `items.${item.id}.status`,
        __obsKey__: `items.${item.id}.observation`,
        __rawStatus__: e.status || '',
        __rawObs__: e.observation || '',
      }
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

    if (section.id === 'medicion') {
      const measurements = [
        { id: 'rPataTorre', label: 'Pata de la torre' },
        { id: 'rCerramiento', label: 'Cerramiento' },
        { id: 'rPorton', label: 'Portón' },
        { id: 'rPararrayos', label: 'Pararrayos' },
        { id: 'rBarraSPT', label: 'Barra SPT' },
        { id: 'rEscalerilla1', label: 'Escalerilla #1' },
        { id: 'rEscalerilla2', label: 'Escalerilla #2' },
      ]
      const vals = measurements.map(m => parseFloat(sectionData[m.id]) || 0)
      const sum = vals.reduce((a, b) => a + b, 0)
      const nonZero = vals.filter(v => v > 0)
      const rg = nonZero.length > 0 ? sum / nonZero.length : 0

      // Filas de medición con metadatos de edición (valor numérico editable)
      const items = measurements.map((m, i) => {
        const val = vals[i]
        const status = val === 0 ? '-- Pendiente' : val <= 5 ? '✅ Bueno' : val <= 10 ? '⚠️ Regular' : '❌ Malo'
        return {
          __itemId__: m.id,
          __itemName__: m.label,
          '#': i + 1,
          'Item': m.label,
          'Estado': status,
          'Valor': val > 0 ? val + ' Ohm' : '0',
          __editable__: true,
          __valueKey__: `medicion.${m.id}`,
          __rawValue__: val || '',
        }
      })
      result['⚡ Medición de resistencia'] = items

      // Resultados calculados (readonly)
      const calcFields = {
        distanciaElectrodoCorriente: {
          label: 'Distancia electrodo corriente', fieldId: 'distanciaElectrodoCorriente',
          value: (sectionData.distanciaElectrodoCorriente || '50') + ' m',
          type: 'number', readOnly: false,
        },
        sumResistencias: {
          label: 'Sumatoria de resistencias', fieldId: 'sumResistencias',
          value: sum.toFixed(4) + ' Ohm', type: 'readonly', readOnly: true,
        },
        rg: {
          label: 'Rg promedio', fieldId: 'rg',
          value: rg.toFixed(4) + ' Ohm', type: 'readonly', readOnly: true,
        },
      }
      if (sectionData.observaciones) {
        calcFields.observaciones = {
          label: 'Observaciones', fieldId: 'observaciones',
          value: sectionData.observaciones, type: 'textarea', readOnly: false,
        }
      }
      result['⚡ Resultados'] = calcFields

    } else if (section.id === 'evidencia') {
      continue
    } else {
      const fields = extractFieldsFromConfig(section.fields, sectionData)
      if (Object.keys(fields).length) result[`⚡ ${section.title}`] = fields
    }
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

  const siteFields = [
    { id: 'proveedor',      label: 'Proveedor',          type: 'text' },
    { id: 'tipoVisita',     label: 'Tipo de Visita',      type: 'text',    readOnly: true },
    { id: 'idSitio',        label: 'ID del Sitio',        type: 'text',    readOnly: true },
    { id: 'nombreSitio',    label: 'Nombre del Sitio',    type: 'text',    readOnly: true },
    { id: 'direccion',      label: 'Dirección',           type: 'textarea' },
    { id: 'alturaMts',      label: 'Altura (m)',          type: 'number' },
    { id: 'tipoSitio',      label: 'Tipo de Sitio',       type: 'select',  options: [
      { value: 'Rooftop', label: 'Rooftop' }, { value: 'Rawland', label: 'Rawland' },
    ]},
    { id: 'tipoEstructura', label: 'Tipo de Estructura',  type: 'select',  options: [
      { value: 'Autosoportada', label: 'Autosoportada' }, { value: 'Arriostrada', label: 'Arriostrada' },
      { value: 'Monopolo', label: 'Monopolo' }, { value: 'Otro', label: 'Otro' },
    ]},
    { id: 'latitud',        label: 'Latitud',             type: 'text',    readOnly: true },
    { id: 'longitud',       label: 'Longitud',            type: 'text',    readOnly: true },
  ]
  const sf = extractFieldsFromConfig(siteFields, si)
  if (Object.keys(sf).length) result['🧾 Datos del Sitio'] = sf

  const torreItems = (data.torre?.items || []).filter(i => Object.values(i).some(v => v !== '' && v != null))
  if (torreItems.length) {
    result['🗼 Equipos en Torre'] = torreItems.map((item, idx) => ({
      '#': idx + 1,
      'Altura (m)': item.alturaMts || '—', 'Orientación': item.orientacion || '—',
      'Tipo de Equipo': item.tipoEquipo || '—', 'Cantidad': item.cantidad || '—',
      'Dimensiones (m)': item.dimensionesMts || '—', 'Área (m²)': item.areaM2 || '—',
      'Carrier': item.carrier || '—',
    }))
  }

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
        '#': gi + 1, 'Gabinete': g.gabinete || '—', 'Largo': g.largo || '—',
        'Ancho': g.ancho || '—', 'Alto': g.alto || '—',
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

  const siteFields = [
    { id: 'proveedor',   label: 'Proveedor',       type: 'text' },
    { id: 'idSitio',     label: 'ID del Sitio',    type: 'text',  readOnly: true },
    { id: 'tipoVisita',  label: 'Tipo de Visita',  type: 'text',  readOnly: true },
    { id: 'nombreSitio', label: 'Nombre del Sitio', type: 'text', readOnly: true },
    { id: 'tipoSitio',   label: 'Tipo de Sitio',   type: 'select', options: [
      { value: 'rooftop', label: 'Rooftop' }, { value: 'rawland', label: 'Rawland' },
    ]},
    { id: 'fecha',       label: 'Fecha',           type: 'text',  readOnly: true },
    { id: 'hora',        label: 'Hora',            type: 'text',  readOnly: true },
    { id: 'coordenadas', label: 'Coordenadas GPS', type: 'text',  readOnly: true },
    { id: 'direccion',   label: 'Dirección',       type: 'textarea' },
  ]
  const sf = extractFieldsFromConfig(siteFields, si)
  if (Object.keys(sf).length) result['📋 Datos del Sitio'] = sf

  const groups = groupActivities()
  for (const group of groups) {
    const items = group.items.map(act => {
      const executed = photos[`${act.id}-before`] || photos[`${act.id}-after`]
      return {
        '#': act.item, 'Actividad': act.name,
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

  if (fc === 'mantenimiento' || fc.includes('preventive-maintenance') || (fc === 'mantenimiento' && (data.formData || data.checklistData))) {
    formResult = buildMaintenancePayload(data)
  } else if (fc === 'inspeccion' || fc.includes('inspection')) {
    formResult = buildInspectionPayload(data)
  } else if (fc === 'puesta-tierra' || fc.includes('grounding')) {
    formResult = buildGroundingPayload(data)
  } else if (fc === 'sistema-ascenso' || fc.includes('safety')) {
    formResult = buildSafetyClimbingPayload(data)
  } else if (fc === 'inventario' || fc.includes('equipment')) {
    formResult = buildEquipmentPayload(data)
  } else if (fc === 'mantenimiento-ejecutado' || fc.includes('executed')) {
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
    if (fc === 'mantenimiento' || fc === 'preventive-maintenance' || fc.includes('preventive-maintenance')) {
      // asset_type puede venir de dos formas:
      //   Sin prefijo:  'fotoTorre' | 'fotoGPS' | 'fotoCandado' | 'firmaProveedor'  (DynamicForm)
      //   Con prefijo:  'maintenance:itemId:before|after'  (InspectionChecklist)
      const hasMaintPrefix = parts[0] === 'maintenance'
      const itemId   = hasMaintPrefix ? (parts[1] || '') : (parts.length === 1 ? parts[0] : (parts[1] || ''))
      const photoType = hasMaintPrefix ? (parts[2] || 'photo') : 'photo'

      if (itemId === 'fotoTorre') {
        sectionTitle = '🗼 Información de la Torre'; label = 'Foto de la Torre'
      } else if (itemId === 'fotoGPS') {
        sectionTitle = '🗼 Información de la Torre'; label = 'Foto GPS'
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
    } else if (fc === 'inspeccion' || fc.includes('inspection')) {
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
    } else if (fc === 'mantenimiento-ejecutado' || fc.includes('executed')) {
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

    // ── Inventario de Equipos v2 ──
    } else if (fc === 'inventario-v2' || fc === 'equipment-v2') {
      // asset_type formats:
      //   equipmentV2:fotoDistribucionTorre   — torre fotos
      //   equipmentV2:fotoTorreCompleta
      //   equipmentV2:fotoCroquisEdificio
      //   equipmentV2:fotoPlanoPlanta         — piso
      //   carrier:N:foto1 / foto2 / foto3     — por carrier
      if (parts[0] === 'carrier') {
        const cIdx  = parts[1] ?? '0'
        const fNum  = parts[2] ?? 'foto'
        sectionTitle = `📡 Carrier #${parseInt(cIdx) + 1}`
        label = `Foto ${fNum.replace('foto', '')} — Carrier ${parseInt(cIdx) + 1}`
      } else if (parts[0] === 'equipmentV2') {
        const fieldMap = {
          fotoDistribucionTorre: { sec: '🗼 Torre',  lbl: 'Distribución de equipos en torre' },
          fotoTorreCompleta:     { sec: '🗼 Torre',  lbl: 'Torre completa' },
          fotoCroquisEdificio:   { sec: '🗼 Torre',  lbl: 'Croquis esquemático del edificio' },
          fotoPlanoPlanta:       { sec: '🏢 Piso',   lbl: 'Plano de planta y equipos' },
        }
        const info = fieldMap[parts[1]] || { sec: '📷 Fotos', lbl: labelize(parts[1] || type) }
        sectionTitle = info.sec
        label = info.lbl
      } else {
        sectionTitle = '📷 Fotos'
        label = labelize(type)
      }

    // ── Inventario de Equipos (v1) ──
    } else if (fc === 'inventario' || fc.includes('equipment')) {
      const field = parts[1] || ''
      const labels = { fotoTorre: 'Foto de la Torre', croquisEsquematico: 'Croquis Esquemático', planoPlanta: 'Plano de Planta' }
      sectionTitle = '📐 Documentación del Sitio'
      label = labels[field] || labelize(field)

    // ── Puesta a Tierra ──
    // Photos have NO prefix — asset_type is the raw fieldId like "fotoPataTorre"
    } else if (fc === 'puesta-tierra' || fc.includes('grounding')) {
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
    } else if (fc === 'sistema-ascenso' || fc.includes('safety')) {
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
