import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kmdkiyrjmvxnmfdvsofq.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_CxNVu9USPtgY2pozE6YiMA_fUds9QZ4'

// Read-only client for the Admin Panel.
// This panel NEVER inserts, updates or deletes data.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
