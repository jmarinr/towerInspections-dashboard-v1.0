/**
 * sdkReady — señal compartida entre Shell y cualquier operación que necesite
 * el SDK de Supabase después de un cambio de tab.
 *
 * Cuando el tab vuelve a ser visible, el SDK adquiere un lock interno para
 * _recoverAndRefresh(). Shell resuelve esta promesa cuando el SDK termina
 * (TOKEN_REFRESHED) o después de 1s de fallback.
 *
 * Cualquier operación crítica (save, invoke) puede llamar waitForSdkReady()
 * para asegurarse de que el lock está libre antes de proceder.
 */

let _resolve = null
let _promise = Promise.resolve()  // empieza resuelto — SDK está listo al inicio

export function markSdkBusy() {
  // Shell llama esto cuando el tab vuelve a ser visible
  _promise = new Promise(resolve => { _resolve = resolve })
}

export function markSdkReady() {
  // Shell llama esto cuando TOKEN_REFRESHED o fallback 1s
  if (_resolve) { _resolve(); _resolve = null }
}

export function waitForSdkReady(timeoutMs = 5000) {
  // Las operaciones de save llaman esto antes de ejecutar queries
  // Si el SDK ya está listo, resuelve inmediatamente
  // Si está ocupado, espera máximo timeoutMs antes de continuar de todas formas
  return Promise.race([
    _promise,
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ])
}
