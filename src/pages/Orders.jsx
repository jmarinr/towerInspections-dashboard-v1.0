import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Download, Loader2, X } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useOrdersStore } from '../store/useOrdersStore'
import { fetchSubmissionsWithAssetsForVisit } from '../lib/supabaseQueries'
import { normalizeFormCode, isFormVisible } from '../data/formTypes'
import { generateMaintenancePdf } from '../utils/pdf/maintenancePdf'
import { generateGroundingPdf } from '../utils/pdf/groundingPdf'
import { generatePMExecutedPdf } from '../utils/pdf/pmExecutedPdf'
import { generateSafetyPdf } from '../utils/pdf/safetyPdf'
import { generateSubmissionPdf } from '../utils/pdf/generateReport'
import { generateEquipmentV2Pdf } from '../utils/pdf/equipmentV2Pdf'

async function downloadAllPdfs(orderId, orderNumber) {
  const subs = await fetchSubmissionsWithAssetsForVisit(orderId)
  const visible = subs.filter(s => isFormVisible(s.form_code))
  if (!visible.length) { alert('No hay formularios para descargar'); return }

  for (const sub of visible) {
    const fc = normalizeFormCode(sub.form_code)
    let bytes
    try {
      if      (fc === 'preventive-maintenance') bytes = await generateMaintenancePdf(sub, sub.assets || [])
      else if (fc === 'grounding-system-test')  bytes = await generateGroundingPdf(sub, sub.assets || [])
      else if (fc === 'executed-maintenance')   bytes = await generatePMExecutedPdf(sub, sub.assets || [])
      else if (fc === 'safety-system')          bytes = await generateSafetyPdf(sub, sub.assets || [])
      else if (fc === 'equipment-v2') {
        const photoMap = {}
        ;(sub.assets || []).forEach(a => {
          const key = a.asset_type || a.type || ''
          const url = a.public_url || a.storage_url || a.url
          if (key && url) photoMap[key] = url
        })
        bytes = await generateEquipmentV2Pdf(sub, photoMap)
      }
      else bytes = await generateSubmissionPdf(sub, sub.assets || [])
    } catch (e) { console.error(`PDF error for ${fc}:`, e); continue }

    if (bytes) {
      const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${orderNumber || orderId.slice(0,8)}_${fc}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

function BulkDownloadBtn({ orderId, orderNumber }) {
  const [loading, setLoading] = useState(false)
  const handleClick = async (e) => {
    e.stopPropagation(); e.preventDefault()
    setLoading(true)
    try { await downloadAllPdfs(orderId, orderNumber) } catch (e) { console.error(e) }
    setLoading(false)
  }
  return (
    <button onClick={handleClick} disabled={loading}
      title="Descargar todos los PDFs"
      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 disabled:opacity-40 transition-colors">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
    </button>
  )
}

export default function Orders() {
  const load         = useOrdersStore((s) => s.load)
  const isLoading    = useOrdersStore((s) => s.isLoading)
  const orders       = useOrdersStore((s) => s.orders)
  const filterStatus = useOrdersStore((s) => s.filterStatus)
  const search       = useOrdersStore((s) => s.search)
  const setFilter    = useOrdersStore((s) => s.setFilter)
  const getFiltered  = useOrdersStore((s) => s.getFiltered)
  const navigate     = useNavigate()

  useEffect(() => { load() }, [])
  const filtered = useMemo(() => getFiltered(), [orders, filterStatus, search])
  const hasFilter = search || filterStatus !== 'all'

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[20px] font-bold text-slate-900">Visitas</h1>
        <span className="text-[12px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
          {filtered.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setFilter({ search: e.target.value })}
            placeholder="Buscar orden, sitio…"
            className="w-full h-9 pl-9 pr-8 text-[13px] bg-white border border-slate-200 rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400" />
          {search && (
            <button onClick={() => setFilter({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        <select value={filterStatus} onChange={e => setFilter({ filterStatus: e.target.value })}
          className="h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-700">
          <option value="all">Todas</option>
          <option value="open">Abiertas</option>
          <option value="closed">Cerradas</option>
        </select>

        {hasFilter && (
          <button onClick={() => setFilter({ search: '', filterStatus: 'all' })}
            className="h-9 px-3 text-[13px] text-slate-500 hover:text-slate-800 bg-white border border-slate-200
              rounded-lg shadow-sm flex items-center gap-1.5 transition-colors hover:bg-slate-50">
            <X size={13} />Limpiar
          </button>
        )}
      </div>

      {isLoading && <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Orden</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sitio</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Inspector</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center w-16">PDFs</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(o => {
                const d    = o.started_at ? new Date(o.started_at) : null
                const open = o.status === 'open'
                return (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors group">

                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-bold text-indigo-500">{o.order_number}</span>
                    </td>

                    <td className="px-4 py-3.5 min-w-0">
                      <div className="text-[13px] font-semibold text-slate-800 truncate max-w-[200px]">{o.site_name}</div>
                      {o.site_id && <div className="text-[11px] text-slate-400 mt-0.5">ID: {o.site_id}</div>}
                    </td>

                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-[13px] text-slate-600">{o.inspector_name || '—'}</span>
                    </td>

                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-[13px] text-slate-600">
                        {d ? d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {open
                        ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Abierta
                          </span>
                        : <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Cerrada
                          </span>}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <BulkDownloadBtn orderId={o.id} orderNumber={o.order_number} />
                    </td>

                    <td className="pr-3 py-3.5">
                      <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-sm">
          <div className="text-[15px] font-semibold text-slate-500 mb-1">Sin resultados</div>
          <div className="text-[13px] text-slate-400">
            {hasFilter ? 'Ajusta los filtros.' : 'Sin visitas registradas aún.'}
          </div>
        </div>
      )}
    </div>
  )
}
