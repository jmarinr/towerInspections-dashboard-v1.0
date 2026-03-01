import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, FolderOpen } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useOrdersStore } from '../store/useOrdersStore'

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
    <div className="max-w-6xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setFilter({ search: e.target.value })} placeholder="Buscar orden, sitio…"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilter({ filterStatus: e.target.value })}
            className="px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full sm:w-auto">
            <option value="all">Todas</option><option value="open">Abiertas</option><option value="closed">Cerradas</option>
          </select>
          <span className="text-[11px] text-gray-400 whitespace-nowrap hidden sm:block">{filtered.length} registros</span>
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Spinner size={20} /><span className="ml-3 text-sm text-gray-400">Cargando…</span></div>}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Sitio</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Inspector</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Inicio</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const d = order.started_at ? new Date(order.started_at) : null; const open = order.status === 'open'
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3"><span className="text-[12px] font-semibold text-emerald-700">{order.order_number}</span></td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] font-medium text-gray-800">{order.site_name}</div>
                      <div className="text-[10px] text-gray-400">ID: {order.site_id}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="text-[12px] text-gray-500">{order.inspector_name || '—'}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-[12px] text-gray-500">{d ? d.toLocaleDateString() : '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${open ? 'text-emerald-700' : 'text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {open ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                    <td className="pr-3"><Link to={`/orders/${order.id}`}><ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" /></Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <FolderOpen size={28} className="mx-auto text-gray-300 mb-2" />
          <div className="text-sm text-gray-500">Sin visitas</div>
          <div className="text-[11px] text-gray-400 mt-1">{search || filterStatus !== 'all' ? 'Ajusta los filtros' : 'Aún no hay datos'}</div>
        </div>
      )}
    </div>
  )
}
