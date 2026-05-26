import { useNavigate } from 'react-router-dom'
import { Package, Loader2 } from 'lucide-react'
import { useDownloadQueue } from '../store/useDownloadQueue'

// Indicador compacto para el header global. Visible en TODAS las pantallas
// mientras haya descargas pendientes/en curso. Clic → navega a Visitas, donde
// está el panel detallado. Se auto-oculta cuando no hay nada activo.
export default function DownloadQueueIndicator() {
  const navigate = useNavigate()
  const jobs = useDownloadQueue(s => s.jobs)

  const active = jobs.filter(j => j.status === 'pending' || j.status === 'processing')
  if (!active.length) return null

  const processing = active.find(j => j.status === 'processing')
  const label = active.length === 1 ? '1 descarga' : `${active.length} descargas`

  return (
    <button
      onClick={() => navigate('/orders')}
      title="Ver descargas en curso"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold
        text-white transition-colors hover:opacity-90"
      style={{ background: '#0F6E56' }}>
      {processing
        ? <Loader2 size={12} className="animate-spin" />
        : <Package size={12} />}
      <span className="tabular-nums">{label}</span>
      {processing && typeof processing.progress === 'number' && (
        <span className="tabular-nums opacity-80">{processing.progress}%</span>
      )}
    </button>
  )
}
