/**
 * Wraps any Supabase query promise with a timeout.
 * Prevents saves from hanging forever when the network is slow
 * or recovering after a tab switch.
 *
 * Usage:
 *   const { data, error } = await q(
 *     supabase.from('companies').insert(payload).select('id').single()
 *   )
 */
// Timeout para operaciones de Supabase.
// El SDK adquiere un lock al volver al tab que puede durar hasta 10s
// (lockAcquireTimeout configurado en supabaseClient.js).
// Este timeout debe ser mayor que lockAcquireTimeout + tiempo real de la query.
// 35s = 30s lock + 5s query con margen.
export function q(promise, ms = 35000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('La operación tardó demasiado. Verifica tu conexión e intenta de nuevo.')),
        ms
      )
    ),
  ])
}
