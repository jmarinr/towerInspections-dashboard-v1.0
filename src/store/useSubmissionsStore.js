import { create } from 'zustand'
import { fetchSubmissions, fetchSubmissionWithAssets, fetchDashboardStats, fetchSubmissionById } from '../lib/supabaseQueries'
import { supabase } from '../lib/supabaseClient'
import { logEvent } from '../lib/logEvent'

// ── Realtime singleton ────────────────────────────────────────────────────────
let _channel   = null
let _connecting = false  // lock para evitar race conditions

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
    const isEmpty = state.submissions.length === 0
    if (!force && !isEmpty && state.lastFetch && Date.now() - state.lastFetch < 10000) return
    set({ isLoading: true, error: null })

    // Timeout de seguridad — si el fetch tarda más de 10s, parar el spinner
    const timeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false, error: 'Tiempo de espera agotado. Verifica tu conexión.' })
      }
    }, 20000)

    try {
      const data = await fetchSubmissions()
      clearTimeout(timeout)
      set({ submissions: data, isLoading: false, lastFetch: Date.now(), error: null })
    } catch (err) {
      clearTimeout(timeout)
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
    const timeout = setTimeout(() => {
      if (get().isLoadingStats) {
        set({ isLoadingStats: false, error: 'Tiempo de espera agotado. Verifica tu conexión.' })
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

  // ── Realtime ──────────────────────────────────────────────────────────────

  /**
   * Suscribirse a cambios en vivo.
   * Seguro llamarlo múltiples veces — lock interno previene race conditions.
   */
  subscribeRealtime: async () => {
    // Lock: evita múltiples conexiones simultáneas
    if (_connecting) return
    // Canal ya activo — no hacer nada
    if (_channel) {
      const s = _channel.state
      if (s === 'joined' || s === 'joining') return
      // Canal en estado inválido — limpiar antes de reconectar
      try { await supabase.removeChannel(_channel) } catch {}
      _channel = null
    }

    _connecting = true
    set({ realtimeStatus: 'connecting' })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        _connecting = false
        set({ realtimeStatus: 'disconnected' })
        return
      }

      _channel = supabase
        .channel('pti_realtime_v2')

        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'submissions' },
          async (payload) => {
            try {
              const newSub = await fetchSubmissionById(payload.new.id)
              if (!newSub) return
              set((state) => ({
                submissions: [newSub, ...state.submissions],
                lastRealtimeEvent: { type: 'INSERT', id: newSub.id, ts: Date.now() },
              }))
              get().loadStats()
              const site = newSub.site || {}
              const formMeta = newSub.formMeta || {}
              logEvent({
                event_type: 'submission.received',
                message: `Nuevo formulario recibido: ${formMeta.label || newSub.form_code} — ${site.nombreSitio || site.idSitio || 'Sin sitio'}`,
                severity: 'info',
                metadata: {
                  submission_id: newSub.id,
                  form_code:     newSub.form_code,
                  site_name:     site.nombreSitio,
                  site_id:       site.idSitio,
                  org_code:      payload.new.org_code,
                  inspector:     newSub.submittedBy?.name || newSub.device_id,
                  finalized:     payload.new.finalized,
                },
              })
            } catch { /* silencioso */ }
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
                activeSubmission:
                  state.activeSubmission?.id === updatedSub.id
                    ? updatedSub : state.activeSubmission,
                lastRealtimeEvent: { type: 'UPDATE', id: updatedSub.id, ts: Date.now() },
              }))
              if (payload.new.finalized && !payload.old.finalized) {
                const site = updatedSub.site || {}
                logEvent({
                  event_type: 'submission.finalized',
                  message: `Formulario finalizado: ${updatedSub.formMeta?.label || updatedSub.form_code} — ${site.nombreSitio || site.idSitio || 'Sin sitio'}`,
                  severity: 'info',
                  metadata: { submission_id: updatedSub.id, form_code: updatedSub.form_code, org_code: payload.new.org_code },
                })
              }
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

        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'site_visits' },
          (payload) => {
            try {
              logEvent({
                event_type: 'visit.received',
                message: `Nueva visita recibida: Orden ${payload.new.order_number || payload.new.id?.slice(0,8)} — Sitio ${payload.new.site_name || payload.new.site_id || ''}`,
                severity: 'info',
                metadata: {
                  visit_id: payload.new.id, order_number: payload.new.order_number,
                  site_id: payload.new.site_id, site_name: payload.new.site_name,
                  org_code: payload.new.org_code,
                  inspector: payload.new.inspector_name || payload.new.inspector_username,
                },
              })
            } catch { /* silencioso */ }
          }
        )

        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'site_visits' },
          (payload) => {
            try {
              if (payload.new.status !== payload.old.status) {
                logEvent({
                  event_type: 'visit.status_changed',
                  message: `Visita actualizada: Orden ${payload.new.order_number || payload.new.id?.slice(0,8)} → ${payload.new.status}`,
                  severity: 'info',
                  metadata: {
                    visit_id: payload.new.id, order_number: payload.new.order_number,
                    old_status: payload.old.status, new_status: payload.new.status,
                    org_code: payload.new.org_code,
                  },
                })
              }
            } catch { /* silencioso */ }
          }
        )

        .subscribe((status) => {
          _connecting = false  // liberar lock siempre
          if (status === 'SUBSCRIBED') {
            set({ realtimeStatus: 'connected' })
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            set({ realtimeStatus: 'error' })
            _channel = null
          } else if (status === 'CLOSED') {
            set({ realtimeStatus: 'disconnected' })
            _channel = null
          }
        })

    } catch {
      _connecting = false
      _channel = null
      set({ realtimeStatus: 'error' })
    }
  },

  unsubscribeRealtime: async () => {
    _connecting = false
    if (_channel) {
      try { await supabase.removeChannel(_channel) } catch {}
      _channel = null
    }
    set({ realtimeStatus: 'disconnected' })
  },
}))
