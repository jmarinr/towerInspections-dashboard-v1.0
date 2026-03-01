import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, TrendingUp, FolderOpen, Image as ImageIcon, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { FORM_TYPES, getFormMeta } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function Stat({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] text-gray-400 font-medium">{label}</div>
          <div className={`text-2xl font-bold mt-1 ${accent ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</div>
          {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const load = useSubmissionsStore((s) => s.load)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const stats = useSubmissionsStore((s) => s.stats)
  const isLoading = useSubmissionsStore((s) => s.isLoadingStats)
  useEffect(() => { load(); loadStats() }, [])

  if (isLoading || !stats) return <div className="flex items-center justify-center py-20"><Spinner size={20} /><span className="ml-3 text-sm text-gray-400">Cargando…</span></div>

  const { total, recentCount, byFormCode, recent, totalVisits, openVisits } = stats

  return (
    <div className="max-w-6xl space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={ClipboardList} label="Formularios" value={total} accent />
        <Stat icon={TrendingUp} label="Última semana" value={recentCount} sub="enviados" />
        <Stat icon={FolderOpen} label="Visitas activas" value={openVisits || 0} sub={`${totalVisits || 0} total`} />
        <Stat icon={ImageIcon} label="Último envío" value={recent?.[0] ? new Date(recent[0].updated_at).toLocaleDateString() : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By type */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-50"><h3 className="text-[13px] font-semibold text-gray-800">Por tipo</h3></div>
          <div className="p-2">
            {Object.entries(byFormCode).sort((a,b) => b[1]-a[1]).map(([code, count]) => {
              const m = getFormMeta(code); const I = m.icon
              return (
                <Link key={code} to={`/submissions?filter=${code}`} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-md ${m.color} text-white flex items-center justify-center`}><I size={12} /></div>
                    <span className="text-[12px] font-medium text-gray-700">{m.shortLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-gray-900">{count}</span>
                    <ChevronRight size={12} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </Link>
              )
            })}
            {Object.keys(byFormCode).length === 0 && <div className="py-6 text-center text-[12px] text-gray-400">Sin datos</div>}
          </div>
        </div>

        {/* Recent */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-gray-800">Actividad reciente</h3>
            <Link to="/submissions" className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">Ver todo <ChevronRight size={10} /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recent || []).slice(0, 8).map((sub) => {
              const m = getFormMeta(sub.form_code); const I = m.icon; const site = extractSiteInfo(sub); const submitter = extractSubmittedBy(sub); const fin = sub.finalized || isFinalized(sub)
              return (
                <Link key={sub.id} to={`/submissions/${sub.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 transition-colors group">
                  <div className={`w-7 h-7 rounded-md ${m.color} text-white flex items-center justify-center flex-shrink-0`}><I size={11} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-gray-800 truncate">{site.nombreSitio} <span className="text-gray-400">· {m.shortLabel}</span></div>
                    <div className="text-[10px] text-gray-400">{submitter?.name || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {fin ? <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Final</span>
                         : <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Borrador</span>}
                    <ChevronRight size={12} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </Link>
              )
            })}
            {(!recent || recent.length === 0) && <div className="py-10 text-center text-[12px] text-gray-400">Sin actividad reciente</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
