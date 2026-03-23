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
export function q(promise, ms = 12000) {
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
