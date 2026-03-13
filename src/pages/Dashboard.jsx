import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ArrowUpRight, TrendingUp, ClipboardList, FolderOpen, Camera, Activity } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta, isFormVisible } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className={`rounded-2xl p-5 border shadow-sm flex flex-col gap-3 animate-slide-up
      ${accent ? 'bg-[#0F172A] border-transparent text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center
        ${accent ? 'bg-white/10' : 'bg-slate-100'}`}>
        <Icon size={16} className={accent ? 'text-white' : 'text-slate-600'} strokeWidth={1.8} />
      </div>
      <div>
        <div className={`text-[28px] font-bold leading-none tabular-nums ${accent ? 'text-white' : 'text-slate-900'}`}>
          {value}
        </div>
        <div className={`text-[12px] font-medium mt-1 ${accent ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
        {sub && <div className={`text-[11px] mt-0.5 ${accent ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const load      = useSubmissionsStore((s) => s.load)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const stats     = useSubmissionsStore((s) => s.stats)
  const isLoading = useSubmissionsStore((s) => s.isLoadingStats)

  useEffect(() => { load(); loadStats() }, [])

  if (isLoading || !stats)
    return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>

  const { total, recentCount, byFormCode, recent, totalVisits, openVisits } = stats

  const lastDate = recent?.[0]
    ? new Date(recent[0].updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })
    : '—'

  return (
    <div className="space-y-6">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Formularios totales" value={total} accent />
        <StatCard icon={TrendingUp}   label="Última semana"        value={recentCount} sub="nuevos envíos" />
        <StatCard icon={FolderOpen}   label="Visitas activas"      value={openVisits || 0} sub={`de ${totalVisits || 0} totales`} />
        <StatCard icon={Camera}       label="Último envío"         value={lastDate} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

        {/* By type */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-slate-800">Por tipo</h2>
            <span className="text-[11px] text-slate-400 font-medium">{Object.keys(byFormCode).filter(c => isFormVisible(c)).length} tipos</span>
          </div>
          <div className="p-3 space-y-0.5">
            {Object.entries(byFormCode)
              .filter(([code]) => isFormVisible(code))
              .sort((a, b) => b[1] - a[1])
              .map(([code, count]) => {
                const m = getFormMeta(code)
                const I = m.icon
                const pct = total ? Math.round((count / total) * 100) : 0
                return (
                  <Link key={code} to={`/submissions?filter=${code}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className={`w-7 h-7 rounded-lg ${m.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <I size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-slate-700 truncate">{m.shortLabel}</div>
                      {/* Mini bar */}
                      <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-full">
                        <div className="h-full bg-slate-300 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[13px] font-bold text-slate-900 tabular-nums">{count}</span>
                      <ChevronRight size={11} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            {!Object.keys(byFormCode).length && (
              <div className="py-8 text-center text-[12px] text-slate-400">Sin datos</div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-slate-500" strokeWidth={1.8} />
              <h2 className="text-[14px] font-semibold text-slate-800">Actividad reciente</h2>
            </div>
            <Link to="/submissions"
              className="text-[11px] text-indigo-500 font-semibold hover:text-indigo-700 flex items-center gap-0.5 transition-colors">
              Ver todo <ArrowUpRight size={10} />
            </Link>
          </div>

          <div className="divide-y divide-slate-50">
            {(recent || []).filter(s => isFormVisible(s.form_code)).slice(0, 9).map(sub => {
              const m   = getFormMeta(sub.form_code)
              const I   = m.icon
              const site = extractSiteInfo(sub)
              const who  = extractSubmittedBy(sub)
              const fin  = sub.finalized || isFinalized(sub)
              const date = sub.updated_at
                ? new Date(sub.updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })
                : ''

              return (
                <Link key={sub.id} to={`/submissions/${sub.id}`}
                  className="flex items-center gap-3.5 px-5 py-3 hover:bg-indigo-50/30 transition-colors group">
                  <div className={`w-8 h-8 rounded-xl ${m.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <I size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-slate-800 truncate">
                      {site.nombreSitio || <span className="text-slate-400">Sin nombre</span>}
                      <span className="text-slate-400 font-normal ml-1.5">· {m.shortLabel}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{who?.name || '—'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {fin
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Completado
                        </span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Borrador
                        </span>}
                    {date && <span className="text-[10px] text-slate-400">{date}</span>}
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </Link>
              )
            })}
            {(!recent || !recent.length) && (
              <div className="py-12 text-center text-[13px] text-slate-400">Sin actividad reciente</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
