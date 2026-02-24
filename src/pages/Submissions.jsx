import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function FormCodeBadge({ formCode }) {
  const meta = getFormMeta(formCode)
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
        <Icon size={14} />
      </div>
      <span className="text-[13px] font-medium text-gray-800">{meta.shortLabel}</span>
    </div>
  )
}

function StatusBadge({ finalized }) {
  return finalized ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
      <CheckCircle2 size={10} /> Finalizado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
      <Clock size={10} /> Borrador
    </span>
  )
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

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header + filters */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-800">Lista de formularios</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">Inspecciones y reportes enviados por los inspectores</p>
            </div>
            <span className="text-[12px] font-medium text-gray-400">
              Mostrando <span className="text-gray-600 font-semibold">{filtered.length}</span> de {submissions.length}
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
              placeholder="Buscar sitio, ID, inspector…"
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>
          <select
            value={filterFormCode}
            onChange={(e) => setFilter({ filterFormCode: e.target.value })}
            className="px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-w-[180px]"
          >
            <option value="all">Todos los formularios</option>
            {Object.entries(FORM_TYPES).map(([code, m]) => (
              <option key={code} value={code}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <span className="text-sm font-medium text-red-700">{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size={20} />
          <span className="ml-3 text-sm text-gray-400 font-medium">Cargando formularios…</span>
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Formulario</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sitio</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Inspector</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => {
                  const site = extractSiteInfo(sub)
                  const submitter = extractSubmittedBy(sub)
                  const finalized = sub.finalized || isFinalized(sub)
                  const updatedAt = sub.updated_at ? new Date(sub.updated_at) : null
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <FormCodeBadge formCode={sub.form_code} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-[13px] font-medium text-gray-800">{site.nombreSitio}</div>
                        <div className="text-[11px] text-gray-400">ID: {site.idSitio}</div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="text-[13px] text-gray-600">{submitter?.name || submitter?.username || '—'}</div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="text-[13px] text-gray-500">
                          {updatedAt ? updatedAt.toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {updatedAt ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge finalized={finalized} />
                      </td>
                      <td className="pr-4">
                        <Link to={`/submissions/${sub.id}`}>
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
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <div className="text-sm font-medium text-gray-500">Sin formularios</div>
          <div className="text-[12px] text-gray-400 mt-1">
            {search || filterFormCode !== 'all' ? 'Prueba ajustando los filtros' : 'Aún no hay inspecciones registradas'}
          </div>
        </div>
      )}
    </div>
  )
}
