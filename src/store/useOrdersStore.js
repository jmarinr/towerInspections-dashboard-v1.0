import { create } from 'zustand'
import { fetchSiteVisits, fetchSiteVisitById, fetchSubmissionsWithAssetsForVisit } from '../lib/supabaseQueries'
import { useAuthStore } from './useAuthStore'

/**
 * v4.13.1 — filtros derivados del usuario actual.
 * La exclusión de empresas/regiones internas ahora vive en BD via flag
 * `internal` + RLS. El frontend solo aplica:
 *   admin                            → ningún filtro
 *   supervisor/viewer scope=global   → confiar en RLS
 *   supervisor/viewer scope=scoped   → filtra por org_code (+ region_ids si los tiene)
 */
function getOrgCodeFilter() {
  const user = useAuthStore.getState().user
  if (!user) return null
  if (user.role === 'admin') return null
  if (user.scope === 'global') return null
  return user.company?.org_code || null
}

function getRegionIdsFilter() {
  const user = useAuthStore.getState().user
  if (!user) return null
  if (user.role === 'admin') return null
  if (user.scope !== 'scoped') return null
  const ids = Array.isArray(user.region_ids) ? user.region_ids : []
  return ids.length > 0 ? ids : null
}

export const useOrdersStore = create((set, get) => ({
  orders: [],
  isLoading:        false,
  loadingStartedAt: null,
  error:            null,
  filterStatus: 'all',
  filterRegion: 'all',
  search: '',
  lastFetch: null,

  load: async (force = false) => {
    const state = get()
    const isEmpty = state.orders.length === 0
    console.log('[Orders] load() called, force:', force, 'isEmpty:', isEmpty, 'isLoading:', state.isLoading, 'age:', state.lastFetch ? Date.now()-state.lastFetch : 'never')
    // Si isLoading lleva >15s activo, es un estado huérfano — resetear y continuar
    if (state.isLoading) {
      const loadAge = state.loadingStartedAt ? Date.now() - state.loadingStartedAt : 0
      if (loadAge < 20000) return
      set({ isLoading: false, loadingStartedAt: null })
    }
    const age = state.lastFetch ? Date.now() - state.lastFetch : Infinity
    if (!isEmpty && age < 5000) return
    if (!force && !isEmpty && age < 10000) return

    const showSpinner = isEmpty
    set({ isLoading: true, loadingStartedAt: Date.now(), error: null })

    console.log('[Orders] fetching site_visits...')
    const timeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false, loadingStartedAt: null })
        if (get().orders.length === 0) {
          set({ error: 'Tiempo de espera agotado. Verifica tu conexión.' })
          setTimeout(() => {
            if (useOrdersStore.getState().orders.length === 0) {
              useOrdersStore.getState().load(true)
            }
          }, 5000)
        }
      }
    }, 30000)

    try {
      const orgCode = getOrgCodeFilter()
      const regionIds = getRegionIdsFilter()
      console.log('[Orders] filters orgCode:', orgCode, 'regionIds:', regionIds)
      const data = await fetchSiteVisits({ orgCode, regionIds })
      clearTimeout(timeout)
      console.log('[Orders] site_visits OK, count:', data.length)
      set({ orders: data, isLoading: false, loadingStartedAt: null, lastFetch: Date.now(), error: null })
    } catch (err) {
      clearTimeout(timeout)
      console.error('[Orders] load() error:', err?.message)
      set({ error: err?.message || 'Error al cargar órdenes', isLoading: false })
    }
  },

  setFilter: (patch) => set(patch),

  getFiltered: () => {
    const { orders, filterStatus, filterRegion, search } = get()

    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      // Filtrar por estado — soporta sub-estados con subState embebido
      if (filterStatus !== 'all') {
        if (filterStatus === 'closed') {
          if (o.status !== 'closed') return false
        } else if (filterStatus === 'open') {
          if (o.status !== 'open') return false
        } else if (['con-avance', 'sin-iniciar', 'en-curso', 'cancelled'].includes(filterStatus)) {
          if (o.subState !== filterStatus) return false
        }
      }
      // Filtrar por región (filtro UI, no de seguridad). Comparación por UUID
      // directo contra region_id — sin parsear order_number.
      if (filterRegion !== 'all') {
        if (o.region_id !== filterRegion) return false
      }
      // Filtrar por búsqueda
      if (!q) return true
      return [
        o.order_number, o.site_id, o.site_name,
        o.inspector_name, o.inspector_username,
      ].join(' ').toLowerCase().includes(q)
    })
  },

  // Detail
  activeOrder: null,
  activeOrderSubmissions: [],
  isLoadingDetail: false,

  loadDetail: async (id) => {
    set({ isLoadingDetail: true, activeOrder: null, activeOrderSubmissions: [] })
    try {
      const [order, submissions] = await Promise.all([
        fetchSiteVisitById(id),
        fetchSubmissionsWithAssetsForVisit(id).catch(() => []),
      ])
      set({ activeOrder: order, activeOrderSubmissions: submissions, isLoadingDetail: false })
    } catch (err) {
      set({ isLoadingDetail: false, error: err?.message || 'Error al cargar orden' })
    }
  },

  clearDetail: () => set({ activeOrder: null, activeOrderSubmissions: [] }),
}))
