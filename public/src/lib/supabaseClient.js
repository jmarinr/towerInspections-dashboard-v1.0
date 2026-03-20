import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || 'https://kmdkiyrjmvxnmfdvsofq.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CxNVu9USPtgY2pozE6YiMA_fUds9QZ4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: false,
    storageKey:         'pti_admin_session',
  },
  realtime: {
    // Reconexión automática con backoff exponencial
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
    // Heartbeat cada 15s para detectar conexiones caídas rápido
    heartbeatIntervalMs: 15000,
    // Timeout para intentos de conexión
    timeout: 20000,
  },
})
