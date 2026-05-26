import { Package, Loader2, CheckCircle2, AlertCircle, X, Trash2 } from 'lucide-react'
import { useDownloadQueue } from '../store/useDownloadQueue'

const PHASE_LABEL = { pdfs: 'Generando PDFs…', fotos: 'Descargando fotos…', zip: 'Comprimiendo…' }

function JobRow({ job, onRemove }) {
  const isProcessing = job.status === 'processing'
  const isDone       = job.status === 'done'
  const isError      = job.status === 'error'

  return (
    <div className="px-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0">
          {isProcessing && <Loader2 size={14} className="animate-spin text-emerald-600" />}
          {isDone       && <CheckCircle2 size={14} className="text-emerald-600" />}
          {isError      && <AlertCircle size={14} className="text-red-500" />}
          {job.status === 'pending' && <Package size={14} className="th-text-m" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold th-text-p truncate">{job.orderNumber}</div>
          <div className="text-[10.5px] th-text-m">
            {isProcessing && (PHASE_LABEL[job.phase] || 'Procesando…')}
            {isDone       && 'Listo · descargado'}
            {isError      && (job.error || 'Error al generar el paquete')}
            {job.status === 'pending' && 'En cola…'}
          </div>
        </div>
        {(isDone || isError) && (
          <button onClick={() => onRemove(job.id)} title="Quitar de la lista"
            className="p-1 rounded th-text-m hover:text-red-500 transition-colors flex-shrink-0">
            <X size={13} />
          </button>
        )}
      </div>
      {isProcessing && (
        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${job.progress || 0}%`, background: '#0F6E56' }} />
        </div>
      )}
    </div>
  )
}

// Panel flotante (esquina inferior derecha) con el detalle de la cola.
// Se monta dentro de Visitas. Auto-oculto cuando la cola está vacía.
export default function DownloadQueuePanel() {
  const jobs          = useDownloadQueue(s => s.jobs)
  const removeJob     = useDownloadQueue(s => s.removeJob)
  const clearFinished = useDownloadQueue(s => s.clearFinished)

  if (!jobs.length) return null

  const finishedCount = jobs.filter(j => j.status === 'done' || j.status === 'error').length

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl shadow-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
        <div className="flex items-center gap-2">
          <Package size={14} className="th-text-p" />
          <span className="text-[12.5px] font-semibold th-text-p">Descargas</span>
          <span className="text-[10.5px] th-text-m tabular-nums">({jobs.length})</span>
        </div>
        {finishedCount > 0 && (
          <button onClick={clearFinished} title="Limpiar completadas"
            className="inline-flex items-center gap-1 text-[10.5px] th-text-m hover:text-red-500 transition-colors">
            <Trash2 size={11} /> Limpiar
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {jobs.map(job => <JobRow key={job.id} job={job} onRemove={removeJob} />)}
      </div>
    </div>
  )
}
