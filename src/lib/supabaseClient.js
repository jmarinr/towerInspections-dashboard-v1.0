import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || 'https://kmdkiyrjmvxnmfdvsofq.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CxNVu9USPtgY2pozE6YiMA_fUds9QZ4'

// Lock no-op: deshabilita navigator.locks del SDK de Supabase.
// El navigator.locks es un Web Lock API del browser — bloquea TODA operación
// de auth (getSession, getUser, refreshSession, functions.invoke internamente)
// mientras _recoverAndRefresh() corre al volver al tab.
// En una app de admin con un solo tab activo este lock solo causa problemas.
// Sin él, el SDK sigue funcionando correctamente — solo pierde la coordinación
// entre múltiples tabs del mismo sitio, que no aplica aquí.
const lockNoOp = async (name, acquireTimeout, fn) => fn()

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: false,
    storageKey:         'pti_admin_session',
    lock:               lockNoOp,
  },
  realtime: {
    reconnectAfterMs:    (tries) => Math.min(tries * 1000, 10000),
    heartbeatIntervalMs: 15000,
    timeout:             20000,
  },
})
