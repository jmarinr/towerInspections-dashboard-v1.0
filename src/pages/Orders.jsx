import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, ArrowRight, MapPin, Clock, User2, FileText } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useOrdersStore } from '../store/useOrdersStore'

function OrderCard({ order }) {
  const isOpen = order.status === 'open'
  const startedAt = order.started_at ? new Date(order.started_at) : null
  const closedAt = order.closed_at ? new Date(order.closed_at) : null

  return (
    <Card className="p-4 hover:shadow-soft transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-emerald-500' : 'bg-primary/70'} text-white`}>
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-primary text-sm">{order.order_number}</div>
            <div className="text-[11px] text-primary/50 mt-0.5 truncate">
              {order.site_name} · ID: <span className="font-bold">{order.site_id}</span>
            </div>
          </div>
        </div>
        <Badge tone={isOpen ? 'success' : 'neutral'}>
          {isOpen ? 'Abierta' : 'Cerrada'}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-primary/50">
        <div className="flex items-center gap-1">
          <User2 size={10} />
          <span className="font-bold">{order.inspector_name || order.inspector_username}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} />
          <span>{startedAt ? startedAt.toLocaleString() : '—'}</span>
        </div>
        {order.start_lat && (
          <div className="flex items-center gap-1">
            <MapPin size={10} />
            <span>{Number(order.start_lat).toFixed(4)}, {Number(order.start_lng).toFixed(4)}</span>
          </div>
        )}
        {closedAt && (
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>Cerrada: {closedAt.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Link to={`/orders/${order.id}`}>
          <Button variant="outline">
            <Eye size={14} /> Ver detalle <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export default function Orders() {
  const load = useOrdersStore((s) => s.load)
  const isLoading = useOrdersStore((s) => s.isLoading)
  const orders = useOrdersStore((s) => s.orders)
  const filterStatus = useOrdersStore((s) => s.filterStatus)
  const search = useOrdersStore((s) => s.search)
  const setFilter = useOrdersStore((s) => s.setFilter)
  const getFiltered = useOrdersStore((s) => s.getFiltered)
  const error = useOrdersStore((s) => s.error)

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => getFiltered(), [orders, filterStatus, search])

  return (
    <div className="space-y-4 max-w-5xl">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-extrabold text-primary">Órdenes de Trabajo</div>
            <div className="text-[11px] text-primary/50 mt-0.5">Visitas a sitio creadas por los inspectores</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <div className="absolute left-3.5 top-[38px] text-primary/40 pointer-events-none">
              <Search size={16} />
            </div>
            <Input
              label="Buscar"
              value={search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Orden, sitio, inspector…"
              className="pl-10"
            />
          </div>
          <Select
            label="Estado"
            value={filterStatus}
            onChange={(e) => setFilter({ filterStatus: e.target.value })}
          >
            <option value="all">Todos</option>
            <option value="open">Abiertas</option>
            <option value="closed">Cerradas</option>
          </Select>
        </div>

        <div className="mt-3 text-[11px] text-primary/50">
          Mostrando <span className="font-bold">{filtered.length}</span> de <span className="font-bold">{orders.length}</span> órdenes
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-danger/20 bg-danger-light">
          <div className="text-sm text-danger font-bold">{error}</div>
          <Button variant="outline" className="mt-2" onClick={() => load(true)}>Reintentar</Button>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} />
          <span className="ml-3 text-sm text-primary/60 font-bold">Cargando órdenes…</span>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          title="Sin órdenes"
          description={search || filterStatus !== 'all' ? 'Prueba ajustando los filtros' : 'Aún no hay órdenes de trabajo'}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((o) => <OrderCard key={o.id} order={o} />)}
      </div>
    </div>
  )
}
