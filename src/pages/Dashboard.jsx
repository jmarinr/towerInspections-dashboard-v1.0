import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ArrowUpRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function Metric({ label, value, sub }) {
  return (
    <div>
      <div className="text-2xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-0.5 tabular-nums">{value}</div>
      {sub && <div className="text-2xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const load = useSubmissionsStore((s) => s.load)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const stats = useSubmissionsStore((s) => s.stats)
  const isLoading = useSubmissionsStore((s) => s.isLoadingStats)
  useEffect(() => { load(); loadStats() }, [])

  if (isLoading || !stats) return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>

  const { total, recentCount, byFormCode, recent, totalVisits, openVisits } = stats

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Metric label="Total formularios" value={total} />
        <Metric label="Última semana" value={recentCount} sub="enviados" />
        <Metric label="Visitas activas" value={openVisits || 0} sub={`de ${totalVisits || 0}`} />
        <Metric label="Último envío" value={recent?.[0] ? new Date(recent[0].updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—'} />
      </div>

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* By type */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900">Por tipo de formulario</h2>
          </div>
          <div className="space-y-1">
            {Object.entries(byFormCode).sort((a, b) => b[1] - a[1]).map(([code, count]) => {
              const m = getFormMeta(code)
              return (
                <Link key={code} to={`/submissions?filter=${code}`} className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md hover:bg-gray-50 transition-colors group">
                  <span className="text-sm text-gray-700">{m.shortLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 tabular-nums">{count}</span>
                    <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              )
            })}
            {Object.keys(byFormCode).length === 0 && <div className="text-sm text-gray-400 py-4">Sin datos</div>}
          </div>
        </div>

        {/* Recent */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900">Actividad reciente</h2>
            <Link to="/submissions" className="text-2xs text-accent hover:underline flex items-center gap-0.5">Ver todo<ArrowUpRight size={10}/></Link>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Formulario</th>
                  <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden sm:table-cell">Sitio</th>
                  <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden md:table-cell">Inspector</th>
                  <th className="text-right px-3 py-2 text-2xs font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(recent || []).slice(0, 8).map(sub => {
                  const m = getFormMeta(sub.form_code); const site = extractSiteInfo(sub); const who = extractSubmittedBy(sub); const fin = sub.finalized || isFinalized(sub)
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2"><Link to={`/submissions/${sub.id}`} className="text-sm text-accent hover:underline">{m.shortLabel}</Link></td>
                      <td className="px-3 py-2 text-sm text-gray-600 hidden sm:table-cell">{site.nombreSitio}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 hidden md:table-cell">{who?.name || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {fin ? <span className="text-2xs font-medium text-success">Completado</span>
                             : <span className="text-2xs font-medium text-warning">Borrador</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(!recent || !recent.length) && <div className="text-center py-8 text-sm text-gray-400">Sin actividad</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
