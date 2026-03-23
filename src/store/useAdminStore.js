import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

export const useAdminStore = create((set, get) => ({

  // ── Users ─────────────────────────────────────────────────────────────
  users:        [],
  usersLoading: false,
  usersLoaded:  false,
  usersError:   null,

  loadUsers: async (force = false) => {
    if (get().usersLoading) return
    if (!force && get().usersLoaded) return
    set({ usersLoading: true, usersError: null })
    const t = setTimeout(() => set({ usersLoading: false, usersError: 'Tiempo de espera agotado.' }), 15000)
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*, companies(name, org_code)')
        .order('full_name')
      clearTimeout(t)
      if (error) { set({ usersError: error.message }); return }
      set({ users: data || [], usersLoaded: true, usersError: null })
    } catch (e) {
      clearTimeout(t)
      set({ usersError: e?.message || 'Error al cargar usuarios' })
    } finally {
      set({ usersLoading: false })
    }
  },

  // ── Companies ─────────────────────────────────────────────────────────
  companies:        [],
  companiesLoading: false,
  companiesLoaded:  false,
  companiesError:   null,

  loadCompanies: async (force = false) => {
    if (get().companiesLoading) return
    if (!force && get().companiesLoaded) return
    set({ companiesLoading: true, companiesError: null })
    const t = setTimeout(() => set({ companiesLoading: false, companiesError: 'Tiempo de espera agotado.' }), 15000)
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*, company_regions(region_id, regions(id, name))')
        .order('name')
      clearTimeout(t)
      if (error) { set({ companiesError: error.message }); return }
      set({ companies: data || [], companiesLoaded: true, companiesError: null })
    } catch (e) {
      clearTimeout(t)
      set({ companiesError: e?.message || 'Error al cargar empresas' })
    } finally {
      set({ companiesLoading: false })
    }
  },

  // ── Regions ───────────────────────────────────────────────────────────
  regions:        [],
  regionsLoading: false,
  regionsLoaded:  false,
  regionsError:   null,

  loadRegions: async (force = false) => {
    if (get().regionsLoading) return
    if (!force && get().regionsLoaded) return
    set({ regionsLoading: true, regionsError: null })
    const t = setTimeout(() => set({ regionsLoading: false, regionsError: 'Tiempo de espera agotado.' }), 15000)
    try {
      const { data, error } = await supabase
        .from('regions')
        .select(`
          *,
          sites(id, site_id, name, lat, lng, height_m, province, active),
          company_regions(company_id, companies(id, name, org_code))
        `)
        .order('name')
      clearTimeout(t)
      if (error) { set({ regionsError: error.message }); return }
      set({ regions: data || [], regionsLoaded: true, regionsError: null })
    } catch (e) {
      clearTimeout(t)
      set({ regionsError: e?.message || 'Error al cargar regiones' })
    } finally {
      set({ regionsLoading: false })
    }
  },

  // ── Permissions ───────────────────────────────────────────────────────
  permMatrix:  {},
  permLoading: false,
  permLoaded:  false,

  loadPermissions: async (force = false) => {
    if (get().permLoading) return
    if (!force && get().permLoaded) return
    set({ permLoading: true })
    const t = setTimeout(() => set({ permLoading: false }), 15000)
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission, enabled')
      clearTimeout(t)
      if (error) return
      const m = {}
      ;(data || []).forEach(r => { m[`${r.role}:${r.permission}`] = r.enabled })
      set({ permMatrix: m, permLoaded: true })
    } catch { clearTimeout(t) } finally { set({ permLoading: false }) }
  },

  setPermMatrix: (m) => set({ permMatrix: m }),

  // ── Logs ──────────────────────────────────────────────────────────────
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
      const { data, count, error } = await q
      clearTimeout(t)
      if (error) return
      set({ logs: data || [], logsTotal: count || 0 })
    } catch { clearTimeout(t) } finally { set({ logsLoading: false }) }
  },

  // ── Invalidar cache ───────────────────────────────────────────────────
  invalidateUsers:     () => set({ usersLoaded: false }),
  invalidateCompanies: () => set({ companiesLoaded: false }),
  invalidateRegions:   () => set({ regionsLoaded: false }),
}))
