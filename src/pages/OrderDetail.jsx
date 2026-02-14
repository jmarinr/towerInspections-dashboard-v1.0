import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, User2, FileText, Globe, CheckCircle2, AlertCircle, Eye, ArrowRight } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useOrdersStore } from '../store/useOrdersStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo } from '../lib/payloadUtils'

function InfoChip({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-primary/8 p-3.5 bg-white">
      <div className="text-[11px] text-primary/50 font-bold flex items-center gap-1.5">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="font-bold text-primary text-sm mt-1 break-words">{value || '—'}</div>
      {sub && <div className="text-[11px] text-primary/40 mt-0.5">{sub}</div>}
    </div>
  )
}

function SubmissionRow({ submission }) {
  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const site = extractSiteInfo(submission)
  const updatedAt = submission.updated_at ? new Date(submission.updated_at).toLocaleString() : '—'

  return (
    <Link to={`/submissions/${submission.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/8 hover:shadow-card hover:bg-primary/[0.01] transition-all">
        <div className={`w-10 h-10 rounded-xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-primary">{meta.label}</div>
          <div className="text-[11px] text-primary/50 truncate">{site.nombreSitio} · {updatedAt}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{submission.form_code}</Badge>
          <ArrowRight size={14} className="text-primary/30" />
        </div>
      </div>
    </Link>
  )
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const loadDetail = useOrdersStore((s) => s.loadDetail)
  const clearDetail = useOrdersStore((s) => s.clearDetail)
  const order = useOrdersStore((s) => s.activeOrder)
  const submissions = useOrdersStore((s) => s.activeOrderSubmissions)
  const isLoading = useOrdersStore((s) => s.isLoadingDetail)

  useEffect(() => {
    if (orderId) loadDetail(orderId)
    return () => clearDetail()
  }, [orderId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size={28} />
        <span className="text-sm text-primary/60 font-bold">Cargando orden…</span>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <FileText size={40} className="mx-auto text-primary/20 mb-3" />
        <div className="font-extrabold text-primary">Orden no encontrada</div>
        <Link to="/orders"><Button variant="outline" className="mt-4">Volver a Órdenes</Button></Link>
      </div>
    )
  }

  const isOpen = order.status === 'open'
  const startedAt = order.started_at ? new Date(order.started_at) : null
  const closedAt = order.closed_at ? new Date(order.closed_at) : null

  return (
    <div className="space-y-4 max-w-4xl">
      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Volver
      </Button>

      {/* Header */}
      <Card className="p-0 overflow-hidden">
        <div className={`px-5 py-4 flex items-center gap-3 ${isOpen ? 'bg-emerald-600' : 'bg-primary'}`}>
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <FileText size={22} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white/70 text-[11px] font-bold">Orden de Trabajo</div>
            <div className="text-white text-lg font-extrabold">{order.order_number}</div>
          </div>
          <Badge tone={isOpen ? 'success' : 'neutral'} className={isOpen ? 'bg-white/20 text-white border-0' : 'bg-white/20 text-white border-0'}>
            {isOpen ? '● Abierta' : '● Cerrada'}
          </Badge>
        </div>

        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <InfoChip icon={MapPin} label="Sitio" value={order.site_name} sub={`ID: ${order.site_id}`} />
          <InfoChip icon={User2} label="Inspector" value={order.inspector_name || order.inspector_username} sub={order.inspector_role} />
          <InfoChip icon={Clock} label="Inicio"
            value={startedAt ? startedAt.toLocaleDateString() : '—'}
            sub={startedAt ? startedAt.toLocaleTimeString() : null}
          />
          <InfoChip icon={Globe} label="GPS inicio"
            value={order.start_lat ? `${Number(order.start_lat).toFixed(4)}, ${Number(order.start_lng).toFixed(4)}` : '—'}
            sub={order.end_lat ? `Fin: ${Number(order.end_lat).toFixed(4)}, ${Number(order.end_lng).toFixed(4)}` : null}
          />
        </div>

        {closedAt && (
          <div className="px-4 pb-4">
            <div className="rounded-2xl bg-primary/5 border border-primary/8 p-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary/60" />
              <span className="text-xs text-primary/70">
                <span className="font-bold">Cerrada:</span> {closedAt.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Linked submissions */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText size={16} className="text-accent" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-primary">Formularios de esta orden</div>
            <div className="text-[11px] text-primary/50">
              {submissions.length
                ? `${submissions.length} formulario${submissions.length !== 1 ? 's' : ''} enviado${submissions.length !== 1 ? 's' : ''}`
                : 'Sin formularios vinculados aún'}
            </div>
          </div>
        </div>

        {submissions.length > 0 ? (
          <div className="space-y-2">
            {submissions.map((s) => <SubmissionRow key={s.id} submission={s} />)}
          </div>
        ) : (
          <div className="text-center py-8 text-primary/40">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
            <div className="text-sm font-bold">Sin formularios vinculados</div>
            <div className="text-xs mt-1">Los formularios aparecerán aquí cuando el inspector los envíe desde esta orden</div>
          </div>
        )}
      </Card>
    </div>
  )
}
