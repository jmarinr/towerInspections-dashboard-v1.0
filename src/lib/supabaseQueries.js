import { supabase } from './supabaseClient'

/**
 * Fetch all submissions, ordered by most recent update.
 * Optionally filter by form_code.
 */
export async function fetchSubmissions({ formCode, limit = 200 } = {}) {
  let query = supabase
    .from('submissions')
    .select('id, org_code, device_id, form_code, form_version, app_version, payload, last_saved_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (formCode && formCode !== 'all') {
    query = query.eq('form_code', formCode)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
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
  return data
}

/**
 * Fetch all assets (photos) for a given submission.
 */
export async function fetchSubmissionAssets(submissionId) {
  const { data, error } = await supabase
    .from('submission_assets')
    .select('id, asset_key, asset_type, bucket, public_url, created_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Fetch submission + its assets in one go.
 */
export async function fetchSubmissionWithAssets(id) {
  const [submission, assets] = await Promise.all([
    fetchSubmissionById(id),
    fetchSubmissionAssets(id),
  ])
  return { submission, assets }
}

/**
 * Get aggregate stats for the dashboard.
 */
export async function fetchDashboardStats() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, form_code, updated_at, created_at')
    .order('updated_at', { ascending: false })

  if (error) throw error
  const rows = data || []

  const total = rows.length
  const byFormCode = {}
  for (const r of rows) {
    byFormCode[r.form_code] = (byFormCode[r.form_code] || 0) + 1
  }

  // Last 7 days activity
  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const recentCount = rows.filter(r => new Date(r.updated_at).getTime() > weekAgo).length

  // Last 5 updated
  const recent = rows.slice(0, 5)

  return { total, byFormCode, recentCount, recent }
}
