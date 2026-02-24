import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Calendar, User2, Globe,
  CheckCircle2, FileText, ChevronRight, Image as ImageIcon,
  Clock, AlertTriangle,
} from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { fetchSiteVisitById, fetchSubmissionsWithAssetsForVisit } from '../lib/supabaseQueries'
import { getFormMeta } from '../data/formTypes'
import { isFinalized, extractSubmittedBy, groupAssetsBySection } from '../lib/payloadUtils'

function FormCard({ submission }) {
  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const finalized = submission.finalized || isFinalized(submission)
  const submitter = extractSubmittedBy(submission)
  const updatedAt = submission.updated_at ? new Date(submission.updated_at) : null
  const assets = submission.assets || []
  const photosBySection = groupAssetsBySection(assets, submission.form_code)
  const allPhotos = Object.values(photosBySection).flat()
  const photoCount = allPhotos.length

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 shadow-card overflow-hidden">
      <Link to={`/submissions/${submission.id}`}>
        <div className={`${meta.color} px-4 py-3 flex items-center gap-3 group cursor-pointer`}>
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-[13px]">{meta.label}</div>
            <div className="text-white/55 text-[10px] flex items-center gap-2 mt-0.5">
              {submitter && <span>{submitter.name || submitter.username}</span>}
              {updatedAt && <span>· {updatedAt.toLocaleDateString()}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {finalized ? (
              <span className="text-[10px] font-semibold text-white bg-white/20 px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle2 size={9} /> Final</span>
            ) : (
              <span className="text-[10px] font-semibold text-white bg-white/20 px-2 py-1 rounded-md flex items-center gap-1"><Clock size={9} /> Borrador</span>
            )}
            <ChevronRight size={14} className="text-white/40 group-hover:text-white transition-colors" />
          </div>
        </div>
      </Link>

      {photoCount > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon size={11} className="text-teal-600" />
            <span className="text-[10px] font-semibold text-teal-700">{photoCount} foto{photoCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {allPhotos.slice(0, 6).map((p) => (
              <Link key={p.id} to={`/submissions/${submission.id}`} className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:shadow-soft transition-all">
                  <img src={p.public_url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </Link>
            ))}
            {allPhotos.length > 6 && (
              <Link to={`/submissions/${submission.id}`} className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-gray-400">+{allPhotos.length - 6}</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {photoCount === 0 && (
        <div className="px-4 py-2.5">
          <span className="text-[10px] text-gray-400 italic flex items-center gap-1"><ImageIcon size={10} /> Sin fotos aún</span>
        </div>
      )}
    </div>
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
      setLoading(true); setError(null)
      try {
        const [o, s] = await Promise.all([fetchSiteVisitById(orderId), fetchSubmissionsWithAssetsForVisit(orderId)])
        setOrder(o); setSubmissions(s)
      } catch (e) { setError(e?.message || 'Error') }
      finally { setLoading(false) }
    }
    load()
  }, [orderId])

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={20} /><span className="ml-3 text-sm text-gray-400">Cargando orden…</span></div>

  if (error || !order) {
    return (
      <div className="max-w-3xl space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-700"><ArrowLeft size={16} /> Volver</button>
        <div className="bg-white rounded-xl border border-gray-200/60 py-16 text-center">
          <div className="text-sm font-medium text-gray-500">{error || 'Orden no encontrada'}</div>
        </div>
      </div>
    )
  }

  const isOpen = order.status === 'open'
  const totalPhotos = submissions.reduce((s, sub) => s + (sub.assets || []).filter(a => a.public_url).length, 0)
  const finalizedCount = submissions.filter(s => s.finalized || isFinalized(s)).length

  return (
    <div className="max-w-5xl space-y-5">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} /> Órdenes
      </button>

      {/* Order header */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-card overflow-hidden">
        <div className={`${isOpen ? 'bg-emerald-600' : 'bg-gray-700'} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/55 text-[10px] font-semibold uppercase tracking-wider">Orden de visita</div>
              <div className="text-white text-xl font-bold mt-0.5">{order.order_number}</div>
              <div className="text-white/65 text-[12px] mt-0.5">{order.site_name}</div>
            </div>
            <span className={`text-[11px] font-semibold px-3 py-1 rounded-md ${isOpen ? 'bg-white/20 text-white' : 'bg-white/15 text-white'}`}>
              {isOpen ? '● Abierta' : '● Cerrada'}
            </span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><MapPin size={10} /> Sitio</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{order.site_name}</div>
            <div className="text-[10px] text-gray-400">ID: {order.site_id}</div>
          </div>
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><User2 size={10} /> Inspector</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{order.inspector_name || '—'}</div>
          </div>
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><Calendar size={10} /> Inicio</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{order.started_at ? new Date(order.started_at).toLocaleDateString() : '—'}</div>
          </div>
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><Globe size={10} /> GPS</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{order.start_lat ? `${Number(order.start_lat).toFixed(4)}, ${Number(order.start_lng).toFixed(4)}` : '—'}</div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="px-5 pb-5">
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-5 flex-wrap">
            <span className="flex items-center gap-1.5 text-[12px]"><FileText size={13} className="text-gray-400" /> <b className="text-gray-700">{submissions.length}</b> <span className="text-gray-400">formulario{submissions.length !== 1 ? 's' : ''}</span></span>
            <span className="flex items-center gap-1.5 text-[12px]"><CheckCircle2 size={13} className="text-emerald-600" /> <b className="text-emerald-700">{finalizedCount}</b> <span className="text-gray-400">finalizado{finalizedCount !== 1 ? 's' : ''}</span></span>
            {submissions.length - finalizedCount > 0 && (
              <span className="flex items-center gap-1.5 text-[12px]"><AlertTriangle size={13} className="text-amber-500" /> <b className="text-amber-600">{submissions.length - finalizedCount}</b> <span className="text-gray-400">borrador{submissions.length - finalizedCount !== 1 ? 'es' : ''}</span></span>
            )}
            <span className="flex items-center gap-1.5 text-[12px]"><ImageIcon size={13} className="text-teal-600" /> <b className="text-teal-700">{totalPhotos}</b> <span className="text-gray-400">foto{totalPhotos !== 1 ? 's' : ''}</span></span>
          </div>
        </div>
      </div>

      {/* Submissions */}
      {submissions.length > 0 ? (
        <div className="space-y-3">
          <div className="text-[13px] font-semibold text-gray-700 flex items-center gap-2 px-1">
            <FileText size={14} className="text-gray-400" />
            Formularios de esta orden
          </div>
          {submissions.map(sub => <FormCard key={sub.id} submission={sub} />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/60 py-16 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <div className="text-sm font-medium text-gray-500">Sin formularios</div>
          <div className="text-[12px] text-gray-400 mt-1">El inspector aún no ha enviado formularios</div>
        </div>
      )}
    </div>
  )
}
