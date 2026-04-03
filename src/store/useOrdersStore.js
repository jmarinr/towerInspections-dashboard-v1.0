import { create } from 'zustand'
import { fetchSiteVisits, fetchSiteVisitById, fetchSubmissionsWithAssetsForVisit } from '../lib/supabaseQueries'
import { useAuthStore } from './useAuthStore'
import { useSubmissionsStore } from './useSubmissionsStore'

export const useOrdersStore = create((set, get) => ({
  orders: [],
  isLoading:        false,
  loadingStartedAt: null,
  error:            null,
  filterStatus: 'all',
  search: '',
  lastFetch: null,

  load: async (force = false) => {
    const state = get()
    const isEmpty = state.orders.length === 0
    if (state.isLoading) return
    if (!force && !isEmpty && state.lastFetch && Date.now() - state.lastFetch < 10000) return

    const showSpinner = isEmpty
    set({ isLoading: showSpinner, loadingStartedAt: showSpinner ? Date.now() : null, error: null })

    const timeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false, loadingStartedAt: null, error: isEmpty ? 'Tiempo de espera agotado. Verifica tu conexión.' : null })
      }
    }, 40000)

    try {
      const data = await fetchSiteVisits()
      clearTimeout(timeout)
      set({ orders: data, isLoading: false, loadingStartedAt: null, lastFetch: Date.now(), error: null })
    } catch (err) {
      clearTimeout(timeout)
      set({ error: err?.message || 'Error al cargar órdenes', isLoading: false })
    }
  },

  setFilter: (patch) => set(patch),

  getFiltered: () => {
    const { orders, filterStatus, search } = get()

    // Filtro por empresa para supervisores con empresa asignada
    const user    = useAuthStore.getState().user
    const orgCode = (user?.role !== 'admin' && user?.company?.org_code) ? user.company.org_code : null

    // Derivar site_visit_ids permitidos desde submissions ya cargadas
    // (site_visits no tiene org_code, pero submissions sí)
    let allowedVisitIds = null
    if (orgCode) {
      const submissions = useSubmissionsStore.getState().submissions
      allowedVisitIds = new Set(
        submissions
          .filter(s => s.org_code === orgCode && s.site_visit_id)
          .map(s => s.site_visit_id)
      )
    }

    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      // Filtrar por empresa si aplica
      if (allowedVisitIds && !allowedVisitIds.has(o.id)) return false
      // Filtrar por estado
      const statusOk = filterStatus === 'all' || o.status === filterStatus
      if (!statusOk) return false
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
