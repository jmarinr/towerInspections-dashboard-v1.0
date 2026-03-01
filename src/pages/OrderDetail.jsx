import { useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, User2, Calendar, Compass, CheckCircle2, Clock, Image as ImageIcon, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useOrdersStore } from '../store/useOrdersStore'
import { getFormMeta, normalizeFormCode } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function FormCard({ sub }) {
  const fc = normalizeFormCode(sub.form_code) || sub.form_code
  const meta = getFormMeta(fc)
  const Icon = meta.icon
  const fin = sub.finalized || isFinalized(sub)
  const submitter = extractSubmittedBy(sub)
  const photos = (sub.assets || []).filter(a => a.public_url)
  const d = sub.updated_at ? new Date(sub.updated_at) : null

  return (
    <Link to={`/submissions/${sub.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-100 hover:border-emerald-200 transition-all overflow-hidden hover:shadow-sm">
        {/* Header */}
        <div className={`${meta.color} px-4 py-3 flex items-center gap-3`}>
          <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
            <Icon size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[12px] font-bold">{meta.label}</div>
            <div className="text-white/70 text-[10px]">{submitter?.name || '—'} · {d ? d.toLocaleDateString() : '—'}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {fin
              ? <span className="bg-white/20 text-white text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={8} /> Final</span>
              : <span className="bg-white/20 text-white text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"><Clock size={8} /> Borrador</span>
            }
            <ChevronRight size={13} className="text-white/50 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Photo strip */}
        <div className="px-3 py-2.5">
          {photos.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
              {photos.slice(0, 6).map(p => (
                <div key={p.id} className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={p.public_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
              {photos.length > 6 && (
                <div className="w-14 h-14 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-500">+{photos.length - 6}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-1">
              <ImageIcon size={11} className="text-gray-300" />
              <span className="text-[10px] text-gray-400">Sin fotos aún</span>
            </div>
          )}
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

  useEffect(() => { if (orderId) loadDetail(orderId); return () => clearDetail() }, [orderId])

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size={20} /><span className="ml-3 text-sm text-gray-400">Cargando…</span></div>
  if (!order) return (
    <div className="text-center py-20">
      <div className="text-sm text-gray-500">Visita no encontrada</div>
      <Link to="/orders"><button className="mt-3 text-sm text-emerald-600 hover:underline">← Volver</button></Link>
    </div>
  )

  const isOpen = order.status === 'open'
  const totalForms = submissions.length
  const finalized = submissions.filter(s => s.finalized || isFinalized(s)).length
  const drafts = totalForms - finalized
  const totalPhotos = submissions.reduce((n, s) => n + (s.assets || []).filter(a => a.public_url).length, 0)
  const gps = order.start_lat && order.start_lng ? `${Number(order.start_lat).toFixed(4)}, ${Number(order.start_lng).toFixed(4)}` : null

  return (
    <div className="max-w-5xl space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={15} /> Volver
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className={`${isOpen ? 'bg-emerald-600' : 'bg-gray-600'} px-5 py-5`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/70 text-[10px] font-medium uppercase tracking-wider">Visita</div>
              <div className="text-white text-xl font-bold mt-0.5">{order.order_number}</div>
              <div className="text-white/70 text-[13px] mt-0.5">{order.site_name}</div>
            </div>
            <span className="bg-white/20 text-white text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {isOpen ? 'Abierta' : 'Cerrada'}
            </span>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <div className="text-[9px] text-gray-400 font-semibold flex items-center gap-1"><MapPin size={9} /> Sitio</div>
            <div className="text-[12px] font-medium text-gray-800 mt-0.5">{order.site_name}</div>
            <div className="text-[9px] text-gray-400">ID: {order.site_id}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <div className="text-[9px] text-gray-400 font-semibold flex items-center gap-1"><User2 size={9} /> Inspector</div>
            <div className="text-[12px] font-medium text-gray-800 mt-0.5">{order.inspector_name || order.inspector_username || '—'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <div className="text-[9px] text-gray-400 font-semibold flex items-center gap-1"><Calendar size={9} /> Inicio</div>
            <div className="text-[12px] font-medium text-gray-800 mt-0.5">{order.started_at ? new Date(order.started_at).toLocaleDateString() : '—'}</div>
          </div>
          {gps && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <div className="text-[9px] text-gray-400 font-semibold flex items-center gap-1"><Compass size={9} /> GPS</div>
              <div className="text-[12px] font-medium text-gray-800 mt-0.5">{gps}</div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-gray-600"><CheckCircle2 size={13} className="text-gray-400" /> <b>{totalForms}</b> formularios</span>
            <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={13} /> <b>{finalized}</b> finalizados</span>
            {drafts > 0 && <span className="flex items-center gap-1.5 text-amber-600"><Clock size={13} /> <b>{drafts}</b> borradores</span>}
            <span className="flex items-center gap-1.5 text-gray-500"><ImageIcon size={13} /> <b>{totalPhotos}</b> fotos</span>
          </div>
        </div>
      </div>

      {/* Form cards */}
      {submissions.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-gray-500 mb-3">Formularios de esta visita</h3>
          <div className="space-y-3">
            {submissions.map(sub => <FormCard key={sub.id} sub={sub} />)}
          </div>
        </div>
      )}

      {submissions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 py-14 text-center">
          <div className="text-sm text-gray-500">Sin formularios aún</div>
          <div className="text-[11px] text-gray-400 mt-1">El inspector no ha enviado datos</div>
        </div>
      )}
    </div>
  )
}
