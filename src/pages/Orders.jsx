import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, MapPin } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useOrdersStore } from '../store/useOrdersStore'

function StatusDot({ status }) {
  const isOpen = status === 'open'
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${isOpen ? 'text-emerald-600' : 'text-gray-500'}`}>
      <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {isOpen ? 'Abierta' : 'Cerrada'}
    </span>
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

  useEffect(() => { load() }, [])
  const filtered = useMemo(() => getFiltered(), [orders, filterStatus, search])

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header + filters */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-800">Lista de órdenes</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">Órdenes de visita creadas por los inspectores</p>
            </div>
            <span className="text-[12px] font-medium text-gray-400">
              <span className="text-gray-600 font-semibold">{filtered.length}</span> registros
            </span>
          </div>
        </div>
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Buscar orden, sitio, inspector…"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilter({ filterStatus: e.target.value })}
            className="px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-w-[160px]"
          >
            <option value="all">Todas las órdenes</option>
            <option value="open">Abiertas</option>
            <option value="closed">Cerradas</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size={20} />
          <span className="ml-3 text-sm text-gray-400 font-medium">Cargando órdenes…</span>
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Orden</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sitio</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Inspector</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Inicio</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const startedAt = order.started_at ? new Date(order.started_at) : null
                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${order.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                            <MapPin size={14} />
                          </div>
                          <span className="text-[13px] font-semibold text-teal-700">{order.order_number}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-medium text-gray-800">{order.site_name}</div>
                        <div className="text-[11px] text-gray-400">ID: {order.site_id}</div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="text-[13px] text-gray-600">{order.inspector_name || order.inspector_username || '—'}</div>
                        <div className="text-[11px] text-gray-400">{order.inspector_role || ''}</div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="text-[13px] text-gray-500">{startedAt ? startedAt.toLocaleDateString() : '—'}</div>
                        <div className="text-[11px] text-gray-400">{startedAt ? startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusDot status={order.status} />
                      </td>
                      <td className="pr-4">
                        <Link to={`/orders/${order.id}`}>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-600 transition-colors" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 py-16 text-center">
          <MapPin size={32} className="mx-auto text-gray-300 mb-3" />
          <div className="text-sm font-medium text-gray-500">Sin órdenes</div>
          <div className="text-[12px] text-gray-400 mt-1">
            {search || filterStatus !== 'all' ? 'Prueba ajustando los filtros' : 'Aún no hay órdenes registradas'}
          </div>
        </div>
      )}
    </div>
  )
}
