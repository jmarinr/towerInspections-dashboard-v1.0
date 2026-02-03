import { useEffect, useMemo } from 'react'
import { ClipboardList, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { useOrdersStore } from '../store/useOrdersStore.js'
import { Link } from 'react-router-dom'

function StatCard({ icon: Icon, title, value, hint, tone = 'neutral' }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <Badge tone={tone}>{hint}</Badge>
      </div>
      <div className="mt-3">
        <div className="text-xs text-primary/60 font-bold">{title}</div>
        <div className="text-2xl font-extrabold text-primary mt-1">{value}</div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const load = useOrdersStore(s => s.load)
  const orders = useOrdersStore(s => s.orders)
  const isLoading = useOrdersStore(s => s.isLoading)

  useEffect(() => {
    if (!orders.length) load()
  }, [])

  const stats = useMemo(() => {
    const total = orders.length
    const submitted = orders.filter(o => o.status === 'submitted').length
    const reviewed = orders.filter(o => o.status === 'reviewed').length
    const draft = orders.filter(o => o.status === 'draft').length
    return { total, submitted, reviewed, draft }
  }, [orders])

  const recent = useMemo(() => {
    return [...orders].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 3)
  }, [orders])

  return (
    <div className="space-y-4">
      <div className="bg-primary rounded-3xl p-5 text-white shadow-soft">
        <div className="text-xs text-white/70 font-bold">Vista Supervisión</div>
        <div className="text-xl font-extrabold mt-1">Dashboard de Órdenes</div>
        <div className="text-sm text-white/80 mt-2 max-w-2xl">
          Aquí verás el estado, detalle y evidencia fotográfica de las órdenes generadas por inspectores.
</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} title="Órdenes" value={isLoading ? '…' : stats.total} hint="Total" />
        <StatCard icon={Clock3} title="En borrador" value={isLoading ? '…' : stats.draft} hint="Draft" tone="neutral" />
        <StatCard icon={AlertTriangle} title="Enviadas" value={isLoading ? '…' : stats.submitted} hint="Submitted" tone="warning" />
        <StatCard icon={CheckCircle2} title="Revisadas" value={isLoading ? '…' : stats.reviewed} hint="Reviewed" tone="success" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-primary">Recientes</div>
            <div className="text-xs text-primary/60 mt-1">Últimas órdenes actualizadas</div>
          </div>
          <Link to="/orders">
            <Button variant="outline">Ver todas</Button>
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {recent.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`}>
              <div className="rounded-3xl border border-primary/10 p-3 hover:bg-primary/5 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-primary truncate">{o.id} · {o.siteName}</div>
                    <div className="text-xs text-primary/60 truncate">{o.type} · Inspector: {o.inspectorName}</div>
                  </div>
                  <Badge tone={o.status === 'reviewed' ? 'success' : o.status === 'submitted' ? 'warning' : 'neutral'}>
                    {o.status}
                  </Badge>
                </div>

                <div className="mt-3">
                  <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${Math.round(o.completion * 100)}%` }} />
                  </div>
                  <div className="text-[11px] text-primary/60 mt-2">
                    Completitud: <span className="font-bold">{Math.round(o.completion * 100)}%</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
