import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, CheckCircle2, Clock, ChevronRight, ClipboardList } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function StatusPill({ finalized }) {
  return finalized
    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Final</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={10} /> Borrador</span>
}

export default function Submissions() {
  const load = useSubmissionsStore((s) => s.load)
  const isLoading = useSubmissionsStore((s) => s.isLoading)
  const submissions = useSubmissionsStore((s) => s.submissions)
  const filterFormCode = useSubmissionsStore((s) => s.filterFormCode)
  const search = useSubmissionsStore((s) => s.search)
  const setFilter = useSubmissionsStore((s) => s.setFilter)
  const getFiltered = useSubmissionsStore((s) => s.getFiltered)
  const error = useSubmissionsStore((s) => s.error)
  useEffect(() => { load() }, [])
  const filtered = useMemo(() => getFiltered(), [submissions, filterFormCode, search])
  const navigate = useNavigate()

  return (
    <div className="max-w-6xl space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setFilter({ search: e.target.value })} placeholder="Buscar sitio, inspector…"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
          </div>
          <select value={filterFormCode} onChange={(e) => setFilter({ filterFormCode: e.target.value })}
            className="px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-full sm:w-auto">
            <option value="all">Todos los tipos</option>
            {Object.entries(FORM_TYPES).map(([code, m]) => <option key={code} value={code}>{m.label}</option>)}
          </select>
          <span className="text-[11px] text-gray-400 whitespace-nowrap hidden sm:block">{filtered.length} de {submissions.length}</span>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {isLoading && <div className="flex items-center justify-center py-16"><Spinner size={20} /><span className="ml-3 text-sm text-gray-400">Cargando…</span></div>}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Sitio</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Inspector</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((sub) => {
                const meta = getFormMeta(sub.form_code); const Icon = meta.icon; const site = extractSiteInfo(sub); const submitter = extractSubmittedBy(sub)
                const fin = sub.finalized || isFinalized(sub); const d = sub.updated_at ? new Date(sub.updated_at) : null
                return (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/submissions/${sub.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-md ${meta.color} text-white flex items-center justify-center flex-shrink-0`}><Icon size={12} /></div>
                        <span className="text-[12px] font-medium text-gray-800">{meta.shortLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[12px] font-medium text-gray-800">{site.nombreSitio}</div>
                      <div className="text-[10px] text-gray-400">ID: {site.idSitio}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="text-[12px] text-gray-500">{submitter?.name || '—'}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-[12px] text-gray-500">{d ? d.toLocaleDateString() : '—'}</div>
                      <div className="text-[10px] text-gray-400">{d ? d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</div>
                    </td>
                    <td className="px-4 py-3"><StatusPill finalized={fin} /></td>
                    <td className="pr-3">
                      <Link to={`/submissions/${sub.id}`}><ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" /></Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <ClipboardList size={28} className="mx-auto text-gray-300 mb-2" />
          <div className="text-sm text-gray-500">Sin formularios</div>
          <div className="text-[11px] text-gray-400 mt-1">{search || filterFormCode !== 'all' ? 'Ajusta los filtros' : 'Aún no hay datos'}</div>
        </div>
      )}
    </div>
  )
}
