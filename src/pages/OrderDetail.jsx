import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, AlertTriangle, MapPin, User, Calendar, Hash, Image, ClipboardList, CheckCircle2, LockKeyhole, LockOpen } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import LoadError from '../components/ui/LoadError'
import Modal from '../components/ui/Modal'
import { useOrdersStore } from '../store/useOrdersStore'
import { useAuthStore } from '../store/useAuthStore'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta, normalizeFormCode, isFormVisible } from '../data/formTypes'
import { isFinalized, extractSubmittedBy } from '../lib/payloadUtils'
import { updateSiteVisitStatus } from '../lib/supabaseQueries'
import { LOG } from '../lib/logEvent'

function hasDamage(sub) {
  const p = sub?.payload?.payload || sub?.payload || {}
  const data = p.data || p
  const cl = data.checklistData || {}
  for (const key of Object.keys(cl)) {
    const item = cl[key]
    const st = typeof item === 'string' ? item : item?.status || ''
    if (st.toLowerCase() === 'malo' || st.toLowerCase() === 'bad') return true
  }
  for (const secKey of Object.keys(data)) {
    const sec = data[secKey]
    if (sec && typeof sec === 'object' && !Array.isArray(sec)) {
      for (const fKey of Object.keys(sec)) {
        if (typeof sec[fKey] === 'string' &&
            (sec[fKey].toLowerCase() === 'malo' || sec[fKey].toLowerCase() === 'bad')) return true
      }
    }
  }
  return false
}

function MetaChip({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} className="th-text-m flex-shrink-0" />
      <span className="text-[12px] th-text-m">{label}</span>
      <span className="text-[13px] font-semibold th-text-p">{value}</span>
    </div>
  )
}

function StatBadge({ value, label, color = 'th-text-p' }) {
  return (
    <div className="flex items-center gap-1.5 th-bg-card border th-border rounded-xl px-3 py-2">
      <span className={`text-[18px] font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[12px] th-text-m">{label}</span>
    </div>
  )
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate    = useNavigate()
  const loadDetail  = useOrdersStore((s) => s.loadDetail)
  const clearDetail = useOrdersStore((s) => s.clearDetail)
  const order       = useOrdersStore((s) => s.activeOrder)
  const submissions = useOrdersStore((s) => s.activeOrderSubmissions)
  const isLoading   = useOrdersStore((s) => s.isLoadingDetail)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!orderId) return
    setTimedOut(false)
    loadDetail(orderId)
    const t = setTimeout(() => setTimedOut(true), 10000)
    return () => { clearDetail(); clearTimeout(t) }
  }, [orderId])

  if (isLoading && !timedOut)
    return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>
  if (timedOut && !order)
    return <LoadError message="Tiempo de espera agotado." onRetry={() => { setTimedOut(false); loadDetail(orderId) }} />
  if (!order) return (
    <div className="text-center py-20">
      <div className="text-[14px] th-text-m mb-3">Visita no encontrada</div>
      <button onClick={() => navigate('/orders')} className="text-sky-600 hover:underline text-[13px]">← Volver</button>
    </div>
  )

  // Guard: supervisor con empresa solo puede ver órdenes de su empresa
  // Guard: viewer no puede ver órdenes de HenkanCX (org_code HK)
  const user         = useAuthStore.getState().user
  const VIEWER_EXCLUDED_ORG_CODES = ['HK']
  const orgCode      = (user?.role !== 'admin' && user?.role !== 'viewer' && user?.company?.org_code) ? user.company.org_code : null
  const allSubmissions = useSubmissionsStore.getState().submissions
  const orderOrgCodes  = new Set(allSubmissions.filter(s => s.site_visit_id === orderId).map(s => s.org_code))

  if (orgCode && orderOrgCodes.size > 0 && !orderOrgCodes.has(orgCode)) {
    return (
      <div className="text-center py-20">
        <div className="text-[14px] th-text-m mb-3">No tienes acceso a esta visita</div>
        <button onClick={() => navigate('/orders')} className="text-sky-600 hover:underline text-[13px]">← Volver</button>
      </div>
    )
  }

  if (user?.role === 'viewer' && orderOrgCodes.size > 0 && [...orderOrgCodes].every(oc => VIEWER_EXCLUDED_ORG_CODES.includes(oc))) {
    return (
      <div className="text-center py-20">
        <div className="text-[14px] th-text-m mb-3">No tienes acceso a esta visita</div>
        <button onClick={() => navigate('/orders')} className="text-sky-600 hover:underline text-[13px]">← Volver</button>
      </div>
    )
  }

  const open        = order.status === 'open'
  const finalized   = submissions.filter(s => s.finalized || isFinalized(s)).length
  const totalPhotos = submissions.reduce((n, s) => n + (s.assets || []).filter(a => a.public_url).length, 0)
  const gps         = order.start_lat && order.start_lng
    ? `${Number(order.start_lat).toFixed(4)}, ${Number(order.start_lng).toFixed(4)}` : null
  const startDate   = order.started_at
    ? new Date(order.started_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const visibleSubs = submissions.filter(s => isFormVisible(s.form_code))

  // ── Status toggle ──────────────────────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError,   setStatusError]   = useState(null)
  const [confirmStatus, setConfirmStatus] = useState(false)

  const pendingForms = visibleSubs.filter(s => !(s.finalized || isFinalized(s))).length

  const handleStatusToggleClick = () => {
    setStatusError(null)
    if (open && pendingForms > 0) {
      setStatusError(`No se puede cerrar: hay ${pendingForms} formulario${pendingForms !== 1 ? 's' : ''} pendiente${pendingForms !== 1 ? 's' : ''} de completar.`)
      return
    }
    setConfirmStatus(true)
  }

  const handleConfirmStatusToggle = async () => {
    setConfirmStatus(false)
    setStatusLoading(true)
    setStatusError(null)
    const newStatus = open ? 'closed' : 'open'
    const actor = useAuthStore.getState().user
    try {
      await updateSiteVisitStatus(order.id, newStatus)
      LOG.visitStatusChanged(
        order.id,
        order.order_number,
        actor?.email,
        actor?.role,
        order.status,
        newStatus,
        'manual'
      )
      await loadDetail(orderId)
    } catch (e) {
      setStatusError('Error al cambiar el estado. Intenta nuevamente.')
      console.error('[OrderDetail] status toggle:', e)
    } finally {
      setStatusLoading(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[13px] th-text-m hover:th-text-p transition-colors">
        <ArrowLeft size={14} />Volver
      </button>

      {/* Header card */}
      <div className="rounded-2xl th-shadow p-5 space-y-4" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[18px] sm:text-[22px] font-bold th-text-p">{order.order_number}</h1>
              {open
                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Abierta
                  </span>
                : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 th-text-m ring-1 ring-inset ring-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Cerrada
                  </span>}
            </div>
            {order.site_name && (
              <div className="text-[14px] th-text-m mt-1">{order.site_name}</div>
            )}
          </div>

          {/* Botón cerrar/reabrir — solo admin y supervisor con canWrite */}
          {user?.canWrite && (
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={handleStatusToggleClick}
                disabled={statusLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all disabled:opacity-50"
                style={{
                  background:   open ? '#fef2f2' : '#f0fdf4',
                  color:        open ? '#b91c1c' : '#166534',
                  borderColor:  open ? '#fecaca' : '#bbf7d0',
                }}>
                {statusLoading
                  ? <Spinner size={13} />
                  : open
                    ? <><LockKeyhole size={13} strokeWidth={2} />Cerrar visita</>
                    : <><LockOpen size={13} strokeWidth={2} />Reabrir visita</>}
              </button>
              {statusError && (
                <p className="text-[11px] font-medium text-right" style={{ color: '#b91c1c', maxWidth: 240 }}>
                  {statusError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <MetaChip icon={Hash}      label="ID Sitio"   value={order.site_id} />
          <MetaChip icon={User}      label="Inspector"  value={order.inspector_name || order.inspector_username} />
          <MetaChip icon={Calendar}  label="Inicio"     value={startDate} />
          {gps && <MetaChip icon={MapPin} label="GPS" value={gps} />}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 pt-1">
          <StatBadge value={visibleSubs.length}  label="formularios" />
          <StatBadge value={finalized}            label="completados" color="text-emerald-600" />
          <StatBadge value={totalPhotos}          label="fotos" />
        </div>
      </div>

      {/* Submissions list */}
      <div>
        <h2 className="text-[13px] font-semibold th-text-m uppercase tracking-wider mb-3">Formularios</h2>

        {visibleSubs.length > 0 ? (
          <div className="rounded-2xl th-shadow overflow-hidden" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
            {visibleSubs.map((sub, i) => {
              const fc      = normalizeFormCode(sub.form_code) || sub.form_code
              const meta    = getFormMeta(fc)
              const Icon    = meta.icon
              const fin     = sub.finalized || isFinalized(sub)
              const who     = extractSubmittedBy(sub)
              const photos  = (sub.assets || []).filter(a => a.public_url)
              const d       = sub.updated_at ? new Date(sub.updated_at) : null
              const damaged = hasDamage(sub)

              return (
                <Link key={sub.id} to={`/submissions/${sub.id}`}
                  className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors group
                    ${i > 0 ? 'border-t' : ''}`}
                  style={{ borderColor: 'var(--border-light)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl ${meta.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon size={14} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold th-text-p">{meta.label}</span>
                      {damaged && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 ring-1 ring-inset ring-red-200">
                          <AlertTriangle size={9} />Con daño
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] th-text-m mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{who?.name || '—'}</span>
                      {d && <><span className="th-text-m">·</span><span>{d.toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span></>}
                      {photos.length > 0 && <><span className="th-text-m">·</span><span className="flex items-center gap-0.5"><Image size={10} />{photos.length}</span></>}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    {fin
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Completado
                        </span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Borrador
                        </span>}
                    <ChevronRight size={14} className="th-text-m group-hover:text-sky-600 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl th-shadow py-16 text-center">
            <div className="text-[14px] font-semibold th-text-m">Sin formularios aún</div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de cambio de estado */}
      {confirmStatus && (
        <Modal
          title={open ? 'Cerrar visita' : 'Reabrir visita'}
          onClose={() => setConfirmStatus(false)}>
          <div className="space-y-4">
            <p className="text-[13px] th-text-p leading-relaxed">
              {open
                ? <>¿Confirmas que quieres <strong>cerrar</strong> la visita <strong>{order.order_number}</strong>? Todos los formularios están completados.</>
                : <>¿Confirmas que quieres <strong>reabrir</strong> la visita <strong>{order.order_number}</strong>? El inspector podrá continuar editando los formularios.</>}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmStatus(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold border th-text-m"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                Cancelar
              </button>
              <button onClick={handleConfirmStatusToggle}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: open ? '#b91c1c' : '#166534' }}>
                {open ? 'Sí, cerrar' : 'Sí, reabrir'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
