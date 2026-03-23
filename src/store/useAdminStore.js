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
    // Spinner solo si no hay datos previos — si hay datos, refrescar en silencio
    const hasData = get().users.length > 0
    set({ usersLoading: !hasData, usersError: null })
    const t = setTimeout(() => set({ usersLoading: false, usersError: hasData ? null : 'Tiempo de espera agotado.' }), 40000)
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*, companies(name, org_code)')
        .order('full_name')
      clearTimeout(t)
      if (error) { set({ usersError: hasData ? null : error.message }); return }
      set({ users: data || [], usersLoaded: true, usersError: null })
    } catch (e) {
      clearTimeout(t)
      if (!hasData) set({ usersError: e?.message || 'Error al cargar usuarios' })
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
    const hasData = get().companies.length > 0
    set({ companiesLoading: !hasData, companiesError: null })
    const t = setTimeout(() => set({ companiesLoading: false, companiesError: hasData ? null : 'Tiempo de espera agotado.' }), 40000)
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*, company_regions(region_id, regions(id, name))')
        .order('name')
      clearTimeout(t)
      if (error) { set({ companiesError: hasData ? null : error.message }); return }
      set({ companies: data || [], companiesLoaded: true, companiesError: null })
    } catch (e) {
      clearTimeout(t)
      if (!hasData) set({ companiesError: e?.message || 'Error al cargar empresas' })
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
    const hasData = get().regions.length > 0
    set({ regionsLoading: !hasData, regionsError: null })
    const t = setTimeout(() => set({ regionsLoading: false, regionsError: hasData ? null : 'Tiempo de espera agotado.' }), 40000)
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
      if (error) { set({ regionsError: hasData ? null : error.message }); return }
      set({ regions: data || [], regionsLoaded: true, regionsError: null })
    } catch (e) {
      clearTimeout(t)
      if (!hasData) set({ regionsError: e?.message || 'Error al cargar regiones' })
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
    const t = setTimeout(() => set({ permLoading: false }), 40000)
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
    const t = setTimeout(() => set({ logsLoading: false }), 40000)
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
