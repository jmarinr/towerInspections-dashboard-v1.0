import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, TrendingUp, FileText, MapPin,
  CheckCircle2, Clock, ChevronRight, Image as ImageIcon,
} from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function StatCard({ icon: Icon, title, value, sub, color = 'bg-teal-50 text-teal-600' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 shadow-card p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] text-gray-400 font-medium">{title}</div>
          <div className="text-2xl font-bold text-gray-800 mt-0.5">{value}</div>
          {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function FormTypeSummary({ code, count }) {
  const meta = getFormMeta(code)
  const Icon = meta.icon
  return (
    <Link to={`/submissions?filter=${code}`} className="flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-colors group">
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-md ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
          <Icon size={12} />
        </div>
        <span className="text-[13px] font-medium text-gray-700">{meta.shortLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-teal-700">{count}</span>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-teal-500 transition-colors" />
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const load = useSubmissionsStore((s) => s.load)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const stats = useSubmissionsStore((s) => s.stats)
  const isLoading = useSubmissionsStore((s) => s.isLoadingStats)

  useEffect(() => { load(); loadStats() }, [])

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={20} />
        <span className="ml-3 text-sm text-gray-400 font-medium">Cargando datos…</span>
      </div>
    )
  }

  const { total, recentCount, byFormCode, recent, totalVisits, openVisits } = stats

  return (
    <div className="max-w-6xl space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} title="Total formularios" value={total} color="bg-teal-50 text-teal-600" />
        <StatCard icon={TrendingUp} title="Última semana" value={recentCount} sub="formularios enviados" color="bg-blue-50 text-blue-600" />
        <StatCard icon={MapPin} title="Órdenes activas" value={openVisits || 0} sub={`${totalVisits || 0} total`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={ImageIcon} title="Último envío" value={recent?.[0] ? new Date(recent[0].updated_at).toLocaleDateString() : '—'} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form types summary */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-[14px] font-semibold text-gray-800">Por tipo de formulario</h3>
          </div>
          <div className="px-4 py-3 space-y-0.5">
            {Object.entries(byFormCode).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
              <FormTypeSummary key={code} code={code} count={count} />
            ))}
            {Object.keys(byFormCode).length === 0 && (
              <div className="py-8 text-center text-[13px] text-gray-400">Sin formularios aún</div>
            )}
          </div>
        </div>

        {/* Recent submissions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/60 shadow-card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-gray-800">Formularios recientes</h3>
            <Link to="/submissions" className="text-[12px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Formulario</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sitio</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Inspector</th>
                  <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(recent || []).slice(0, 10).map((sub) => {
                  const meta = getFormMeta(sub.form_code)
                  const Icon = meta.icon
                  const site = extractSiteInfo(sub)
                  const submitter = extractSubmittedBy(sub)
                  const finalized = sub.finalized || isFinalized(sub)
                  return (
                    <tr key={sub.id} className="border-b border-gray-50/80 hover:bg-gray-50/40 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded ${meta.color} text-white flex items-center justify-center flex-shrink-0`}>
                            <Icon size={11} />
                          </div>
                          <span className="text-[12px] font-medium text-gray-700">{meta.shortLabel}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-gray-600">{site.nombreSitio}</span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-[12px] text-gray-500">{submitter?.name || '—'}</span>
                      </td>
                      <td className="px-5 py-3">
                        {finalized ? (
                          <span className="text-[10px] font-semibold text-emerald-600">Finalizado</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-500">Borrador</span>
                        )}
                      </td>
                      <td className="pr-4">
                        <Link to={`/submissions/${sub.id}`}>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-teal-600 transition-colors" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(!recent || recent.length === 0) && (
              <div className="py-12 text-center text-[13px] text-gray-400">Sin formularios recientes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
