import { supabase } from './supabaseClient'

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
 */
export async function fetchSubmissions({ formCode, limit = 200 } = {}) {
  let query = supabase
    .from('submissions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (formCode && formCode !== 'all') {
    query = query.eq('form_code', formCode)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map(normalizeSubmission)
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
 */
export async function fetchSubmissionWithAssets(id) {
  const [submission, assets] = await Promise.all([
    fetchSubmissionById(id),
    fetchSubmissionAssets(id),
  ])
  return { submission, assets }
}

// ═══════════════════════════════════════════
// SITE VISITS (Orders)
// ═══════════════════════════════════════════

/**
 * Fetch all site visits (orders).
 */
export async function fetchSiteVisits({ status, limit = 200 } = {}) {
  let query = supabase
    .from('site_visits')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
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
  return (data || []).map(normalizeSubmission)
}

/**
 * Fetch all submissions for an order detail, including their assets.
 */
export async function fetchSubmissionsWithAssetsForVisit(visitId) {
  const submissions = await fetchSubmissionsForVisit(visitId)
  // Fetch assets for each submission in parallel
  const withAssets = await Promise.all(
    submissions.map(async (sub) => {
      try {
        const assets = await fetchSubmissionAssets(sub.id)
        return { ...sub, assets }
      } catch {
        return { ...sub, assets: [] }
      }
    })
  )
  return withAssets
}

/**
 * Dashboard stats.
 */
export async function fetchDashboardStats() {
  // Fetch both tables in parallel
  const [subRes, visitRes] = await Promise.all([
    supabase.from('submissions').select('*').order('updated_at', { ascending: false }),
    supabase.from('site_visits').select('*').order('started_at', { ascending: false }).then(r => r).catch(() => ({ data: [], error: null })),
  ])

  if (subRes.error) throw subRes.error
  const rows = (subRes.data || []).map(normalizeSubmission)
  const visits = visitRes.data || []

  const total = rows.length
  const byFormCode = {}
  for (const r of rows) {
    const fc = r.form_code || 'unknown'
    byFormCode[fc] = (byFormCode[fc] || 0) + 1
  }

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const recentCount = rows.filter(r => new Date(r.updated_at).getTime() > weekAgo).length
  const recent = rows.slice(0, 5)

  // Visit stats
  const totalVisits = visits.length
  const openVisits = visits.filter(v => v.status === 'open').length
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
  const inner = p.payload || {}

  return {
    ...raw,
    form_code: raw.form_code || p.form_code || '',
    device_id: raw.device_id || p.device_id || '',
    org_code: raw.org_code || p.org_code || '',
    app_version: raw.app_version || p.app_version || '',
    form_version: raw.form_version || p.form_version || '',
    site_visit_id: raw.site_visit_id || p.site_visit_id || null,
    finalized: inner.finalized === true,
    payload: p,
  }
}
