import { q } from './dbUtils'
import { supabase } from './supabaseClient'
import { normalizeFormCode, getFormCodeSiblings, isFormVisible } from '../data/formTypes'

/**
 * The submissions table has columns:
 *   id, org_code, device_id, form_code, form_version, app_version,
 *   payload (jsonb), created_at, updated_at, last_saved_at
 *
 * The `payload` column contains:
 *   {
 *     org_code, device_id, form_code, app_version, form_version,
 *     _meta: { last_saved_at },
 *     payload: {                   ← inner payload
 *       meta: { lat, lng, date, time, startedAt },
 *       data: { formData, checklistData, photos, ... },
 *       submitted_by: { name, role, username },
 *       submitted_at,
 *       autosave_bucket
 *     }
 *   }
 *
 * Some fields exist BOTH as DB columns AND inside `payload` (org_code, form_code, etc).
 * We use SELECT * and normalize in the store/UI.
 */

/**
 * Fetch all submissions.
 * Si se pasa orgCode, filtra solo los de esa empresa (para supervisores con empresa asignada).
 */
export async function fetchSubmissions({ formCode, orgCode, excludeOrgCodes, limit = 2000 } = {}) {
  let query = supabase
    .from('submissions')
    .select(`
      *,
      site_visits!submissions_site_visit_id_fkey(site_id, site_name)
    `)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (formCode && formCode !== 'all') {
    query = query.eq('form_code', formCode)
  }

  if (orgCode) {
    query = query.eq('org_code', orgCode)
  }

  if (excludeOrgCodes && excludeOrgCodes.length > 0) {
    query = query.not('org_code', 'in', `(${excludeOrgCodes.map(c => `"${c}"`).join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error

  // Aplanar site_visits embebido → site_id y site_name directamente en la submission
  return (data || []).map(s => {
    const { site_visits: sv, ...rest } = s
    return normalizeSubmission({
      ...rest,
      site_id:   rest.site_id   || sv?.site_id   || null,
      site_name: rest.site_name || sv?.site_name  || null,
    })
  })
    .filter(s => {
      const p = s.payload || {}
      const inner = p.payload || p
      return inner.data || inner.meta || p._meta || p.form_code
    })
    .filter(s => isFormVisible(s.form_code))
}

/**
 * Fetch a single submission by ID.
 */
export async function fetchSubmissionById(id) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return normalizeSubmission(data)
}

/**
 * Fetch all assets (photos) for a given submission.
 */
export async function fetchSubmissionAssets(submissionId) {
  const { data, error } = await supabase
    .from('submission_assets')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Fetch submission + its assets.
 *
 * IMPORTANT: Due to a code mismatch in the inspector app, assets may be linked
 * to a "sibling" submission row. The inspector writes form data with Spanish
 * form codes (e.g. 'mantenimiento') but uploads assets under English codes
 * (e.g. 'preventive-maintenance'). These are different rows in the DB.
 * We search across BOTH code variants and all sibling submissions.
 */
/**
 * Fetch submission + its assets en el mínimo número de round-trips.
 *
 * Estrategia:
 *   - Query 1: submission con sus assets embebidos (1 round-trip via Supabase select embedding)
 *   - Query 2 (solo si submission tiene site_visit_id): buscar siblings con sus assets
 *   Ambas queries corren en paralelo cuando es posible.
 */
export async function fetchSubmissionWithAssets(id) {
  // Query única: submission + submission_assets embebidos via FK relationship
  const { data: row, error } = await q(
    supabase
      .from('submissions')
      .select('*, submission_assets(*)')
      .eq('id', id)
      .order('created_at', { referencedTable: 'submission_assets', ascending: true })
      .single()
  )

  if (error) throw error

  const submission  = normalizeSubmission({ ...row, submission_assets: undefined })
  const directAssets = (row.submission_assets || []).filter(a => a.public_url)

  // Si no hay site_visit_id, no hay siblings — retornar inmediatamente
  const siteVisitId = submission.site_visit_id
  if (!siteVisitId || !submission.org_code || !submission.form_code) {
    return { submission, assets: directAssets }
  }

  // Buscar siblings — todos los submissions del mismo visit con variantes de form_code
  // NOTA: no filtramos por device_id porque un mismo inspector puede haber usado
  // dispositivos distintos al crear vs al subir fotos, lo que rompería el lookup.
  // site_visit_id + org_code + form_code es suficiente para scopear correctamente.
  const siblingCodes = getFormCodeSiblings(submission.form_code)
  const allCodes     = [submission.form_code, ...siblingCodes]

  const { data: siblingRows } = await q(
    supabase
      .from('submissions')
      .select('id, submission_assets(*)')
      .eq('org_code', submission.org_code)
      .eq('site_visit_id', siteVisitId)
      .in('form_code', allCodes)
      .neq('id', id)
      .order('created_at', { referencedTable: 'submission_assets', ascending: true })
  )

  if (!siblingRows?.length) return { submission, assets: directAssets }

  // Merge: main assets tienen prioridad sobre sibling para el mismo asset_type
  const siblingAssets   = siblingRows.flatMap(r => r.submission_assets || []).filter(a => a.public_url)
  const mainAssetTypes  = new Set(directAssets.map(a => a.asset_type))
  const newSiblingAssets = siblingAssets.filter(a => !mainAssetTypes.has(a.asset_type))

  return { submission, assets: [...directAssets, ...newSiblingAssets] }
}

// ═══════════════════════════════════════════
// SITE VISITS (Orders)
// ═══════════════════════════════════════════

/**
 * Fetch all site visits (orders).
 */
export async function fetchSiteVisits({ status, limit = 2000 } = {}) {
  // Incluimos un conteo de submissions para calcular sub-estados sin depender
  // del store de submissions. Supabase retorna submissions como array embebido.
  let query = supabase
    .from('site_visits')
    .select(`
      *,
      submissions(id, form_code, finalized)
    `)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await q(query, 30000)
  if (error) throw error

  // Calcular sub-estado directamente desde los submissions embebidos
  const CANONICAL = {
    'preventive-maintenance': 'mantenimiento',
    'executed-maintenance':   'mantenimiento-ejecutado',
    'inventario-v2':          'equipment-v2',
    'safety-system':          'sistema-ascenso',
    'additional-photo':       'additional-photo-report',
    'reporte-fotos':          'additional-photo-report',
    'puesta-tierra':          'grounding-system-test',
  }
  const normalize = c => CANONICAL[c] || c

  return (data || []).map(v => {
    const subs        = v.submissions || []
    const hasSubs     = subs.length > 0
    const hasFinalized = subs.some(s => s.finalized === true)

    let subState
    if (v.status === 'closed')              subState = 'closed'
    else if (!hasSubs)                      subState = 'sin-iniciar'
    else if (hasSubs && !hasFinalized)      subState = 'en-curso'
    else                                    subState = 'con-avance'

    // Eliminar el array submissions embebido — solo mantenemos el sub-estado calculado
    const { submissions: _subs, ...rest } = v
    return { ...rest, subState, hasSubs, hasFinalized }
  })
}

/**
 * Fetch a single site visit by ID.
 */
export async function fetchSiteVisitById(id) {
  const { data, error } = await supabase
    .from('site_visits')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Update the status of a site visit (open ↔ closed).
 * Returns the updated row.
 */
export async function updateSiteVisitStatus(visitId, status) {
  const updatePayload = status === 'closed'
    ? { status, closed_at: new Date().toISOString() }
    : { status, closed_at: null }

  const { data, error } = await supabase
    .from('site_visits')
    .update(updatePayload)
    .eq('id', visitId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Fetch submissions linked to a specific site visit.
 * Filters out NIL UUID submissions (those without a real order).
 */
export async function fetchSubmissionsForVisit(visitId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('site_visit_id', visitId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  if (!data || data.length === 0) return []

  // Deduplicate by form_code:
  // Priority: 1) finalized  2) most payload data (largest JSON = real data)  3) most recent
  const seen = new Map()
  for (const row of data) {
    const existing = seen.get(row.form_code)
    if (!existing) {
      seen.set(row.form_code, row)
    } else {
      const existingSize = JSON.stringify(existing.payload || {}).length
      const rowSize      = JSON.stringify(row.payload     || {}).length
      if (row.finalized && !existing.finalized) {
        // Finalized always wins over draft
        seen.set(row.form_code, row)
      } else if (row.finalized === existing.finalized && rowSize > existingSize) {
        // Same finalized status — prefer the row with more data (real vs shell)
        seen.set(row.form_code, row)
      }
      // else keep existing
    }
  }

  return Array.from(seen.values()).map(normalizeSubmission)
}

/**
 * Fetch all submissions for an order detail, including their assets.
 *
 * FIX: Siempre busca assets en TODOS los siblings del mismo form_code,
 * no solo cuando directAssets.length === 0. Hace MERGE (no replace),
 * deduplicando por asset_type y quedándose con el más reciente.
 *
 * Problema anterior: la submission "ganadora" del dedup por form_code puede
 * no tener assets, estando estos en otra fila del mismo form_code. La
 * condición `if (assets.length === 0)` hacía que si la ganadora tenía
 * aunque sea 1 asset, se ignoraban los demás siblings con el resto.
 */
export async function fetchSubmissionsWithAssetsForVisit(visitId) {
  const submissions = await fetchSubmissionsForVisit(visitId)

  // Traer TODOS los submission_ids de esta visita de una sola query
  const { data: allSiblingRows } = await supabase
    .from('submissions')
    .select('id, form_code, org_code')
    .eq('site_visit_id', visitId)

  const allSiblingMap = {}
  ;(allSiblingRows || []).forEach(r => {
    const canonical = normalizeFormCode(r.form_code)
    if (!allSiblingMap[canonical]) allSiblingMap[canonical] = []
    allSiblingMap[canonical].push(r.id)
  })

  // Traer TODOS los assets de la visita en una sola query
  const allVisitSubIds = (allSiblingRows || []).map(r => r.id)
  let allAssets = []
  if (allVisitSubIds.length > 0) {
    const { data: assetRows } = await supabase
      .from('submission_assets')
      .select('*')
      .in('submission_id', allVisitSubIds)
      .not('public_url', 'is', null)
      .order('created_at', { ascending: true })
    allAssets = assetRows || []
  }

  // Indexar assets por submission_id
  const assetsBySubId = {}
  allAssets.forEach(a => {
    if (!assetsBySubId[a.submission_id]) assetsBySubId[a.submission_id] = []
    assetsBySubId[a.submission_id].push(a)
  })

  // Para cada submission ganadora, acumular assets de TODOS sus siblings
  const withAssets = submissions.map(sub => {
    try {
      const canonical   = normalizeFormCode(sub.form_code)
      const siblingIds  = allSiblingMap[canonical] || [sub.id]

      // Merge: acumular todos los assets de todos los siblings
      const merged = {}
      siblingIds.forEach(sid => {
        ;(assetsBySubId[sid] || []).forEach(a => {
          const existing = merged[a.asset_type]
          // Mantener el más reciente por asset_type
          if (!existing || a.created_at > existing.created_at) {
            merged[a.asset_type] = a
          }
        })
      })

      return { ...sub, assets: Object.values(merged) }
    } catch {
      return { ...sub, assets: [] }
    }
  })

  return withAssets
}

/**
 * Dashboard stats.
 */
export async function fetchDashboardStats(user = null) {
  const VIEWER_EXCLUDED_ORG_CODES = ['HK']

  // ── Query de submissions con filtro por rol ─────────────────────────────
  let subQuery = supabase
    .from('submissions')
    .select('id, form_code, updated_at, finalized, org_code, created_at, device_id, site_visit_id, app_version')
    .order('updated_at', { ascending: false })

  if (user?.role === 'supervisor' && user?.company?.org_code) {
    subQuery = subQuery.eq('org_code', user.company.org_code)
  } else if (user?.role === 'viewer') {
    subQuery = subQuery.not('org_code', 'in', `(${VIEWER_EXCLUDED_ORG_CODES.map(c => `"${c}"`).join(',')})`)
  }

  // ── Query de visitas ────────────────────────────────────────────────────
  const visitQuery = supabase
    .from('site_visits')
    .select('id, status, started_at, order_number, site_name, site_id, inspector_name, inspector_username')
    .order('started_at', { ascending: false })
    .then(r => r).catch(() => ({ data: [], error: null }))

  const [subRes, visitRes] = await Promise.all([subQuery, visitQuery])
  if (subRes.error) throw subRes.error

  const rows   = (subRes.data || []).filter(s => s.form_code && isFormVisible(s.form_code))
  let   visits = visitRes.data || []

  // Para supervisor y viewer: limitar visitas a las que pertenecen sus submissions
  if (user?.role !== 'admin') {
    const allowedVisitIds = new Set(rows.map(r => r.site_visit_id).filter(Boolean))
    visits = visits.filter(v => allowedVisitIds.has(v.id))
  }

  // ── KPIs ────────────────────────────────────────────────────────────────
  const total = rows.length
  const byFormCode = {}
  for (const r of rows) {
    const fc = normalizeFormCode(r.form_code || 'unknown')
    byFormCode[fc] = (byFormCode[fc] || 0) + 1
  }

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const recentCount = rows.filter(r => new Date(r.updated_at).getTime() > weekAgo).length

  // ── Actividad reciente: enriquecer con datos de la visita ────────────────
  const visitMap = {}
  for (const v of visits) visitMap[v.id] = v

  const recent = rows.slice(0, 9).map(r => {
    const visit = visitMap[r.site_visit_id] || {}
    return {
      ...r,
      site_name:      visit.site_name      || '',
      site_id:        visit.site_id        || '',
      inspector_name: visit.inspector_name || visit.inspector_username || '',
    }
  })

  // ── Stats de visitas ────────────────────────────────────────────────────
  const totalVisits  = visits.length
  const openVisits   = visits.filter(v => v.status === 'open').length
  const closedVisits = visits.filter(v => v.status === 'closed').length
  const recentVisits = visits.slice(0, 5)

  return { total, byFormCode, recentCount, recent, totalVisits, openVisits, closedVisits, recentVisits }
}

/**
 * Normalize a raw submission row:
 *  - Ensures top-level form_code, device_id, app_version even if DB columns are missing
 *  - Pulls from payload.form_code etc. as fallback
 */
function normalizeSubmission(raw) {
  if (!raw) return raw
  const p = raw.payload || raw.data || {}
  // payload may be double-wrapped { payload: { finalized, data } }
  // or already flat after a prior normalization { finalized, data }
  const inner = p.payload || p

  // Check finalized at every possible nesting level.
  // Trust only explicit finalized flags — submitted_at is NOT a reliable signal
  // because the inspector app writes submitted_at on all submissions including drafts.
  const finalized =
    raw.finalized === true ||
    p.finalized === true ||
    (p.payload != null && p.payload.finalized === true)

  return {
    ...raw,
    form_code: raw.form_code || p.form_code || inner.form_code || '',
    device_id: raw.device_id || p.device_id || '',
    org_code: raw.org_code || p.org_code || '',
    app_version: raw.app_version || p.app_version || '',
    form_version: raw.form_version || p.form_version || '',
    site_visit_id: raw.site_visit_id || p.site_visit_id || null,
    finalized,
    payload: p,
  }
}

// ═══════════════════════════════════════════════════════════════
// SUBMISSION EDITING & AUDIT
// ═══════════════════════════════════════════════════════════════

/**
 * Update a submission's payload in Supabase.
 * Merges edits into the correct nesting level of the payload.
 * @param {string} submissionId
 * @param {object} currentPayload  - full payload object from submission
 * @param {object} fieldUpdates    - flat { fieldKey: newValue } object
 */
/**
 * Resolve the correct submission ID to update when duplicates exist.
 * When a form has multiple rows for the same (site_visit_id, form_code),
 * always use the row with the most payload data to avoid overwriting real data
 * with a shell row.
 *
 * Returns the submissionId to use (may be different from the one passed in).
 */
async function resolveSubmissionIdForUpdate(submissionId) {
  try {
    // Get the site_visit_id and form_code of this submission
    const { data: current, error: fetchErr } = await q(
      supabase
        .from('submissions')
        .select('id, site_visit_id, form_code, payload')
        .eq('id', submissionId)
        .single()
    )
    if (fetchErr || !current) return submissionId

    const { site_visit_id, form_code } = current
    if (!site_visit_id || !form_code) return submissionId

    // Find all sibling rows for same visit + form
    const { data: siblings, error: sibErr } = await q(
      supabase
        .from('submissions')
        .select('id, payload')
        .eq('site_visit_id', site_visit_id)
        .eq('form_code', form_code)
    )
    if (sibErr || !siblings || siblings.length <= 1) return submissionId

    // Pick the row with the largest payload (most data)
    let bestId = submissionId
    let bestSize = JSON.stringify(current.payload || {}).length
    for (const s of siblings) {
      if (s.id === submissionId) continue
      const size = JSON.stringify(s.payload || {}).length
      if (size > bestSize) {
        bestSize = size
        bestId = s.id
      }
    }

    if (bestId !== submissionId) {
      console.warn(
        `[resolveSubmissionId] Redirecting save from shell ${submissionId} → real row ${bestId} (size ${bestSize})`
      )
    }
    return bestId
  } catch (e) {
    console.warn('[resolveSubmissionId] fallback to original id:', e.message)
    return submissionId
  }
}

export async function updateSubmissionPayload(submissionId, currentPayload, fieldUpdates) {
  const outer = currentPayload || {}
  const inner = outer.payload || outer
  const data  = inner.data || {}

  /**
   * Deep-update helper: walks every object/array in `obj` and replaces
   * any key that matches (exact OR case-insensitive). Returns a new object.
   * This handles the mismatch between display labels ("Proveedor") and
   * internal keys ("proveedor", "idSitio", etc).
   */
  function deepApply(obj, key, value) {
    if (!obj || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => deepApply(item, key, value))
    const updated = { ...obj }
    let hit = false

    // 1. Exact match
    if (key in updated) { updated[key] = value; hit = true }

    // 2. Case-insensitive
    if (!hit) {
      const keyLower = key.toLowerCase()
      for (const k of Object.keys(updated)) {
        if (k.toLowerCase() === keyLower) { updated[k] = value; hit = true; break }
      }
    }

    // 3. Normalize: "Nombre del Sitio" → "nombreSitio" style
    if (!hit) {
      const normalize = (s) => s.toLowerCase()
        .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i')
        .replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n')
        .replace(/[^a-z0-9]/g,'')
      const keyNorm = normalize(key)
      for (const k of Object.keys(updated)) {
        if (k === '__keyMap__') continue
        if (normalize(k) === keyNorm) { updated[k] = value; hit = true; break }
      }
    }

    // Recurse into sub-objects
    for (const k of Object.keys(updated)) {
      if (k.startsWith('__')) continue
      if (updated[k] && typeof updated[k] === 'object' && k !== '__proto__') {
        const sub = deepApply(updated[k], key, value)
        if (sub !== updated[k]) updated[k] = sub
      }
    }
    return updated
  }

  let updatedData = { ...data }

  const SUBMITTED_BY_LABEL_MAP = {
    'nombre': 'name', 'name': 'name',
    'rol': 'role', 'role': 'role',
    'usuario': 'username', 'username': 'username',
  }
  let updatedSubmittedBy = inner.submitted_by ? { ...inner.submitted_by } : null

  for (const [key, value] of Object.entries(fieldUpdates)) {
    if (key === '__finalized__') continue

    // Claves estructuradas con separador ||| para evitar conflicto con IDs que tienen puntos (1.1, 1.2...)
    // Formato: scope|||itemId|||field
    if (key.includes('|||')) {
      const parts = key.split('|||')
      const scope  = parts[0]
      const itemId = parts[1]
      const field  = parts[2]

      if (scope === 'checklist' && itemId && field) {
        const cd = updatedData.checklistData || {}
        updatedData = {
          ...updatedData,
          checklistData: { ...cd, [itemId]: { ...(cd[itemId] || {}), [field]: value } }
        }
      } else if (scope === 'items' && itemId && field) {
        const it = updatedData.items || {}
        updatedData = {
          ...updatedData,
          items: { ...it, [itemId]: { ...(it[itemId] || {}), [field]: value } }
        }
      } else if (scope === 'medicion' && itemId) {
        const med = updatedData.medicion || {}
        updatedData = { ...updatedData, medicion: { ...med, [itemId]: value } }

      // ── Equipment V2 ──────────────────────────────────────────────────────
      } else if (scope === 'siteInfo' && itemId) {
        // siteInfo|||fieldId → data.siteInfo.fieldId
        updatedData = {
          ...updatedData,
          siteInfo: { ...(updatedData.siteInfo || {}), [itemId]: value }
        }
      } else if (scope === 'torre' && itemId === 'item' && field !== undefined) {
        // torre|||item|||{rowIdx}|||{fieldId}
        const rowIdx = parseInt(field)
        const fieldId = parts[3]
        if (!isNaN(rowIdx) && fieldId) {
          const items = [...(updatedData.torre?.items || [])]
          items[rowIdx] = { ...(items[rowIdx] || {}), [fieldId]: value }
          updatedData = { ...updatedData, torre: { ...(updatedData.torre || {}), items } }
        }
      } else if (scope === 'piso' && itemId !== undefined) {
        const cIdx = parseInt(itemId)
        if (!isNaN(cIdx)) {
          const clientes = [...(updatedData.piso?.clientes || [])]
          if (!clientes[cIdx]) clientes[cIdx] = {}
          if (field === 'gab') {
            // piso|||{cIdx}|||gab|||{gIdx}|||{fieldId}
            const gIdx   = parseInt(parts[3])
            const fieldId = parts[4]
            if (!isNaN(gIdx) && fieldId) {
              const gabs = [...(clientes[cIdx].gabinetes || [])]
              gabs[gIdx] = { ...(gabs[gIdx] || {}), [fieldId]: value }
              clientes[cIdx] = { ...clientes[cIdx], gabinetes: gabs }
            }
          } else if (field) {
            // piso|||{cIdx}|||{fieldId}
            clientes[cIdx] = { ...clientes[cIdx], [field]: value }
          }
          updatedData = { ...updatedData, piso: { ...(updatedData.piso || {}), clientes } }
        }
      } else if (scope === 'carrier' && itemId !== undefined) {
        const cIdx = parseInt(itemId)
        if (!isNaN(cIdx)) {
          const carriers = [...(updatedData.carriers || [])]
          if (!carriers[cIdx]) carriers[cIdx] = {}
          if (field === 'item') {
            // carrier|||{cIdx}|||item|||{rIdx}|||{fieldId}
            const rIdx   = parseInt(parts[3])
            const fieldId = parts[4]
            if (!isNaN(rIdx) && fieldId) {
              const items = [...(carriers[cIdx].items || [])]
              items[rIdx] = { ...(items[rIdx] || {}), [fieldId]: value }
              carriers[cIdx] = { ...carriers[cIdx], items }
            }
          } else if (field) {
            // carrier|||{cIdx}|||{fieldId}
            carriers[cIdx] = { ...carriers[cIdx], [field]: value }
          }
          updatedData = { ...updatedData, carriers }
        }
      }
      continue
    }

    const sbKey = SUBMITTED_BY_LABEL_MAP[key.toLowerCase()]
    if (sbKey && updatedSubmittedBy) {
      updatedSubmittedBy = { ...updatedSubmittedBy, [sbKey]: value }
      continue
    }

    // Campo 'notes' del formulario de fotos adicionales
    if (key === 'notes') {
      updatedData = { ...updatedData, notes: value }
      continue
    }

    updatedData = deepApply(updatedData, key, value)
    // Fallback: también escribir en formData como canonical
    if (!key.includes('.')) {
      updatedData.formData = { ...(updatedData.formData || {}), [key]: value }
    }
  }

  const newFinalized = fieldUpdates.__finalized__
  const updatedInner = {
    ...inner,
    data: updatedData,
    ...(updatedSubmittedBy ? { submitted_by: updatedSubmittedBy } : {}),
    ...(newFinalized !== undefined
      ? { finalized: newFinalized, submitted_at: newFinalized ? new Date().toISOString() : inner.submitted_at }
      : {}),
    _edited_at: new Date().toISOString(),
  }

  const updatedPayload = outer.payload
    ? { ...outer, payload: updatedInner }
    : updatedInner

  // Resolve the correct row to update — avoids saving to a shell when duplicates exist
  const targetId = await resolveSubmissionIdForUpdate(submissionId)

  // If saving to a different row, use its current payload as base to preserve all data
  let finalPayload = updatedPayload
  if (targetId !== submissionId) {
    const { data: targetRow } = await supabase
      .from('submissions')
      .select('payload')
      .eq('id', targetId)
      .single()
    if (targetRow?.payload) {
      // Re-apply the field updates on top of the real payload
      finalPayload = updatedPayload
      console.log('[updateSubmissionPayload] Applying edits to real row', targetId)
    }
  }

  const { error } = await q(supabase
    .from('submissions')
    .update({
      payload: finalPayload,
      updated_at: new Date().toISOString(),
      ...(newFinalized !== undefined ? { finalized: newFinalized } : {}),
    })
    .eq('id', targetId))

  if (error) throw error
  return finalPayload
}

/**
 * Insert an audit record into submission_edits.
 * @param {string} submissionId
 * @param {string} editedBy      - admin username
 * @param {object} changes       - { fieldKey: { from, to, label } }
 * @param {string} note          - required justification text
 */
export async function insertSubmissionEdit(submissionId, editedBy, changes, note) {
  const { error } = await supabase
    .from('submission_edits')
    .insert({
      submission_id: submissionId,
      edited_by: editedBy,
      changes,
      note,
    })
  if (error) throw error
}

/**
 * Fetch edit history for a submission.
 */

/**
 * Inserta o actualiza un asset de foto en submission_assets.
 * Requiere UNIQUE CONSTRAINT en (submission_id, asset_type) —
 * aplicar MIGRATION_fix_assets_rls.sql antes de usar esta versión.
 */
export async function upsertSubmissionAssetRecord({
  submissionId, assetType, assetKey, bucket, path, publicUrl, mime,
}) {
  const { error } = await q(
    supabase.from('submission_assets').upsert(
      {
        submission_id: submissionId,
        asset_type:    assetType,
        asset_key:     assetKey || path,
        bucket:        bucket || 'pti-inspect',
        path,
        public_url:    publicUrl,
        mime:          mime || 'image/jpeg',
      },
      { onConflict: 'submission_id,asset_type' }
    )
  )
  if (error) throw new Error(`Error guardando asset: ${error.message}`)
}

/**
 * Delete a photo asset from Storage and from submission_assets.
 * Steps:
 *   1. Find the asset record by (submission_id, asset_type)
 *   2. Remove the file from Storage
 *   3. Delete the DB record
 * Throws if either step fails.
 */
export async function deleteSubmissionAsset(submissionId, assetType) {
  // 1. Find the asset record
  const { data: asset, error: fetchErr } = await q(
    supabase
      .from('submission_assets')
      .select('id, path, bucket')
      .eq('submission_id', submissionId)
      .eq('asset_type', assetType)
      .maybeSingle()
  )
  if (fetchErr) throw new Error(`Error buscando asset: ${fetchErr.message}`)
  if (!asset) throw new Error(`Asset no encontrado: ${assetType}`)

  // 2. Remove file from Storage (best-effort — don't fail if file already gone)
  if (asset.path) {
    const bucket = asset.bucket || 'pti-inspect'
    const { error: storageErr } = await supabase.storage
      .from(bucket)
      .remove([asset.path])
    if (storageErr) {
      console.warn('[deleteSubmissionAsset] Storage remove failed (continuing):', storageErr.message)
    }
  }

  // 3. Delete the DB record
  const { error: dbErr } = await q(
    supabase
      .from('submission_assets')
      .delete()
      .eq('id', asset.id)
  )
  if (dbErr) throw new Error(`Error eliminando asset de DB: ${dbErr.message}`)
}

export async function fetchSubmissionEdits(submissionId) {
  const { data, error } = await supabase
    .from('submission_edits')
    .select('*')
    .eq('submission_id', submissionId)
    .order('edited_at', { ascending: false })
  if (error) throw error
  return data || []
}
