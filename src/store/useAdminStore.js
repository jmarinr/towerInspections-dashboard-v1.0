import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

export const useAdminStore = create((set, get) => ({

  // ── Users ──────────────────────────────────────────────────────────────────
  users:        [],
  usersLoading: false,
  usersLoaded:  false,

  loadUsers: async (force = false) => {
    if (get().usersLoading) return
    if (!force && get().usersLoaded) return
    set({ usersLoading: true })
    const t = setTimeout(() => set({ usersLoading: false }), 15000)
    try {
      const { data } = await supabase
        .from('app_users')
        .select('*, companies(name, org_code)')
        .order('full_name')
      set({ users: data || [], usersLoaded: true })
    } catch { /* silencioso */ } finally {
      clearTimeout(t)
      set({ usersLoading: false })
    }
  },

  // ── Companies ──────────────────────────────────────────────────────────────
  companies:        [],
  companiesLoading: false,
  companiesLoaded:  false,

  loadCompanies: async (force = false) => {
    if (get().companiesLoading) return
    if (!force && get().companiesLoaded) return
    set({ companiesLoading: true })
    const t = setTimeout(() => set({ companiesLoading: false }), 15000)
    try {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('name')
      set({ companies: data || [], companiesLoaded: true })
    } catch { /* silencioso */ } finally {
      clearTimeout(t)
      set({ companiesLoading: false })
    }
  },

  // ── Permissions ────────────────────────────────────────────────────────────
  permMatrix:        {},
  permLoading:       false,
  permLoaded:        false,

  loadPermissions: async (force = false) => {
    if (get().permLoading) return
    if (!force && get().permLoaded) return
    set({ permLoading: true })
    const t = setTimeout(() => set({ permLoading: false }), 15000)
    try {
      const { data } = await supabase
        .from('role_permissions')
        .select('role, permission, enabled')
      const m = {}
      ;(data || []).forEach(r => { m[`${r.role}:${r.permission}`] = r.enabled })
      set({ permMatrix: m, permLoaded: true })
    } catch { /* silencioso */ } finally {
      clearTimeout(t)
      set({ permLoading: false })
    }
  },

  setPermMatrix: (m) => set({ permMatrix: m }),

  // ── Logs ───────────────────────────────────────────────────────────────────
  logs:        [],
  logsLoading: false,
  logsTotal:   0,

  loadLogs: async ({ page = 0, filterType = 'all', filterSev = 'all', filterUser = '', search = '', pageSize = 50 } = {}) => {
    if (get().logsLoading) return
    set({ logsLoading: true })
    const t = setTimeout(() => set({ logsLoading: false }), 15000)
    try {
      let q = supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1)

      if (filterType !== 'all') q = q.eq('event_type', filterType)
      if (filterSev  !== 'all') q = q.eq('severity', filterSev)
      if (filterUser)           q = q.ilike('user_email', `%${filterUser}%`)
      if (search)               q = q.ilike('message', `%${search}%`)

      const { data, count } = await q
      set({ logs: data || [], logsTotal: count || 0 })
    } catch { /* silencioso */ } finally {
      clearTimeout(t)
      set({ logsLoading: false })
    }
  },

  // ── Invalidar cache (llamar después de mutaciones) ─────────────────────────
  invalidateUsers:    () => set({ usersLoaded: false }),
  invalidateCompanies: () => set({ companiesLoaded: false }),
}))
