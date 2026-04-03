import { create } from 'zustand'
import { fetchSubmissions, fetchSubmissionWithAssets, fetchDashboardStats } from '../lib/supabaseQueries'
import { supabase } from '../lib/supabaseClient'
import { logEvent } from '../lib/logEvent'
import { useAuthStore } from './useAuthStore'

/**
 * Devuelve el org_code a filtrar según el rol del usuario:
 *   - admin              → null (ve todo)
 *   - supervisor sin empresa → null (ve todo)
 *   - supervisor con empresa → org_code de su empresa
 */
function getOrgCodeFilter() {
  const user = useAuthStore.getState().user
  if (!user) return null
  if (user.role === 'admin') return null
  return user.company?.org_code || null
}

export const useSubmissionsStore = create((set, get) => ({

  // ── Lista ─────────────────────────────────────────────────────────────────
  submissions:   [],
  isLoading:        false,
  loadingStartedAt: null,  // para detectar spinner atascado
  error:            null,
  filterFormCode:'all',
  search:        '',
  lastFetch:     null,

  // ── Polling status (reemplaza Realtime) ───────────────────────────────────
  // 'idle' | 'polling' | 'error'
  realtimeStatus:    'idle',
  lastRealtimeEvent: null,

  load: async (force = false) => {
    const state = get()
    const isEmpty = state.submissions.length === 0
    // Guard: no iniciar si ya hay una carga en curso
    if (state.isLoading) return
    // Cache inteligente: incluso con force=true, respetar datos muy frescos (<5s)
    // Previene queries duplicadas cuando múltiples componentes llaman load() al navegar
    const age = state.lastFetch ? Date.now() - state.lastFetch : Infinity
    if (!isEmpty && age < 5000) return
    if (!force && !isEmpty && age < 10000) return

    // Solo mostrar spinner si no hay datos previos — si ya hay datos, refrescar silenciosamente
    const showSpinner = isEmpty
    set({ isLoading: showSpinner, loadingStartedAt: showSpinner ? Date.now() : null, error: null })

    const timeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false, loadingStartedAt: null })
        // Solo mostrar error si no hay datos que mostrar
        if (get().submissions.length === 0) {
          set({ error: 'Tiempo de espera agotado. Verifica tu conexión.' })
        }
        // Retry automático a los 5s si hay error y no hay datos
        if (get().submissions.length === 0) {
          setTimeout(() => {
            if (useSubmissionsStore.getState().submissions.length === 0) {
              useSubmissionsStore.getState().load(true)
            }
          }, 5000)
        }
      }
    }, 45000)

    try {
      const orgCode = getOrgCodeFilter()
      const data = await fetchSubmissions({ orgCode })
      clearTimeout(timeout)

      // Detectar cambios reales vs el estado anterior
      const prev = get().submissions
      const prevIds = new Set(prev.map(s => s.id))
      const newItems = data.filter(s => !prevIds.has(s.id))
      if (newItems.length > 0) {
        set({ lastRealtimeEvent: { type: 'INSERT', id: newItems[0].id, ts: Date.now() } })
        newItems.forEach(s => {
          const site = s.site || {}
          logEvent({
            event_type: 'submission.received',
            message: `Formulario recibido: ${s.formMeta?.label || s.form_code} — ${site.nombreSitio || site.idSitio || 'Sin sitio'}`,
            severity: 'info',
            metadata: { submission_id: s.id, form_code: s.form_code, site_name: site.nombreSitio, org_code: s.org_code },
          })
        })
      }

      // Detectar cambios de estado finalized en submissions existentes
      const prevMap = Object.fromEntries(prev.map(s => [s.id, s]))
      const finalized = data.filter(s => prevMap[s.id] && !prevMap[s.id].finalized && s.finalized)
      if (finalized.length > 0) {
        set({ lastRealtimeEvent: { type: 'UPDATE', id: finalized[0].id, ts: Date.now() } })
      }

      set({ submissions: data, isLoading: false, loadingStartedAt: null, lastFetch: Date.now(), error: null })
    } catch (err) {
      clearTimeout(timeout)
      set({ error: err?.message || 'Error al cargar datos', isLoading: false })
    }
  },

  getFiltered: () => {
    const { submissions, filterFormCode, search } = get()
    const user    = useAuthStore.getState().user
    const orgCode = (user?.role !== 'admin' && user?.company?.org_code) ? user.company.org_code : null
    const q = search.trim().toLowerCase()
    return submissions.filter(s => {
      // Filtro por empresa (double-check client-side como safety net)
      if (orgCode && s.org_code && s.org_code !== orgCode) return false
      const codeOk = filterFormCode === 'all' || s.form_code === filterFormCode
      if (!codeOk) return false
      if (!q) return true
      const site = s.site || {}
      return [
        site.nombreSitio, site.idSitio,
        s.submittedBy?.name, s.submittedBy?.username,
        s.form_code,
      ].join(' ').toLowerCase().includes(q)
    })
  },

  setFilter: (patch) => set(patch),

  // ── Detalle ───────────────────────────────────────────────────────────────
  activeSubmission: null,
  activeAssets:     [],
  isLoadingDetail:  false,

  loadDetail: async (id) => {
    set({ isLoadingDetail: true, activeSubmission: null, activeAssets: [] })
    try {
      const { submission, assets } = await fetchSubmissionWithAssets(id)
      set({ activeSubmission: submission, activeAssets: assets, isLoadingDetail: false })
    } catch (err) {
      console.error('[loadDetail] error:', err?.message)
      set({ isLoadingDetail: false, error: err?.message || 'Error al cargar detalle' })
    }
  },

  /**
   * Refresca el detalle activo SIN limpiar activeSubmission/activeAssets.
   * Usar después de subir/eliminar fotos para evitar el "flash" de pantalla vacía
   * que ocurre cuando loadDetail setea activeSubmission: null al inicio.
   */
  refreshDetail: async (id) => {
    try {
      const { submission, assets } = await fetchSubmissionWithAssets(id)
      set({ activeSubmission: submission, activeAssets: assets })
    } catch (err) {
      console.error('[refreshDetail] error:', err?.message)
      // No limpiar activeSubmission en error — mantener datos actuales visibles
    }
  },

  /** Agrega un asset optimistamente al estado local (antes de que el servidor confirme). */
  addAsset: (asset) => set(s => ({
    activeAssets: [...(s.activeAssets || []), asset],
  })),

  /** Elimina un asset optimistamente del estado local por asset_type. */
  removeAsset: (assetType) => set(s => ({
    activeAssets: (s.activeAssets || []).filter(a => a.asset_type !== assetType),
  })),

  clearDetail: () => set({ activeSubmission: null, activeAssets: [] }),

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats:           null,
  isLoadingStats:  false,

  loadStats: async () => {
    if (get().isLoadingStats) return

    // Optimización: si ya tenemos submissions cargados (<5min), calcular stats localmente
    // sin hacer una query adicional a la DB
    const submissions = get().submissions
    const lastFetch   = get().lastFetch
    const statsAge    = get().stats?._ts ? Date.now() - get().stats._ts : Infinity
    if (submissions.length > 0 && lastFetch && statsAge < 300000) return // stats frescas <5min

    if (submissions.length > 0 && lastFetch && Date.now() - lastFetch < 60000) {
      // Calcular stats desde los datos ya en memoria
      const byFormCode = {}
      const now = Date.now()
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000
      let recentCount = 0
      for (const s of submissions) {
        const fc = s.form_code || 'unknown'
        byFormCode[fc] = (byFormCode[fc] || 0) + 1
        if (new Date(s.updated_at).getTime() > weekAgo) recentCount++
      }
      set({
        stats: {
          total: submissions.length,
          byFormCode,
          recentCount,
          recent: submissions.slice(0, 5),
          totalVisits: 0, openVisits: 0, closedVisits: 0, recentVisits: [],
          _ts: Date.now(),
          _fromCache: true,
        },
        isLoadingStats: false,
      })
      // Refrescar en background con datos reales para completar las stats de visitas
      fetchDashboardStats()
        .then(stats => set({ stats: { ...stats, _ts: Date.now() } }))
        .catch(() => {})
      return
    }

    const hasStats = !!get().stats
    set({ isLoadingStats: !hasStats })
    const timeout = setTimeout(() => {
      if (get().isLoadingStats) set({ isLoadingStats: false })
    }, 45000)
    try {
      const stats = await fetchDashboardStats()
      clearTimeout(timeout)
      set({ stats: { ...stats, _ts: Date.now() }, isLoadingStats: false })
    } catch (err) {
      clearTimeout(timeout)
      set({ isLoadingStats: false, error: err?.message || 'Error al cargar estadísticas' })
    }
  },

  // ── Polling (reemplaza WebSocket Realtime) ────────────────────────────────
  // Estas funciones existen para compatibilidad con Shell.jsx
  subscribeRealtime: () => {
    set({ realtimeStatus: 'polling' })
    // El polling real lo maneja Shell.jsx con setInterval
  },

  unsubscribeRealtime: () => {
    set({ realtimeStatus: 'idle' })
  },
}))
