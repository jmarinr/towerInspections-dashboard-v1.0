import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useOrdersStore } from '../store/useOrdersStore.js'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import StructuredData from '../components/StructuredData.jsx'

export default function ReportView() {
  const { orderId } = useParams()
  const orders = useOrdersStore(s => s.orders)
  const byId = useOrdersStore(s => s.byId)
  const order = useMemo(() => byId(orderId), [orders, orderId])

  if (!order) {
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6">
        <div className="text-center">
          <div className="font-extrabold text-primary">Orden no encontrada</div>
          <div className="text-sm text-primary/60 mt-2">Vuelve a Órdenes</div>
          <Link to="/orders"><Button variant="outline" className="mt-4">Ir a Órdenes</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3 no-print">
          <Link to={`/orders/${order.id}`}>
            <Button variant="outline"><ArrowLeft size={16}/> Volver</Button>
          </Link>
          <Button variant="accent" onClick={() => window.print()}>
            <Printer size={16}/> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="mt-6 border border-primary/10 rounded-3xl p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-primary/60 font-bold">Informe</div>
              <div className="text-2xl font-extrabold text-primary mt-1">{order.id}</div>
              <div className="text-sm text-primary/70 mt-1">{order.type} · {order.siteName} ({order.siteId})</div>
            </div>
            <Badge tone={order.status === 'reviewed' ? 'success' : order.status === 'submitted' ? 'warning' : 'neutral'}>
              {order.status}
            </Badge>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-primary/5 p-4">
              <div className="text-[11px] text-primary/60 font-bold">Inspector</div>
              <div className="text-sm font-extrabold text-primary mt-1">{order.inspectorName}</div>
              <div className="text-[11px] text-primary/60 mt-2">Actualización: {new Date(order.updatedAt).toLocaleString()}</div>
            </div>
            <div className="rounded-3xl bg-primary/5 p-4">
              <div className="text-[11px] text-primary/60 font-bold">Completitud</div>
              <div className="text-sm font-extrabold text-primary mt-1">{Math.round(order.completion * 100)}%</div>
              <div className="text-[11px] text-primary/60 mt-2">Fotos incluidas: {order.photos.length}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-extrabold text-primary">Resumen</div>
            <div className="text-sm text-primary/75 mt-2">{order.notes}</div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-extrabold text-primary">Datos</div>
            <div className="mt-3">
              <StructuredData data={order.payload} />
            </div>
          </div>

          {order.photos.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-extrabold text-primary">Evidencia fotográfica</div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {order.photos.map((p) => (
                  <div key={p.id} className="rounded-3xl overflow-hidden border border-primary/10">
                    <img src={p.url} alt={p.label} className="w-full h-32 object-cover" />
                    <div className="p-2">
                      <div className="text-xs font-extrabold text-primary truncate">{p.label}</div>
                      <div className="text-[11px] text-primary/60 truncate">{p.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
