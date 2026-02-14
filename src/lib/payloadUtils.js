/**
 * Smart extraction utilities for PTI Inspect submission payloads.
 *
 * Uses the ACTUAL form configs from PTI Inspect to map IDs → human-readable labels,
 * ensuring 100% of captured data is visible in the admin panel.
 *
 * Payload structure in Supabase:
 *   submission.payload = {
 *     meta: { lat, lng, date, time, startedAt },
 *     autosave_bucket: "preventive-maintenance",
 *     data: { ...form-specific snapshot },
 *     validation: null, profile: null
 *   }
 *
 * Mantenimiento:  data = { currentStep, completedSteps, formData: {...}, checklistData: {...}, photos: {...} }
 * Inspección:     data = { siteInfo: {...}, items: {...}, photos: {...} }
 * Equipment:      data = { siteInfo, torre, piso, distribucionTorre, croquisEsquematico, planoPlanta }
 * Grounding:      data = { datos: {...}, condiciones: {...}, equipo: {...}, mediciones: {...}, ... }
 * Safety:         data = { datos: {...}, herrajes: {...}, prensacables: {...}, ... }
 * PM Executed:    data = { siteInfo: {...}, photos: {...} }
 */

import { maintenanceFormConfig } from '../data/maintenanceFormConfig'
import { inspectionSections } from '../data/inspectionItems'

// ===== STATUS LABELS =====
const STATUS_LABELS = {
  bueno: '✅ Bueno',
  regular: '⚠️ Regular',
  malo: '❌ Malo',
  na: '➖ N/A',
  '': '—',
}

function statusLabel(val) {
  if (!val) return '—'
  return STATUS_LABELS[val] || val
}

// ===== EXTRACT SITE INFO =====
export function extractSiteInfo(submission) {
  const payload = submission?.payload || {}
  const data = payload.data || {}
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
  const meta = submission?.payload?.meta || {}
  return {
    date: meta.date || null,
    time: meta.time || null,
    startedAt: meta.startedAt || null,
    lat: meta.lat || null,
    lng: meta.lng || null,
  }
}

// ===== BUILD LABEL MAPS FROM FORM CONFIGS =====

/** Maintenance: build map of field ID → label from all steps */
function buildMaintenanceFieldLabels() {
  const map = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'form' && step.fields) {
      for (const f of step.fields) {
        map[f.id] = f.label
      }
    }
  }
  return map
}

/** Maintenance: build map of checklist item ID → { name, description, step title } */
function buildMaintenanceChecklistMap() {
  const map = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'checklist' && step.items) {
      for (const item of step.items) {
        map[item.id] = {
          name: item.name,
          description: item.description,
          stepTitle: step.title,
          stepId: step.id,
          hasValueInput: item.hasValueInput || false,
          valueLabel: item.valueLabel || '',
        }
      }
    }
  }
  return map
}

/** Inspection: build map of item ID → text */
function buildInspectionItemMap() {
  const map = {}
  for (const section of inspectionSections) {
    if (section.items) {
      for (const item of section.items) {
        map[item.id] = {
          text: item.text,
          sectionTitle: section.title,
          sectionId: section.id,
          hasPhoto: item.hasPhoto || false,
        }
      }
    }
  }
  return map
}

// Pre-build maps
const MAINT_FIELD_LABELS = buildMaintenanceFieldLabels()
const MAINT_CHECKLIST_MAP = buildMaintenanceChecklistMap()
const INSPECTION_ITEM_MAP = buildInspectionItemMap()

// ===== CLEAN PAYLOAD BUILDERS =====

/**
 * Build clean display payload for a MANTENIMIENTO PREVENTIVO submission.
 */
function buildMaintenancePayload(data) {
  const result = {}
  const formData = data.formData || {}
  const checklistData = data.checklistData || {}
  const photos = data.photos || {}

  // 1. Form fields → organized by step
  const formSections = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type !== 'form') continue
    const sectionFields = {}
    let hasData = false
    for (const f of step.fields) {
      const val = formData[f.id]
      if (val === undefined || val === null || val === '') continue
      if (typeof val === 'string' && val.startsWith('data:')) {
        sectionFields[f.label] = '📷 Foto capturada'
      } else if (val === '__photo__') {
        sectionFields[f.label] = '📷 Foto subida'
      } else {
        sectionFields[f.label] = val
      }
      hasData = true
    }
    if (hasData) formSections[`${step.icon || '📋'} ${step.title}`] = sectionFields
  }
  if (Object.keys(formSections).length > 0) {
    Object.assign(result, formSections)
  }

  // 2. Checklist items → organized by step (section)
  const checklistSections = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type !== 'checklist') continue
    const items = []
    for (const item of step.items) {
      const entry = checklistData[item.id]
      if (!entry) continue
      const row = {
        '#': item.id,
        'Ítem': item.name,
        'Estado': statusLabel(entry.status),
      }
      if (entry.value) row['Valor'] = entry.value
      if (entry.observation) row['Observación'] = entry.observation
      items.push(row)
    }
    // Also show items with no data as pending
    for (const item of step.items) {
      if (!checklistData[item.id]) {
        items.push({
          '#': item.id,
          'Ítem': item.name,
          'Estado': '⏳ Pendiente',
        })
      }
    }
    if (items.length > 0) {
      checklistSections[`${step.icon || '📋'} ${step.title}`] = items
    }
  }
  if (Object.keys(checklistSections).length > 0) {
    Object.assign(result, checklistSections)
  }

  // 3. Photo count summary
  const photoKeys = Object.keys(photos).filter(k => photos[k] && photos[k] !== null)
  if (photoKeys.length > 0) {
    result['📷 Fotos capturadas'] = {
      'Total fotos en formulario': photoKeys.length,
      'Subidas al storage': photoKeys.filter(k => photos[k] === '__photo__').length,
    }
  }

  return result
}

/**
 * Build clean display payload for an INSPECCIÓN GENERAL submission.
 */
function buildInspectionPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}
  const items = data.items || {}
  const photos = data.photos || {}

  // 1. Site info
  const siteFields = {}
  const siteLabels = {
    proveedor: 'Proveedor', idSitio: 'ID Sitio', nombreSitio: 'Nombre Sitio',
    tipoSitio: 'Tipo de Sitio', coordenadas: 'Coordenadas GPS', direccion: 'Dirección',
    fecha: 'Fecha', hora: 'Hora', tipoTorre: 'Tipo de Torre', alturaTorre: 'Altura Torre (m)',
  }
  for (const [key, label] of Object.entries(siteLabels)) {
    if (siteInfo[key]) siteFields[label] = siteInfo[key]
  }
  if (Object.keys(siteFields).length > 0) result['📋 Información del sitio'] = siteFields

  // 2. Inspection items by section
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

  // 3. Photos
  const photoKeys = Object.keys(photos).filter(k => photos[k] && photos[k] !== null)
  if (photoKeys.length > 0) {
    result['📷 Fotos'] = { 'Total': photoKeys.length }
  }

  return result
}

/**
 * Build clean display for GROUNDING / SAFETY forms (flat section-based).
 */
function buildFlatSectionPayload(data) {
  const result = {}
  const skipKeys = new Set(['currentStep', 'completedSteps'])

  for (const [sectionId, sectionData] of Object.entries(data)) {
    if (skipKeys.has(sectionId)) continue
    if (!sectionData || typeof sectionData !== 'object') continue

    const fields = {}
    for (const [key, val] of Object.entries(sectionData)) {
      if (val === null || val === undefined || val === '') continue
      if (typeof val === 'string' && val.startsWith('data:')) {
        fields[labelize(key)] = '📷 Foto capturada'
      } else if (val === '__photo__') {
        fields[labelize(key)] = '📷 Foto subida'
      } else {
        fields[labelize(key)] = val
      }
    }
    if (Object.keys(fields).length > 0) {
      result[labelize(sectionId)] = fields
    }
  }

  return result
}

/**
 * Build clean display for EQUIPMENT INVENTORY.
 */
function buildEquipmentPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}

  // Site info
  const siteFields = {}
  for (const [k, v] of Object.entries(siteInfo)) {
    if (v && v !== '') siteFields[labelize(k)] = v
  }
  if (Object.keys(siteFields).length > 0) result['📋 Datos del sitio'] = siteFields

  // Torre
  if (data.torre?.items?.length > 0) {
    result['🗼 Equipos en torre'] = data.torre.items.filter(i =>
      Object.values(i).some(v => v !== '')
    )
  }

  // Piso / clientes
  if (data.piso?.clientes?.length > 0) {
    const clientes = data.piso.clientes.map((c, i) => {
      const clean = { '#': i + 1, 'Tipo': c.tipoCliente }
      if (c.nombreCliente) clean['Cliente'] = c.nombreCliente
      if (c.areaArrendada) clean['Área arrendada'] = c.areaArrendada
      if (c.gabinetes?.length) clean['Gabinetes'] = c.gabinetes.length
      return clean
    })
    result['🏗️ Clientes en piso'] = clientes
  }

  // Drawings
  if (data.distribucionTorre?.pngDataUrl || data.distribucionTorre?.scene?.objects?.length) {
    result['📐 Distribución torre'] = { 'Estado': 'Capturado' }
  }
  if (data.croquisEsquematico?.pngDataUrl) {
    result['✏️ Croquis esquemático'] = {
      'Estado': 'Capturado',
      ...(data.croquisEsquematico.niveles || {}),
    }
  }
  if (data.planoPlanta?.pngDataUrl) {
    result['📐 Plano de planta'] = { 'Estado': 'Capturado' }
  }

  return result
}

/**
 * Build clean display for PM EXECUTED.
 */
function buildPMExecutedPayload(data) {
  const result = {}
  const siteInfo = data.siteInfo || {}
  const photos = data.photos || {}

  const siteFields = {}
  for (const [k, v] of Object.entries(siteInfo)) {
    if (v && v !== '') siteFields[labelize(k)] = v
  }
  if (Object.keys(siteFields).length > 0) result['📋 Datos del sitio'] = siteFields

  // Photos: grouped by activity
  const photoKeys = Object.keys(photos).filter(k => photos[k])
  if (photoKeys.length > 0) {
    const activities = {}
    for (const key of photoKeys) {
      const parts = key.split('-')
      const actId = parts.slice(0, -1).join('-')
      const type = parts[parts.length - 1] // before or after
      if (!activities[actId]) activities[actId] = {}
      activities[actId][type === 'before' ? 'Antes' : type === 'after' ? 'Después' : type] = '📷'
    }
    result['📷 Fotos por actividad'] = Object.entries(activities).map(([id, data]) => ({
      'Actividad': id,
      ...data,
    }))
  }

  return result
}

// ===== MAIN EXPORT =====

/**
 * Get a clean, human-readable payload organized by sections.
 * Uses form configs to map IDs → labels for all form types.
 */
export function getCleanPayload(submission) {
  const payload = submission?.payload || {}
  const data = payload.data || {}
  const meta = payload.meta || {}
  const formCode = submission?.form_code || payload.autosave_bucket || ''

  const result = {}

  // Meta info
  if (meta && Object.keys(meta).some(k => meta[k])) {
    const metaClean = {}
    if (meta.date) metaClean['Fecha'] = meta.date
    if (meta.time) metaClean['Hora'] = meta.time
    if (meta.startedAt) metaClean['Inicio'] = new Date(meta.startedAt).toLocaleString()
    if (meta.lat) metaClean['GPS'] = `${Number(meta.lat).toFixed(5)}, ${Number(meta.lng).toFixed(5)}`
    if (Object.keys(metaClean).length) result['📍 Inicio de inspección'] = metaClean
  }

  // Form-specific processing
  const isMantenimiento = formCode.includes('preventive-maintenance') || formCode === 'mantenimiento'
  const isInspeccion = formCode.includes('inspection') || formCode === 'inspeccion'
  const isEquipment = formCode.includes('equipment') || formCode === 'inventario'
  const isExecuted = formCode.includes('executed') || formCode === 'mantenimiento-ejecutado'
  const isGrounding = formCode.includes('grounding') || formCode === 'puesta-tierra'
  const isSafety = formCode.includes('safety')

  let formResult = {}

  if (isMantenimiento && (data.formData || data.checklistData)) {
    formResult = buildMaintenancePayload(data)
  } else if (isInspeccion && (data.siteInfo || data.items)) {
    formResult = buildInspectionPayload(data)
  } else if (isEquipment && data.siteInfo) {
    formResult = buildEquipmentPayload(data)
  } else if (isExecuted) {
    formResult = buildPMExecutedPayload(data)
  } else if (isGrounding || isSafety) {
    formResult = buildFlatSectionPayload(data)
  } else {
    // Generic fallback: show all data except internal keys
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
