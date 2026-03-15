import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * Muestra un error de carga con botón de retry.
 * Usar cuando isLoading=false, error!=null o data vacía tras timeout.
 */
export default function LoadError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full"
        style={{ background: '#fef2f2' }}>
        <AlertCircle size={22} style={{ color: '#dc2626' }} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold th-text-p mb-1">Error al cargar datos</p>
        <p className="text-[12px] th-text-m max-w-[280px] leading-relaxed">
          {message || 'No se pudieron cargar los datos. Verifica tu conexión.'}
        </p>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold flex items-center gap-2 text-white"
          style={{ background: '#0284C7' }}>
          <RefreshCw size={13} />
          Reintentar
        </button>
      )}
    </div>
  )
}
