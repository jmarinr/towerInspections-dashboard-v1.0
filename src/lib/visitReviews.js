import { supabase } from './supabaseClient'

// ── visit_reviews ──────────────────────────────────────────────────────────
// Estado de revisión por visita (1 fila por site_visit). Acceso restringido por
// RLS a admin y supervisor global; el cliente además oculta toda la UI para el
// resto de roles. Estas funciones asumen que el llamador ya validó canReview.

/**
 * Trae las reviews de un conjunto de visit_ids en una sola query.
 * Devuelve un mapa { [visit_id]: review }.
 * Si la RLS bloquea (rol sin acceso) o no hay ids, devuelve {} sin romper.
 */
export async function fetchVisitReviews(visitIds = []) {
  if (!visitIds.length) return {}
  const { data, error } = await supabase
    .from('visit_reviews')
    .select('visit_id, reviewed, reviewed_by, reviewed_at, comment, updated_at')
    .in('visit_id', visitIds)

  if (error) {
    console.error('[fetchVisitReviews]', error.message)
    return {}
  }
  const map = {}
  for (const r of (data || [])) map[r.visit_id] = r
  return map
}

/**
 * Upsert de una review por visit_id. `updates` puede incluir { reviewed, comment }.
 * Cuando se cambia `reviewed`, setea/limpia reviewed_by + reviewed_at con el actor.
 * org_code y region_id los hereda el trigger en Supabase (no se envían).
 * Devuelve la fila actualizada o lanza el error para que el caller revierta.
 */
export async function upsertVisitReview(visitId, updates = {}, actorEmail = null) {
  const payload = {
    visit_id:   visitId,
    updated_at: new Date().toISOString(),
    ...updates,
  }

  if ('reviewed' in updates) {
    if (updates.reviewed) {
      payload.reviewed_by = actorEmail
      payload.reviewed_at = new Date().toISOString()
    } else {
      payload.reviewed_by = null
      payload.reviewed_at = null
    }
  }

  const { data, error } = await supabase
    .from('visit_reviews')
    .upsert(payload, { onConflict: 'visit_id' })
    .select('visit_id, reviewed, reviewed_by, reviewed_at, comment, updated_at')
    .single()

  if (error) throw error
  return data
}
