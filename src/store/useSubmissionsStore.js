import { create } from 'zustand'
import { fetchSubmissions, fetchSubmissionWithAssets, fetchDashboardStats, fetchSubmissionById } from '../lib/supabaseQueries'
import { supabase } from '../lib/supabaseClient'

// Realtime channel singleton — fuera del store para que no se serialice ni se recree
let _channel = null

export const useSubmissionsStore = create((set, get) => ({

  // ── Lista ────────────────────────────────────────────────────────────────────
  submissions: [],
  isLoading: false,
  error: null,
  filterFormCode: 'all',
  search: '',
  lastFetch: null,

  // ── Estado de conexión Realtime ───────────────────────────────────────────
  // 'disconnected' | 'connecting' | 'connected' | 'error'
  realtimeStatus: 'disconnected',
  // Último evento recibido — úsalo para mostrar un toast o badge en la UI
  lastRealtimeEvent: null, // { type: 'INSERT'|'UPDATE'|'DELETE', id, ts }

  load: async (force = false) => {
    const state = get()
    if (!force && state.lastFetch && Date.now() - state.lastFetch < 10000) return
    set({ isLoading: true, error: null })
    try {
      const data = await fetchSubmissions()
      set({ submissions: data, isLoading: false, lastFetch: Date.now() })
    } catch (err) {
      set({ error: err?.message || 'Error al cargar datos', isLoading: false })
    }
  },

  setFilter: (patch) => set(patch),

  getFiltered: () => {
    const { submissions, filterFormCode, search } = get()
    const q = search.trim().toLowerCase()
    return submissions.filter((s) => {
      const codeOk = filterFormCode === 'all' || s.form_code === filterFormCode
      if (!codeOk) return false
      if (!q) return true
      const payload = s.payload || {}
      const inner = payload.payload || payload
      const data = inner.data || {}
      const meta = inner.meta || {}
      const siteInfo = data.siteInfo || {}
      const formData = data.formData || {}
      const datosSection = data.datos || {}
      const submitter = inner.submitted_by || {}
      const searchableText = [
        s.id, s.form_code, s.device_id,
        meta.inspector || '',
        siteInfo.nombreSitio || '', siteInfo.idSitio || '', siteInfo.proveedor || '',
        formData.nombreSitio || '', formData.idSitio || '', formData.proveedor || '',
        datosSection.nombreSitio || '', datosSection.idSitio || '',
        submitter.name || '', submitter.username || '',
      ].join(' ').toLowerCase()
      return searchableText.includes(q)
    })
  },

  // ── Detalle ───────────────────────────────────────────────────────────────
  activeSubmission: null,
  activeAssets: [],
  isLoadingDetail: false,

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

  // ── Stats del Dashboard ───────────────────────────────────────────────────
  stats: null,
  isLoadingStats: false,

  loadStats: async () => {
    set({ isLoadingStats: true })
    try {
      const stats = await fetchDashboardStats()
      set({ stats, isLoadingStats: false })
    } catch (err) {
      set({ isLoadingStats: false })
    }
  },

  // ── Realtime ──────────────────────────────────────────────────────────────

  /**
   * Suscribirse a cambios en vivo de la tabla submissions.
   * Es seguro llamarlo varias veces — retorna temprano si ya está conectado.
   *
   * INSERT → agrega la nueva submission al inicio de la lista + refresca stats
   * UPDATE → actualiza la fila en la lista y en activeSubmission si está abierta
   * DELETE → elimina la fila de la lista + refresca stats
   */
  subscribeRealtime: () => {
    if (_channel) return

    set({ realtimeStatus: 'connecting' })

    _channel = supabase
      .channel('submissions_realtime')

      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        async (payload) => {
          try {
            // Traer la fila completa normalizada (igual que fetchSubmissions)
            const newSub = await fetchSubmissionById(payload.new.id)
            if (!newSub) return
            set((state) => ({
              submissions: [newSub, ...state.submissions],
              lastRealtimeEvent: { type: 'INSERT', id: newSub.id, ts: Date.now() },
            }))
            get().loadStats()
          } catch { /* silencioso — el próximo refresh manual lo corrige */ }
        }
      )

      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions' },
        async (payload) => {
          try {
            const updatedSub = await fetchSubmissionById(payload.new.id)
            if (!updatedSub) return
            set((state) => ({
              submissions: state.submissions.map((s) =>
                s.id === updatedSub.id ? updatedSub : s
              ),
              // Si el detalle de esta submission está abierto, actualízalo también
              activeSubmission:
                state.activeSubmission?.id === updatedSub.id
                  ? updatedSub
                  : state.activeSubmission,
              lastRealtimeEvent: { type: 'UPDATE', id: updatedSub.id, ts: Date.now() },
            }))
          } catch { /* silencioso */ }
        }
      )

      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'submissions' },
        (payload) => {
          const deletedId = payload.old.id
          set((state) => ({
            submissions: state.submissions.filter((s) => s.id !== deletedId),
            lastRealtimeEvent: { type: 'DELETE', id: deletedId, ts: Date.now() },
          }))
          get().loadStats()
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ realtimeStatus: 'connected' })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          set({ realtimeStatus: 'error' })
          _channel = null // permite reintentar en el próximo subscribeRealtime
        } else if (status === 'CLOSED') {
          set({ realtimeStatus: 'disconnected' })
          _channel = null
        }
      })
  },

  /**
   * Desuscribirse y limpiar el canal.
   * Llamar al logout o al desmontar la app.
   */
  unsubscribeRealtime: async () => {
    if (!_channel) return
    await supabase.removeChannel(_channel)
    _channel = null
    set({ realtimeStatus: 'disconnected' })
  },
}))
