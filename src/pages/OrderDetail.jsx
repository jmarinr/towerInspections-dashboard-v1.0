import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Image as ImageIcon, MapPin, User2, Calendar, ClipboardCheck } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import StructuredData from '../components/StructuredData.jsx'
import { useOrdersStore } from '../store/useOrdersStore.js'
import { downloadOrderPdf } from '../utils/pdf/generateOrderPdf.js'

const tone = (status) => (status === 'reviewed' ? 'success' : status === 'submitted' ? 'warning' : 'neutral')

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const load = useOrdersStore(s => s.load)
  const orders = useOrdersStore(s => s.orders)
  const byId = useOrdersStore(s => s.byId)

  const [photoOpen, setPhotoOpen] = useState(false)
  const [activePhoto, setActivePhoto] = useState(null)

  useEffect(() => {
    if (!orders.length) load()
  }, [])

  const order = useMemo(() => byId(orderId), [orders, orderId])
  useEffect(() => {
    if (orders.length && !order) navigate('/orders')
  }, [orders.length, order])

  if (!order) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </Button>

        <Button variant="accent" onClick={() => downloadOrderPdf(order)}>
          <Download size={16} /> Descargar informe
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-primary/60 font-bold">Orden</div>
            <div className="text-lg font-extrabold text-primary truncate">{order.id}</div>
            <div className="text-xs text-primary/60 mt-1 truncate">{order.type}</div>
          </div>
          <Badge tone={tone(order.status)}>{order.status}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-3xl border border-primary/10 p-3">
            <div className="text-[11px] text-primary/60 font-bold flex items-center gap-2"><MapPin size={14}/> Sitio</div>
            <div className="font-extrabold text-primary mt-1">{order.siteName}</div>
            <div className="text-xs text-primary/60">{order.siteId}</div>
          </div>
          <div className="rounded-3xl border border-primary/10 p-3">
            <div className="text-[11px] text-primary/60 font-bold flex items-center gap-2"><User2 size={14}/> Inspector</div>
            <div className="font-extrabold text-primary mt-1">{order.inspectorName}</div>
            <div className="text-xs text-primary/60">Prioridad: <span className="font-bold">{order.priority}</span></div>
          </div>
          <div className="rounded-3xl border border-primary/10 p-3">
            <div className="text-[11px] text-primary/60 font-bold flex items-center gap-2"><Calendar size={14}/> Actualización</div>
            <div className="font-extrabold text-primary mt-1">{new Date(order.updatedAt).toLocaleString()}</div>
            <div className="text-xs text-primary/60">Creada: {new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div className="rounded-3xl border border-primary/10 p-3">
            <div className="text-[11px] text-primary/60 font-bold flex items-center gap-2"><ClipboardCheck size={14}/> Completitud</div>
            <div className="font-extrabold text-primary mt-1">{Math.round(order.completion * 100)}%</div>
            <div className="text-xs text-primary/60">Fotos: <span className="font-bold">{order.photos.length}</span></div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-extrabold text-primary">Notas</div>
          <div className="text-sm text-primary/75 mt-1">{order.notes}</div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-primary">Información completa</div>
            <div className="text-xs text-primary/60 mt-1">Todos los campos capturados para esta orden.</div>
          </div>
        </div>

        <div className="mt-4">
          <StructuredData data={order.payload} />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-primary flex items-center gap-2">
              <ImageIcon size={18} /> Evidencia fotográfica
            </div>
            <div className="text-xs text-primary/60 mt-1">{order.photos.length ? 'Toca una foto para ampliar.' : 'Aún no hay fotos.'}</div>
          </div>
        </div>

        {order.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {order.photos.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActivePhoto(p); setPhotoOpen(true) }}
                className="rounded-3xl overflow-hidden border border-primary/10 bg-white hover:shadow-soft transition-all active:scale-[0.99]"
              >
                <img src={p.url} alt={p.label} className="w-full h-28 object-cover" />
                <div className="p-2 text-left">
                  <div className="text-xs font-extrabold text-primary truncate">{p.label}</div>
                  <div className="text-[11px] text-primary/60 truncate">{p.id}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={photoOpen}
        title={activePhoto ? `Foto · ${activePhoto.label}` : 'Foto'}
        onClose={() => setPhotoOpen(false)}
      >
        {activePhoto && (
          <div className="space-y-3">
            <img src={activePhoto.url} alt={activePhoto.label} className="w-full rounded-3xl border border-primary/10" />
          </div>
        )}
      </Modal>
    </div>
  )
}
