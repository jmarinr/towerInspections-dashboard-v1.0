import { useEffect, useMemo, useState } from 'react'
import { Search, Filter, Eye, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Input from '../components/ui/Input.jsx'
import Select from '../components/ui/Select.jsx'
import Button from '../components/ui/Button.jsx'
import { useOrdersStore } from '../store/useOrdersStore.js'

export default function Orders() {
  const load = useOrdersStore(s => s.load)
  const isLoading = useOrdersStore(s => s.isLoading)
  const orders = useOrdersStore(s => s.orders)
  const selectedStatus = useOrdersStore(s => s.selectedStatus)
  const search = useOrdersStore(s => s.search)
  const setFilter = useOrdersStore(s => s.setFilter)
  const getFiltered = useOrdersStore(s => s.getFiltered)

  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!orders.length) load()
  }, [])

  const filtered = useMemo(() => getFiltered(), [orders, selectedStatus, search])

  const tone = (status) => (status === 'reviewed' ? 'success' : status === 'submitted' ? 'warning' : 'neutral')

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-primary">Órdenes de inspección</div>
            <div className="text-xs text-primary/60 mt-1">Búsqueda, filtros y acceso a detalle + evidencia</div>
          </div>
          <Button variant="outline" onClick={() => setShowFilters(v => !v)}>
            <Filter size={16} /> {showFilters ? 'Ocultar' : 'Filtros'}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <div className="absolute left-4 top-[41px] text-primary/40">
              <Search size={16} />
            </div>
            <Input
              label="Buscar"
              value={search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="ID, sitio, inspector…"
              className="pl-0"
            />
          </div>

          {showFilters && (
            <Select
              label="Estado"
              value={selectedStatus}
              onChange={(e) => setFilter({ selectedStatus: e.target.value })}
            >
              <option value="all">Todos</option>
              <option value="draft">draft</option>
              <option value="submitted">submitted</option>
              <option value="reviewed">reviewed</option>
            </Select>
          )}
        </div>

        <div className="mt-4 text-[11px] text-primary/60">
          Mostrando <span className="font-bold">{filtered.length}</span> de <span className="font-bold">{orders.length}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((o) => (
          <Card key={o.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-extrabold text-primary truncate">{o.id} · {o.siteName}</div>
                <div className="text-xs text-primary/60 mt-1 truncate">
                  {o.type} · Sitio: <span className="font-bold">{o.siteId}</span> · Inspector: <span className="font-bold">{o.inspectorName}</span>
                </div>
              </div>
              <Badge tone={tone(o.status)}>{o.status}</Badge>
            </div>

            <div className="mt-3">
              <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${Math.round(o.completion * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-primary/60">
                <span>Completitud</span>
                <span className="font-bold">{Math.round(o.completion * 100)}%</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-[11px] text-primary/60">
                Fotos: <span className="font-bold">{o.photos.length}</span>
              </div>
              <Link to={`/orders/${o.id}`}>
                <Button variant="outline">
                  <Eye size={16} /> Ver detalle <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {isLoading && (
        <div className="text-center text-sm text-primary/60 font-bold py-6">Cargando órdenes…</div>
      )}
    </div>
  )
}
