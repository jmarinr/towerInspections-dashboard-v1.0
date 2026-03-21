import { create } from 'zustand'
import { fetchSubmissions, fetchSubmissionWithAssets, fetchDashboardStats, fetchSubmissionById } from '../lib/supabaseQueries'
import { supabase } from '../lib/supabaseClient'
import { logEvent } from '../lib/logEvent'

export const useSubmissionsStore = create((set, get) => ({

  // ── Lista ─────────────────────────────────────────────────────────────────
  submissions:   [],
  isLoading:     false,
  error:         null,
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
    if (!force && !isEmpty && state.lastFetch && Date.now() - state.lastFetch < 10000) return

    // Si ya hay datos, no mostrar spinner — refrescar en background silenciosamente
    const showSpinner = isEmpty
    set({ isLoading: showSpinner, error: null })

    const timeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false, error: isEmpty ? 'Tiempo de espera agotado. Verifica tu conexión.' : null })
      }
    }, 20000)

    try {
      const data = await fetchSubmissions()
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

      set({ submissions: data, isLoading: false, lastFetch: Date.now(), error: null })
    } catch (err) {
      clearTimeout(timeout)
      set({ error: err?.message || 'Error al cargar datos', isLoading: false })
    }
  },

  getFiltered: () => {
    const { submissions, filterFormCode, search } = get()
    const q = search.trim().toLowerCase()
    return submissions.filter(s => {
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
      set({ isLoadingDetail: false, error: err?.message || 'Error al cargar detalle' })
    }
  },

  clearDetail: () => set({ activeSubmission: null, activeAssets: [] }),

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats:           null,
  isLoadingStats:  false,

  loadStats: async () => {
    // Guard: no iniciar si ya hay una carga en curso
    if (get().isLoadingStats) return
    const hasStats = !!get().stats
    set({ isLoadingStats: !hasStats }) // spinner solo si no hay stats previas
    const timeout = setTimeout(() => {
      if (get().isLoadingStats) {
        set({ isLoadingStats: false })
      }
    }, 20000)
    try {
      const stats = await fetchDashboardStats()
      clearTimeout(timeout)
      set({ stats, isLoadingStats: false })
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
