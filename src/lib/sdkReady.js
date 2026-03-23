/**
 * sdkReady — coordina operaciones con el SDK de Supabase después de un cambio de tab.
 *
 * El SDK registra su propio visibilitychange y adquiere un lock interno para
 * _recoverAndRefresh(). Cualquier método de supabase.auth (getSession, getUser)
 * también adquiere ese lock — bloqueando saves y queries mientras corre.
 *
 * Soluciones:
 * 1. waitForSdkReady() — esperar a que el SDK termine antes de ejecutar saves
 * 2. getTokenFromStorage() — leer el token de localStorage directamente,
 *    sin pasar por el SDK ni adquirir ningún lock
 */

let _resolve = null
let _promise = Promise.resolve()  // empieza resuelto — SDK listo al inicio

export function markSdkBusy() {
  _promise = new Promise(resolve => { _resolve = resolve })
}

export function markSdkReady() {
  if (_resolve) { _resolve(); _resolve = null }
}

export function waitForSdkReady(timeoutMs = 35000) {
  // Usar 35s por defecto — cubre lockAcquireTimeout (30s) + margen
  return Promise.race([
    _promise,
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ])
}

/**
 * Lee el access_token directamente de localStorage sin adquirir el lock del SDK.
 * Usar para functions.invoke() donde necesitamos el token explícitamente.
 *
 * @returns {{ token: string|null, isExpired: boolean }}
 */
export function getTokenFromStorage() {
  try {
    const raw = localStorage.getItem('pti_admin_session')
    if (!raw) return { token: null, isExpired: true }
    const session = JSON.parse(raw)
    const token = session?.access_token || null
    const expiresAt = session?.expires_at || 0  // epoch seconds
    const isExpired = expiresAt > 0 && (expiresAt - Math.floor(Date.now() / 1000)) < 60
    return { token, isExpired }
  } catch {
    return { token: null, isExpired: true }
  }
}
