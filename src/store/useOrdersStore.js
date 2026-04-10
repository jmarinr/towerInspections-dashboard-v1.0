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
    // Si isLoading lleva >15s activo, es un estado huérfano — resetear y continuar
    if (state.isLoading) {
      const loadAge = state.loadingStartedAt ? Date.now() - state.loadingStartedAt : 0
      if (loadAge < 20000) return
      // Estado huérfano detectado — resetear y continuar con la carga
      set({ isLoading: false, loadingStartedAt: null })
    }
    const age = state.lastFetch ? Date.now() - state.lastFetch : Infinity
    if (!isEmpty && age < 5000) return
    if (!force && !isEmpty && age < 10000) return

    const showSpinner = isEmpty
    // Siempre registrar loadingStartedAt para que el stale guard funcione correctamente
    set({ isLoading: true, loadingStartedAt: Date.now(), error: null })

    const timeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false, loadingStartedAt: null })
        if (get().orders.length === 0) {
          set({ error: 'Tiempo de espera agotado. Verifica tu conexión.' })
          // Retry automático a los 5s si no hay datos
          setTimeout(() => {
            if (useOrdersStore.getState().orders.length === 0) {
              useOrdersStore.getState().load(true)
            }
          }, 5000)
        }
      }
    }, 30000)  // 30s consistente con el timeout de fetchSiteVisits

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
