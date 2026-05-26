import { create } from 'zustand'

// ── Cola de descargas (paquetes ZIP por orden) ─────────────────────────────
// Store global: alimenta el indicador del header (visible en todas las
// pantallas) y el panel detallado en Visitas. El motor de procesamiento
// secuencial vive en el Shell (procesa 1 job a la vez).
//
// Estados de un job: 'pending' → 'processing' → 'done' | 'error'
// phase (solo informativo durante processing): 'pdfs' | 'fotos' | 'zip'

let _seq = 0
const nextId = () => `dl_${Date.now()}_${++_seq}`

export const useDownloadQueue = create((set, get) => ({
  jobs: [],

  // ¿Hay algo activo? (para el indicador del header)
  hasActive: () => get().jobs.some(j => j.status === 'pending' || j.status === 'processing'),
  activeCount: () => get().jobs.filter(j => j.status === 'pending' || j.status === 'processing').length,

  // Encola un paquete ZIP para una orden. Evita duplicar si ya está en curso.
  enqueue: (order) => {
    const exists = get().jobs.some(
      j => j.orderId === order.id && (j.status === 'pending' || j.status === 'processing')
    )
    if (exists) return null
    const job = {
      id:          nextId(),
      orderId:     order.id,
      orderNumber: order.order_number || order.id?.slice(0, 8) || '—',
      siteId:      order.site_id || '',
      status:      'pending',
      phase:       null,
      progress:    0,
      error:       null,
      createdAt:   Date.now(),
    }
    set(state => ({ jobs: [...state.jobs, job] }))
    return job.id
  },

  updateJob: (id, patch) =>
    set(state => ({ jobs: state.jobs.map(j => (j.id === id ? { ...j, ...patch } : j)) })),

  removeJob: (id) =>
    set(state => ({ jobs: state.jobs.filter(j => j.id !== id) })),

  clearFinished: () =>
    set(state => ({ jobs: state.jobs.filter(j => j.status === 'pending' || j.status === 'processing') })),

  // Devuelve el siguiente job pendiente si NO hay ninguno procesando (secuencial).
  pickNext: () => {
    const { jobs } = get()
    if (jobs.some(j => j.status === 'processing')) return null
    return jobs.find(j => j.status === 'pending') || null
  },
}))
