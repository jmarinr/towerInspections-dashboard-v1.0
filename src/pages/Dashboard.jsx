import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { Link } from 'react-router-dom'
import { ChevronRight, ArrowUpRight, TrendingUp, ClipboardList, FolderOpen, Camera, Activity } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import LoadError from '../components/ui/LoadError'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta, isFormVisible } from '../data/formTypes'
import { extractSiteInfo, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function StatCard({ icon: Icon, label, value, sub, primary = false }) {
  return (
    <div className="rounded-2xl p-5 border th-shadow animate-slide-up flex flex-col gap-3 transition-colors"
      style={{
        background:   primary ? 'var(--stat-accent-bg)' : 'var(--bg-card)',
        borderColor:  primary ? 'transparent' : 'var(--border)',
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: primary ? 'rgba(255,255,255,0.15)' : 'var(--accent-light)' }}>
        <Icon size={16} strokeWidth={1.8}
          style={{ color: primary ? 'var(--stat-accent-text)' : 'var(--accent)' }} />
      </div>
      <div>
        <div className="text-[28px] font-bold leading-none tabular-nums"
          style={{ color: primary ? 'var(--stat-accent-text)' : 'var(--text-primary)' }}>
          {value}
        </div>
        <div className="text-[12px] font-medium mt-1"
          style={{ color: primary ? 'rgba(255,255,255,0.55)' : 'var(--text-secondary)' }}>
          {label}
        </div>
        {sub && (
          <div className="text-[11px] mt-0.5"
            style={{ color: primary ? 'var(--stat-accent-sub)' : 'var(--text-muted)' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const load      = useSubmissionsStore((s) => s.load)
  const loadStats = useSubmissionsStore((s) => s.loadStats)
  const stats     = useSubmissionsStore((s) => s.stats)
  const isLoading = useSubmissionsStore((s) => s.isLoadingStats)
  const storeError = useSubmissionsStore((s) => s.error)

  const [timedOut, setTimedOut] = useState(false)

  const authReady = useAuthStore((s) => !s.isLoading && s.isAuthed)
  useEffect(() => {
    if (!authReady) return
    useSubmissionsStore.setState({ error: null })
    load(true); loadStats()
  }, [authReady])

  // Solo mostrar error si no hay datos aún (stats === null)
  // Si hay datos, ignorar errores de polling — los datos siguen siendo válidos
  if (!stats && storeError)
    return <LoadError
      message={storeError}
      onRetry={() => { useSubmissionsStore.setState({ error: null }); load(true); loadStats() }}
    />

  if (!stats && isLoading)
    return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>

  if (!stats)
    return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>

  const { total, recentCount, byFormCode, recent, totalVisits, openVisits } = stats
  const lastDate = recent?.[0]
    ? new Date(recent[0].updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })
    : '—'

  return (
    <div className="space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Formularios totales" value={total} primary />
        <StatCard icon={TrendingUp}   label="Última semana"        value={recentCount} sub="nuevos envíos" />
        <StatCard icon={FolderOpen}   label="Visitas activas"      value={openVisits || 0} sub={`de ${totalVisits || 0} totales`} />
        <StatCard icon={Camera}       label="Último envío"         value={lastDate} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">

        {/* By type */}
        <div className="rounded-2xl border th-shadow overflow-hidden transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-[14px] font-semibold th-text-p">Por tipo</h2>
            <span className="text-[11px] font-medium th-text-m">
              {Object.keys(byFormCode).filter(c => isFormVisible(c)).length} tipos
            </span>
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className={`w-7 h-7 rounded-lg ${m.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <I size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium th-text-s truncate">{m.shortLabel}</div>
                      <div className="mt-1 h-1 rounded-full overflow-hidden w-full"
                        style={{ background: 'var(--bg-base)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: 'var(--text-muted)' }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[13px] font-bold tabular-nums th-text-p">{count}</span>
                      <ChevronRight size={11} className="th-text-m group-hover:text-sky-600 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            {!Object.keys(byFormCode).length && (
              <div className="py-8 text-center text-[12px] th-text-m">Sin datos</div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border th-shadow overflow-hidden transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Activity size={14} className="th-text-m" strokeWidth={1.8} />
              <h2 className="text-[14px] font-semibold th-text-p">Actividad reciente</h2>
            </div>
            <Link to="/submissions"
              className="text-[11px] font-semibold flex items-center gap-0.5 transition-colors"
              style={{ color: 'var(--accent-text)' }}>
              Ver todo <ArrowUpRight size={10} />
            </Link>
          </div>

          <div>
            {(recent || []).filter(s => isFormVisible(s.form_code)).slice(0, 9).map((sub, i, arr) => {
              const m    = getFormMeta(sub.form_code)
              const I    = m.icon
              const site = extractSiteInfo(sub)
              const who  = extractSubmittedBy(sub)
              const fin  = sub.finalized || isFinalized(sub)
              const date = sub.updated_at
                ? new Date(sub.updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })
                : ''

              return (
                <Link key={sub.id} to={`/submissions/${sub.id}`}
                  className="flex items-center gap-3.5 px-5 py-3 transition-colors group"
                  style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className={`w-8 h-8 rounded-xl ${m.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <I size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium th-text-p truncate">
                      {site.nombreSitio || <span className="th-text-m">Sin nombre</span>}
                      <span className="th-text-m font-normal ml-1.5">· {m.shortLabel}</span>
                    </div>
                    <div className="text-[11px] th-text-m mt-0.5">{who?.name || '—'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {fin
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Completado
                        </span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Borrador
                        </span>}
                    {date && <span className="text-[10px] th-text-m">{date}</span>}
                  </div>
                  <ChevronRight size={13} className="th-text-m group-hover:text-sky-600 transition-colors flex-shrink-0" />
                </Link>
              )
            })}
            {(!recent || !recent.length) && (
              <div className="py-12 text-center text-[13px] th-text-m">Sin actividad reciente</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
