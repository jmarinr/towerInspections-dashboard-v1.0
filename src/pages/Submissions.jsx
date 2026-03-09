import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta, isFormVisible } from '../data/formTypes'
import { extractSiteInfo, extractMeta, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

/** Compute checklist score for a submission */
function getScore(sub) {
  const p = sub?.payload?.payload || sub?.payload || {}
  const data = p.data || p
  const cl = data.checklistData || {}
  const keys = Object.keys(cl)
  if (!keys.length) return null // no checklist = no score
  let total = 0, good = 0
  for (const k of keys) {
    const item = cl[k]
    const st = (typeof item === 'string' ? item : item?.status || '').toLowerCase()
    if (!st) continue
    total++
    if (st === 'bueno' || st === 'good') good++
  }
  if (!total) return null
  return Math.round((good / total) * 100)
}

function MiniScore({ score }) {
  if (score === null) return null
  const color = score >= 80 ? 'text-good' : score >= 50 ? 'text-warn' : 'text-bad'
  const bg = score >= 80 ? 'bg-good/10' : score >= 50 ? 'bg-warn/10' : 'bg-bad/10'
  return <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${color} ${bg}`}>{score}%</span>
}

export default function Submissions() {
  const load = useSubmissionsStore((s) => s.load)
  const isLoading = useSubmissionsStore((s) => s.isLoading)
  const submissions = useSubmissionsStore((s) => s.submissions)
  const filterFormCode = useSubmissionsStore((s) => s.filterFormCode)
  const search = useSubmissionsStore((s) => s.search)
  const setFilter = useSubmissionsStore((s) => s.setFilter)
  const getFiltered = useSubmissionsStore((s) => s.getFiltered)
  const navigate = useNavigate()
  useEffect(() => { load() }, [])
  const filtered = useMemo(() => getFiltered().filter(s => isFormVisible(s.form_code)), [submissions, filterFormCode, search])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setFilter({ search: e.target.value })} placeholder="Buscar..."
            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow bg-white" />
        </div>
        <select value={filterFormCode} onChange={e => setFilter({ filterFormCode: e.target.value })}
          className="h-8 px-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white">
          <option value="all">Todos los tipos</option>
          {Object.entries(FORM_TYPES).filter(([c]) => isFormVisible(c)).map(([c, m]) => <option key={c} value={c}>{m.label}</option>)}
        </select>
        <span className="text-2xs text-gray-400 hidden sm:block tabular-nums whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Spinner size={16} /></div>}

      {!isLoading && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Tipo</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Sitio</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden md:table-cell">Orden</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden md:table-cell">Inspector</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden lg:table-cell">Inicio</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Estado</th>
                <th className="text-center px-2 py-2 text-2xs font-medium text-gray-500 w-14 hidden sm:table-cell">Score</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const m = getFormMeta(sub.form_code)
                const site = extractSiteInfo(sub)
                const who = extractSubmittedBy(sub)
                const inspMeta = extractMeta(sub)
                const fin = sub.finalized || isFinalized(sub)
                const score = getScore(sub)

                // Start date/time from meta
                const startedAt = inspMeta.startedAt || ''
                let startDate = '', startTime = ''
                if (startedAt) {
                  const parts = startedAt.split(' ')
                  startDate = parts[0] || ''
                  startTime = parts[1] || ''
                }
                if (!startDate && sub.created_at) {
                  const d = new Date(sub.created_at)
                  startDate = d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
                  startTime = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                }

                // Order reference
                const visitId = sub.site_visit_id
                const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

                return (
                  <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors group" onClick={() => navigate(`/submissions/${sub.id}`)}>
                    <td className="px-3 py-2.5 text-sm text-gray-900 font-medium">{m.shortLabel}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-gray-700">{site.nombreSitio}</div>
                      {site.idSitio && <div className="text-2xs text-gray-400">ID: {site.idSitio}</div>}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {hasOrder
                        ? <Link to={`/orders/${visitId}`} onClick={e => e.stopPropagation()} className="text-2xs text-accent hover:underline">{visitId.slice(0, 8)}...</Link>
                        : <span className="text-2xs text-gray-300">--</span>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden md:table-cell">{who?.name || '--'}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <div className="text-sm text-gray-600">{startDate}</div>
                      {startTime && <div className="text-2xs text-gray-400">{startTime}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      {fin ? <span className="text-2xs font-medium text-success">Completado</span>
                           : <span className="text-2xs font-medium text-warning">Borrador</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <MiniScore score={score} />
                    </td>
                    <td className="pr-3"><ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">{search || filterFormCode !== 'all' ? 'Sin resultados. Ajusta los filtros.' : 'Sin formularios aun.'}</div>
      )}
    </div>
  )
}
