import { create } from 'zustand'
import { fetchSubmissions, fetchSubmissionWithAssets, fetchDashboardStats, fetchSubmissionById } from '../lib/supabaseQueries'
import { supabase } from '../lib/supabaseClient'
import { logEvent } from '../lib/logEvent'

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
    // Si data está vacía, siempre recargar aunque el cache sea reciente
    const isEmpty = state.submissions.length === 0
    if (!force && !isEmpty && state.lastFetch && Date.now() - state.lastFetch < 10000) return
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
            const newSub = await fetchSubmissionById(payload.new.id)
            if (!newSub) return
            set((state) => ({
              submissions: [newSub, ...state.submissions],
              lastRealtimeEvent: { type: 'INSERT', id: newSub.id, ts: Date.now() },
            }))
            get().loadStats()
            // Log entrada de nuevo formulario
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
                  ? updatedSub
                  : state.activeSubmission,
              lastRealtimeEvent: { type: 'UPDATE', id: updatedSub.id, ts: Date.now() },
            }))
            // Log solo si cambió a finalizado
            if (payload.new.finalized && !payload.old.finalized) {
              const site = updatedSub.site || {}
              logEvent({
                event_type: 'submission.finalized',
                message: `Formulario finalizado: ${updatedSub.formMeta?.label || updatedSub.form_code} — ${site.nombreSitio || site.idSitio || 'Sin sitio'}`,
                severity: 'info',
                metadata: {
                  submission_id: updatedSub.id,
                  form_code:     updatedSub.form_code,
                  site_name:     site.nombreSitio,
                  org_code:      payload.new.org_code,
                },
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
                visit_id:     payload.new.id,
                order_number: payload.new.order_number,
                site_id:      payload.new.site_id,
                site_name:    payload.new.site_name,
                org_code:     payload.new.org_code,
                inspector:    payload.new.inspector_name || payload.new.inspector_username,
              },
            })
          } catch { /* silencioso */ }
        }
      )

      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_visits' },
        (payload) => {
          try {
            // Loggear solo si cambió el status
            if (payload.new.status !== payload.old.status) {
              logEvent({
                event_type: 'visit.status_changed',
                message: `Visita actualizada: Orden ${payload.new.order_number || payload.new.id?.slice(0,8)} → ${payload.new.status}`,
                severity: 'info',
                metadata: {
                  visit_id:     payload.new.id,
                  order_number: payload.new.order_number,
                  old_status:   payload.old.status,
                  new_status:   payload.new.status,
                  org_code:     payload.new.org_code,
                },
              })
            }
          } catch { /* silencioso */ }
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
