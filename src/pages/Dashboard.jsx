import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, TrendingUp, Clock3, Database, FileText, Users, CheckCircle2, AlertCircle, MapPin, User2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'
import { extractSiteInfo } from '../lib/payloadUtils'

function StatCard({ icon: Icon, title, value, hint, tone = 'neutral' }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
          <Icon size={18} className="text-primary/70" />
        </div>
        <Badge tone={tone}>{hint}</Badge>
      </div>
      <div className="mt-3">
        <div className="text-[11px] text-primary/60 font-bold">{title}</div>
        <div className="text-2xl font-extrabold text-primary mt-1">{value}</div>
      </div>
    </Card>
  )
}

function FormTypeCard({ code, count }) {
  const meta = getFormMeta(code)
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/8 hover:bg-primary/[0.02] transition-all">
      <div className={`w-9 h-9 rounded-xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-primary truncate">{meta.shortLabel}</div>
      </div>
      <div className="text-lg font-extrabold text-primary">{count}</div>
    </div>
  )
}

function RecentSubmissionRow({ submission }) {
  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const site = extractSiteInfo(submission)
  const updatedAt = submission.updated_at ? new Date(submission.updated_at).toLocaleString() : '—'

  return (
    <Link to={`/submissions/${submission.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/8 hover:bg-primary/[0.02] hover:shadow-card transition-all">
        <div className={`w-9 h-9 rounded-xl ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-primary truncate">{site.nombreSitio}</div>
          <div className="text-[11px] text-primary/50 truncate">{meta.shortLabel} · {updatedAt}</div>
        </div>
        <Badge tone="neutral">{submission.form_code?.split('-')[0]}</Badge>
      </div>
    </Link>
  )
}

function RecentOrderRow({ order }) {
  const isOpen = order.status === 'open'
  const startedAt = order.started_at ? new Date(order.started_at) : null

  return (
    <Link to={`/orders/${order.id}`}>
      <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/8 hover:bg-primary/[0.02] hover:shadow-card transition-all">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-emerald-500' : 'bg-primary/60'} text-white`}>
          <FileText size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-primary">{order.order_number}</div>
          <div className="text-[11px] text-primary/50 truncate">
            {order.site_name} · {order.inspector_name || order.inspector_username}
            {startedAt && ` · ${startedAt.toLocaleDateString()}`}
          </div>
        </div>
        <Badge tone={isOpen ? 'success' : 'neutral'}>{isOpen ? 'Abierta' : 'Cerrada'}</Badge>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const stats = useSubmissionsStore((s) => s.stats)
  const isLoadingStats = useSubmissionsStore((s) => s.isLoadingStats)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const load = useSubmissionsStore((s) => s.load)

  useEffect(() => {
    loadStats()
    load()
  }, [])

  const formCodes = stats?.byFormCode ? Object.keys(stats.byFormCode) : []

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="bg-primary rounded-3xl p-5 text-white shadow-soft">
        <div className="text-[11px] text-white/60 font-bold">Panel de Supervisión</div>
        <div className="text-xl font-extrabold mt-1">Dashboard</div>
        <div className="text-sm text-white/70 mt-2 max-w-2xl">
          Resumen de órdenes de trabajo e inspecciones. Datos en tiempo real desde Supabase.
        </div>
      </div>

      {isLoadingStats ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={28} />
          <span className="ml-3 text-sm text-primary/60 font-bold">Cargando estadísticas…</span>
        </div>
      ) : stats ? (
        <>
          {/* Order Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={FileText} title="Total órdenes" value={stats.totalVisits ?? 0} hint="Órdenes" tone="accent" />
            <StatCard icon={AlertCircle} title="Abiertas" value={stats.openVisits ?? 0} hint="En curso" tone="success" />
            <StatCard icon={CheckCircle2} title="Cerradas" value={stats.closedVisits ?? 0} hint="Completadas" tone="neutral" />
            <StatCard icon={Database} title="Total submissions" value={stats.total} hint="Formularios" />
          </div>

          {/* Submission Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={ClipboardList} title="Tipos de formulario" value={formCodes.length} hint="Tipos" tone="accent" />
            <StatCard icon={TrendingUp} title="Última semana" value={stats.recentCount} hint="Recientes" tone="success" />
            <StatCard icon={Clock3} title="Último registro" value={stats.recent?.[0] ? new Date(stats.recent[0].updated_at).toLocaleDateString() : '—'} hint="Fecha" tone="warning" />
            <StatCard icon={Users} title="Inspectores activos" value={stats.recentVisits ? new Set(stats.recentVisits.map(v => v.inspector_username)).size : '—'} hint="Equipo" />
          </div>

          {/* Recent Orders */}
          {stats.recentVisits?.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-extrabold text-primary">Órdenes recientes</div>
                  <div className="text-[11px] text-primary/50 mt-0.5">Últimas visitas a sitio</div>
                </div>
                <Link to="/orders"><Button variant="outline">Ver todas</Button></Link>
              </div>
              <div className="space-y-2">
                {stats.recentVisits.map((o) => <RecentOrderRow key={o.id} order={o} />)}
              </div>
            </Card>
          )}

          {/* By form type */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-extrabold text-primary">Por tipo de formulario</div>
                <div className="text-[11px] text-primary/50 mt-0.5">Distribución de submissions</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {formCodes.map((code) => (
                <FormTypeCard key={code} code={code} count={stats.byFormCode[code]} />
              ))}
              {formCodes.length === 0 && (
                <div className="col-span-full text-sm text-primary/50 text-center py-6">Sin datos aún</div>
              )}
            </div>
          </Card>

          {/* Recent Submissions */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-extrabold text-primary">Submissions recientes</div>
                <div className="text-[11px] text-primary/50 mt-0.5">Últimos formularios actualizados</div>
              </div>
              <Link to="/submissions"><Button variant="outline">Ver todas</Button></Link>
            </div>
            <div className="space-y-2">
              {stats.recent?.map((s) => <RecentSubmissionRow key={s.id} submission={s} />)}
              {(!stats.recent || stats.recent.length === 0) && (
                <div className="text-sm text-primary/50 text-center py-6">Sin submissions aún</div>
              )}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-6 text-center">
          <div className="text-sm text-primary/60 font-bold">No se pudieron cargar las estadísticas</div>
          <Button variant="outline" className="mt-3" onClick={loadStats}>Reintentar</Button>
        </Card>
      )}
    </div>
  )
}
