import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, TrendingUp, Clock3, FileText, Eye, ArrowRight,
  MapPin, AlertCircle, CheckCircle2, ChevronRight,
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta } from '../lib/payloadUtils'

// ===== STAT CARD =====
function StatCard({ icon: Icon, title, value, sub, accent }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-accent/15 text-accent' : 'bg-primary/5 text-primary/60'}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-primary/50 font-bold">{title}</div>
          <div className="text-xl font-extrabold text-primary">{value}</div>
          {sub && <div className="text-[10px] text-primary/40 mt-0.5">{sub}</div>}
        </div>
      </div>
    </Card>
  )
}

// ===== SUBMISSION ROW =====
function SubmissionRow({ submission }) {
  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const site = extractSiteInfo(submission)
  const inspMeta = extractMeta(submission)
  const updatedAt = submission.updated_at ? new Date(submission.updated_at) : null

  return (
    <Link to={`/submissions/${submission.id}`}>
      <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-primary/8 hover:shadow-soft hover:bg-primary/[0.01] transition-all group">
        <div className={`w-10 h-10 rounded-xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-primary truncate">
            {site.nombreSitio}
          </div>
          <div className="text-[11px] text-primary/50 mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="font-bold">{meta.shortLabel}</span>
            <span>·</span>
            <span>{site.idSitio !== '—' ? `ID ${site.idSitio}` : ''}</span>
            {inspMeta.date && (
              <>
                <span>·</span>
                <span>{inspMeta.date}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {updatedAt && (
            <span className="text-[10px] text-primary/40 hidden sm:block">
              {updatedAt.toLocaleDateString()}
            </span>
          )}
          <ChevronRight size={16} className="text-primary/20 group-hover:text-accent transition-colors" />
        </div>
      </div>
    </Link>
  )
}

// ===== OPEN ORDER CHIP =====
function OpenOrderBanner({ orders }) {
  const openOrders = orders.filter(o => o.status === 'open')
  if (!openOrders.length) return null

  return (
    <Card className="p-4 border-emerald-200 bg-emerald-50/50">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={15} className="text-emerald-600" />
        <span className="text-xs font-extrabold text-emerald-700">
          {openOrders.length} orden{openOrders.length > 1 ? 'es' : ''} abierta{openOrders.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {openOrders.map(o => (
          <Link key={o.id} to={`/orders/${o.id}`}>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-emerald-200 hover:shadow-sm transition-all group">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText size={14} className="text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-primary">{o.order_number}</div>
                <div className="text-[10px] text-primary/50 truncate">
                  {o.site_name} · {o.inspector_name || o.inspector_username}
                </div>
              </div>
              <ChevronRight size={14} className="text-primary/20 group-hover:text-emerald-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}

// ===== FORM TYPE SUMMARY =====
function FormTypeSummary({ byFormCode }) {
  const codes = Object.keys(byFormCode || {})
  if (!codes.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {codes.map(code => {
        const meta = getFormMeta(code)
        const Icon = meta.icon
        return (
          <Link key={code} to={`/submissions?form=${code}`}>
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-primary/8 hover:bg-primary/[0.02] transition-all text-center">
              <div className={`w-9 h-9 rounded-xl ${meta.color} text-white flex items-center justify-center`}>
                <Icon size={16} />
              </div>
              <div className="text-lg font-extrabold text-primary">{byFormCode[code]}</div>
              <div className="text-[9px] font-bold text-primary/50 leading-tight">{meta.shortLabel}</div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ===== MAIN =====
export default function Dashboard() {
  const stats = useSubmissionsStore((s) => s.stats)
  const isLoadingStats = useSubmissionsStore((s) => s.isLoadingStats)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const submissions = useSubmissionsStore((s) => s.submissions)
  const load = useSubmissionsStore((s) => s.load)

  useEffect(() => {
    loadStats()
    load()
  }, [])

  // Get recent submissions (up to 10)
  const recentSubs = useMemo(() => {
    return (submissions || []).slice(0, 10)
  }, [submissions])

  if (isLoadingStats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size={28} />
        <span className="text-sm text-primary/60 font-bold">Cargando…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="bg-primary rounded-3xl p-5 text-white shadow-soft">
        <div className="text-[11px] text-white/60 font-bold">PTI Inspect</div>
        <div className="text-xl font-extrabold mt-1">Panel de Supervisión</div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} title="Total formularios" value={stats?.total ?? 0} accent />
        <StatCard icon={TrendingUp} title="Última semana" value={stats?.recentCount ?? 0} sub="actualizados" />
        <StatCard icon={FileText} title="Órdenes" value={stats?.totalVisits ?? 0} sub={`${stats?.openVisits ?? 0} abiertas`} />
        <StatCard icon={Clock3} title="Último envío"
          value={stats?.recent?.[0] ? new Date(stats.recent[0].updated_at).toLocaleDateString() : '—'}
          sub={stats?.recent?.[0] ? new Date(stats.recent[0].updated_at).toLocaleTimeString() : null}
        />
      </div>

      {/* Open orders banner */}
      {stats?.recentVisits && <OpenOrderBanner orders={stats.recentVisits} />}

      {/* Form type distribution */}
      {stats?.byFormCode && Object.keys(stats.byFormCode).length > 0 && (
        <Card className="p-4">
          <div className="text-xs font-extrabold text-primary/50 uppercase tracking-wide mb-3">Por tipo de formulario</div>
          <FormTypeSummary byFormCode={stats.byFormCode} />
        </Card>
      )}

      {/* Recent submissions - THE MAIN CONTENT */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-extrabold text-primary">Formularios recientes</div>
            <div className="text-[11px] text-primary/50 mt-0.5">Toca para ver el detalle completo</div>
          </div>
          <Link to="/submissions">
            <Button variant="outline">
              Ver todos <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {recentSubs.length > 0 ? (
            recentSubs.map((s) => <SubmissionRow key={s.id} submission={s} />)
          ) : (
            <div className="text-center py-8 text-primary/40">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
              <div className="text-sm font-bold">Sin formularios aún</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
