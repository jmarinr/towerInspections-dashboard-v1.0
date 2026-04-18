import { MapPin, Download } from 'lucide-react'
import useSitesCoverageReport from '../../hooks/useSitesCoverageReport'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'
import Pagination from '../../components/ui/Pagination'

const STATUS_CONFIG = {
  in_progress: { label: 'En curso',   bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  ok:          { label: '≤14 días',   bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  warn:        { label: '14-21 días', bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  alert:       { label: '>21 días',   bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  unknown:     { label: 'Sin datos',  bg: 'var(--bg-base)', color: 'var(--text-muted)', border: 'var(--border)' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow flex flex-col gap-1"
      style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold th-text-p">{label}</div>
      {sub && <div className="text-[10px] th-text-m">{sub}</div>}
    </div>
  )
}

export default function SitesCoverageReport() {
  const {
    filtered, paginated, kpis, orgs,
    filterOrg, filterStatus, search, setFilter,
    currentPage, setCurrentPage, pageSize, totalFiltered,
    exportToExcel, isLoading, error,
  } = useSitesCoverageReport()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Sitios Únicos"    value={kpis.total}   color="var(--accent)"  />
        <KpiCard label="En Progreso"      value={kpis.inProg}  color="#3b82f6" sub="orden abierta activa" />
        <KpiCard label="≤14 días"         value={kpis.ok}      color="#16a34a" sub="inspeccionados recientemente" />
        <KpiCard label="14–21 días"       value={kpis.warn}    color="#ca8a04" sub="requieren seguimiento" />
        <KpiCard label=">21 días"         value={kpis.alert}   color="#dc2626" sub="crítico — sin visita reciente" />
      </div>

      {/* Filtros + Excel */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={e => setFilter('search', e.target.value)}
          placeholder="Buscar sitio o ID…"
          className="flex-1 min-w-[180px] px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <select value={filterOrg} onChange={e => setFilter('org', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">Todas las orgs</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilter('status', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">Todos los estados</option>
          <option value="alert">Crítico (&gt;21d)</option>
          <option value="warn">Atención (14-21d)</option>
          <option value="ok">OK (≤14d)</option>
          <option value="in_progress">En progreso</option>
        </select>
        <button onClick={exportToExcel}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white flex items-center gap-1.5 flex-shrink-0"
          style={{ background: '#0284C7' }}>
          <Download size={13} /> Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[13px]" style={{ background: 'var(--bg-card)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
              {['Sitio', 'Nombre', 'Org', 'Visitas', 'Último Inspector', 'Última Actividad', 'Días', 'Estado'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold th-text-m uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((s, i) => (
              <tr key={s.siteId || i}
                style={{ borderTop: '1px solid var(--border-light)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td className="px-4 py-3 font-mono text-[12px] font-semibold th-text-p">{s.siteId || '—'}</td>
                <td className="px-4 py-3 th-text-p">{s.siteName || '—'}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{s.orgCode}</span></td>
                <td className="px-4 py-3 text-center font-mono">{s.visits}</td>
                <td className="px-4 py-3 th-text-m text-[12px]">{s.lastInspector || '—'}</td>
                <td className="px-4 py-3 th-text-m text-[12px]">{s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' }) : '—'}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: s.status === 'alert' ? '#dc2626' : s.status === 'warn' ? '#ca8a04' : 'var(--text-secondary)' }}>
                  {s.status === 'in_progress' ? '—' : s.days !== null ? `${s.days}d` : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
            {!paginated.length && (
              <tr><td colSpan={8} className="px-4 py-10 text-center th-text-m text-[13px]">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalItems={totalFiltered} pageSize={pageSize} onPageChange={setCurrentPage} />
    </div>
  )
}
