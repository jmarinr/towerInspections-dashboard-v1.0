import { useState } from 'react'
import { ChevronRight, ChevronDown, Download } from 'lucide-react'
import useHistorialSitiosReport from '../../hooks/useHistorialSitiosReport'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'
import Pagination from '../../components/ui/Pagination'

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow" style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold th-text-p mt-0.5">{label}</div>
      {sub && <div className="text-[10px] th-text-m mt-0.5">{sub}</div>}
    </div>
  )
}

function ImprovBadge({ improvement }) {
  if (improvement === null) return <span className="text-[11px] th-text-m">—</span>
  if (improvement > 0) return <span className="text-[11px] font-bold" style={{ color: '#16a34a' }}>+{improvement}pp ↑</span>
  if (improvement < 0) return <span className="text-[11px] font-bold" style={{ color: '#dc2626' }}>{improvement}pp ↓</span>
  return <span className="text-[11px] th-text-m">Sin cambio</span>
}

function SiteRow({ site }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        style={{ borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>
        <td className="px-4 py-3">
          {expanded
            ? <ChevronDown size={14} className="th-text-m" />
            : <ChevronRight size={14} className="th-text-m" />}
        </td>
        <td className="px-4 py-3 font-mono text-[12px] font-semibold th-text-p">{site.siteId || '—'}</td>
        <td className="px-4 py-3 th-text-p">{site.siteName}</td>
        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{site.orgCode}</span></td>
        <td className="px-4 py-3 text-center font-mono font-bold th-text-p">{site.vCount}</td>
        <td className="px-4 py-3 font-mono text-[12px]" style={{ color: site.lastV.rate >= 65 ? '#16a34a' : site.lastV.rate >= 50 ? '#ca8a04' : '#dc2626' }}>{site.lastV.rate}%</td>
        <td className="px-4 py-3"><ImprovBadge improvement={site.improvement} /></td>
        <td className="px-4 py-3 th-text-m text-[12px]">{site.lastV.startedAt ? new Date(site.lastV.startedAt).toLocaleDateString('es', { day:'numeric', month:'short' }) : '—'}</td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--bg-base)' }}>
          <td colSpan={8} className="px-6 py-4">
            <div className="space-y-2">
              {site.visits.map((v, idx) => (
                <div key={v.visitId || idx} className="flex items-center gap-4 text-[12px]"
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'var(--accent)', color: '#fff' }}>{idx+1}</span>
                  <span className="th-text-m w-24 flex-shrink-0">{v.startedAt ? new Date(v.startedAt).toLocaleDateString('es') : '—'}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold flex-shrink-0 ${v.status === 'closed' ? '' : ''}`}
                    style={{ background: v.status === 'closed' ? '#dcfce7' : '#dbeafe', color: v.status === 'closed' ? '#15803d' : '#1d4ed8' }}>
                    {v.status}
                  </span>
                  <span className="th-text-m flex-shrink-0">{v.inspector}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div style={{ background: 'var(--bg-base)', borderRadius: 3, height: 6, flex: 1, overflow: 'hidden' }}>
                      <div style={{ width: `${v.rate}%`, height: '100%', background: v.rate >= 65 ? '#16a34a' : v.rate >= 50 ? '#ca8a04' : '#dc2626', borderRadius: 3 }} />
                    </div>
                    <span className="font-mono font-bold" style={{ color: v.rate >= 65 ? '#16a34a' : v.rate >= 50 ? '#ca8a04' : '#dc2626' }}>{v.rate}%</span>
                  </div>
                  {idx > 0 && (
                    <ImprovBadge improvement={v.rate - site.firstV.rate} />
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function HistorialSitiosReport() {
  const {
    filtered, paginated, kpis, orgs,
    filterOrg, filterMin, search, setFilter,
    currentPage, setCurrentPage, pageSize, totalFiltered,
    exportToExcel, isLoading, error,
  } = useHistorialSitiosReport()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Sitios Totales"    value={kpis.totalSites}  color="var(--accent)" />
        <KpiCard label="Multi-visita"      value={kpis.multiVisit}  color="#0284C7" sub="2+ visitas" />
        <KpiCard label="Visita única"      value={kpis.singleVisit} color="#64748b" />
        <KpiCard label="Mejoraron"         value={kpis.improved}    color="#16a34a" sub="mayor completitud" />
        <KpiCard label="Retrocedieron"     value={kpis.declined}    color="#dc2626" sub="menor completitud" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => setFilter('search', e.target.value)}
          placeholder="Buscar sitio…"
          className="flex-1 min-w-[160px] px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <select value={filterOrg} onChange={e => setFilter('org', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">Todas las orgs</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterMin} onChange={e => setFilter('min', parseInt(e.target.value))}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value={1}>Todas las visitas</option>
          <option value={2}>2+ visitas</option>
          <option value={3}>3+ visitas</option>
        </select>
        <button onClick={exportToExcel}
          className="ml-auto px-4 py-2 rounded-xl text-[13px] font-semibold text-white flex items-center gap-1.5"
          style={{ background: '#0284C7' }}>
          <Download size={13} /> Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[13px]" style={{ background: 'var(--bg-card)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
              <th className="px-4 py-3 w-8" />
              {['Sitio ID','Nombre','Org','Visitas','Última Completitud','Mejora V1→Last','Última visita'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold th-text-m uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((site, i) => <SiteRow key={site.siteId || i} site={site} />)}
            {!paginated.length && <tr><td colSpan={8} className="px-4 py-10 text-center th-text-m">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalItems={totalFiltered} pageSize={pageSize} onPageChange={setCurrentPage} />
    </div>
  )
}
