import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || 'https://kmdkiyrjmvxnmfdvsofq.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CxNVu9USPtgY2pozE6YiMA_fUds9QZ4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: false,
    storageKey:         'pti_admin_session',
    // El SDK adquiere un lock interno al volver al tab (visibilitychange)
    // para ejecutar _recoverAndRefresh(). El default es 10s.
    // Subimos a 30s para que las operaciones del usuario esperen el lock
    // en lugar de fallar con timeout mientras el refresh está en curso.
    lockAcquireTimeout: 30000,
  },
  realtime: {
    reconnectAfterMs:    (tries) => Math.min(tries * 1000, 10000),
    heartbeatIntervalMs: 15000,
    timeout:             20000,
  },
})
