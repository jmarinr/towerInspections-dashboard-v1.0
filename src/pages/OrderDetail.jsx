import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Calendar, Clock, User2, Globe,
  CheckCircle2, FileText, ChevronRight, Image as ImageIcon,
  Package, AlertTriangle,
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { fetchSiteVisitById, fetchSubmissionsWithAssetsForVisit } from '../lib/supabaseQueries'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy, groupAssetsBySection } from '../lib/payloadUtils'

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

function FormSubmissionCard({ submission }) {
  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const finalized = submission.finalized || isFinalized(submission)
  const submitter = extractSubmittedBy(submission)
  const updatedAt = submission.updated_at ? new Date(submission.updated_at) : null
  const assets = submission.assets || []
  const photoCount = assets.filter(a => a.public_url).length
  const photosBySection = groupAssetsBySection(assets, submission.form_code)
  const allPhotos = Object.values(photosBySection).flat()

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <Link to={`/submissions/${submission.id}`}>
        <div className={`${meta.color} px-4 py-3 flex items-center gap-3 group cursor-pointer`}>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-extrabold text-sm">{meta.label}</div>
            <div className="text-white/60 text-[11px] mt-0.5 flex items-center gap-2">
              {submitter && <span>{submitter.name || submitter.username}</span>}
              {updatedAt && <span>· {updatedAt.toLocaleDateString()} {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {finalized ? (
              <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> Final
              </span>
            ) : (
              <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Clock size={10} /> Borrador
              </span>
            )}
            <ChevronRight size={16} className="text-white/50 group-hover:text-white transition-colors" />
          </div>
        </div>
      </Link>

      {/* Photo strip */}
      {allPhotos.length > 0 && (
        <div className="p-3 border-t border-primary/6">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon size={12} className="text-accent" />
            <span className="text-[11px] font-bold text-accent">{photoCount} foto{photoCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {allPhotos.slice(0, 8).map((p) => (
              <Link key={p.id} to={`/submissions/${submission.id}`} className="flex-shrink-0">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-primary/8 hover:shadow-soft transition-all">
                  <img src={p.public_url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </Link>
            ))}
            {allPhotos.length > 8 && (
              <Link to={`/submissions/${submission.id}`} className="flex-shrink-0">
                <div className="w-20 h-20 rounded-xl border border-primary/8 bg-primary/5 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary/50">+{allPhotos.length - 8}</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* No photos state */}
      {allPhotos.length === 0 && (
        <div className="px-4 py-3 border-t border-primary/6">
          <div className="text-[11px] text-primary/40 italic flex items-center gap-1.5">
            <ImageIcon size={11} /> Sin fotos capturadas aún
          </div>
        </div>
      )}
    </Card>
  )
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [orderData, subsData] = await Promise.all([
          fetchSiteVisitById(orderId),
          fetchSubmissionsWithAssetsForVisit(orderId),
        ])
        setOrder(orderData)
        setSubmissions(subsData)
      } catch (err) {
        setError(err?.message || 'Error al cargar la orden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={24} />
        <span className="ml-3 text-sm text-primary/60 font-bold">Cargando orden…</span>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Volver</Button>
        <EmptyState title="Error" description={error || 'Orden no encontrada'} />
      </div>
    )
  }

  const isOpen = order.status === 'open'
  const totalPhotos = submissions.reduce((sum, s) => sum + (s.assets || []).filter(a => a.public_url).length, 0)
  const finalizedCount = submissions.filter(s => s.finalized || isFinalized(s)).length

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Top bar */}
      <Button variant="outline" onClick={() => navigate('/orders')}>
        <ArrowLeft size={16} /> Órdenes
      </Button>

      {/* Order header */}
      <Card className="p-0 overflow-hidden">
        <div className={`${isOpen ? 'bg-emerald-600' : 'bg-[#0F2A4A]'} px-5 py-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/60 text-[11px] font-bold uppercase tracking-wider">Orden de visita</div>
              <div className="text-white text-2xl font-extrabold mt-0.5">{order.order_number}</div>
            </div>
            <Badge tone={isOpen ? 'success' : 'neutral'} className={`${isOpen ? 'bg-white/20 text-white border-0' : 'bg-white/20 text-white border-0'}`}>
              {isOpen ? '🟢 Abierta' : '🔵 Cerrada'}
            </Badge>
          </div>
          <div className="text-white/70 text-sm mt-1">{order.site_name}</div>
        </div>

        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <InfoChip icon={MapPin} label="Sitio" value={order.site_name} sub={`ID: ${order.site_id}`} />
          <InfoChip icon={User2} label="Inspector"
            value={order.inspector_name || order.inspector_username || '—'}
            sub={order.inspector_role || null}
          />
          <InfoChip icon={Calendar} label="Inicio"
            value={order.started_at ? new Date(order.started_at).toLocaleDateString() : '—'}
            sub={order.started_at ? new Date(order.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null}
          />
          <InfoChip icon={Globe} label="GPS Inicio"
            value={order.start_lat ? `${Number(order.start_lat).toFixed(4)}, ${Number(order.start_lng).toFixed(4)}` : '—'}
            sub={order.closed_at ? `Cerrada: ${new Date(order.closed_at).toLocaleDateString()}` : null}
          />
        </div>

        {/* Summary strip */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-surface border border-primary/6 p-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <FileText size={14} className="text-primary/50" />
              <span className="text-sm font-bold text-primary">{submissions.length}</span>
              <span className="text-xs text-primary/50">formulario{submissions.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">{finalizedCount}</span>
              <span className="text-xs text-primary/50">finalizado{finalizedCount !== 1 ? 's' : ''}</span>
            </div>
            {submissions.length - finalizedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-sm font-bold text-amber-600">{submissions.length - finalizedCount}</span>
                <span className="text-xs text-primary/50">borrador{submissions.length - finalizedCount !== 1 ? 'es' : ''}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ImageIcon size={14} className="text-accent" />
              <span className="text-sm font-bold text-accent">{totalPhotos}</span>
              <span className="text-xs text-primary/50">foto{totalPhotos !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Submissions list */}
      {submissions.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-extrabold text-primary flex items-center gap-2">
            <Package size={15} />
            Formularios de esta orden
          </div>
          {submissions.map((sub) => (
            <FormSubmissionCard key={sub.id} submission={sub} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sin formularios"
          description="El inspector aún no ha enviado formularios en esta orden"
        />
      )}
    </div>
  )
}
