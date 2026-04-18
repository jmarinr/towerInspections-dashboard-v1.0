import { Download } from 'lucide-react'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import useGeoMapReport from '../../hooks/useGeoMapReport'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow" style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold th-text-p mt-0.5">{label}</div>
      {sub && <div className="text-[10px] th-text-m mt-0.5">{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-xl p-3 text-[12px] shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: 220 }}>
      <div className="font-bold th-text-p mb-1">{d.siteId}</div>
      <div className="th-text-m">{d.siteName}</div>
      <div className="th-text-m mt-1">Inspector: {d.inspector}</div>
      <div className="th-text-m">Fecha: {d.dateLabel}</div>
      <div className="mt-1">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: d.status === 'closed' ? '#dcfce7' : '#dbeafe', color: d.status === 'closed' ? '#15803d' : '#1d4ed8' }}>
          {d.status}
        </span>
      </div>
    </div>
  )
}

export default function GeoMapReport() {
  const {
    scatterData, filtered, kpis, orgs, inspectors,
    filterOrg, filterStatus, filterInspector, setFilter,
    totalFiltered, exportToExcel,
    getColor, ORG_COLORS,
    isLoading, error,
  } = useGeoMapReport()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Con GPS"        value={kpis.total}  color="var(--accent)" sub="de 89 órdenes totales" />
        <KpiCard label="Cerradas"       value={kpis.closed} color="#16a34a" />
        <KpiCard label="Abiertas"       value={kpis.open}   color="#fbbf24" />
        <KpiCard label="Organizaciones" value={kpis.orgs}   color="#818cf8" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
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
          <option value="closed">Cerradas</option>
          <option value="open">Abiertas</option>
        </select>
        <select value={filterInspector} onChange={e => setFilter('inspector', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">Todos los inspectores</option>
          {inspectors.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <span className="text-[12px] th-text-m ml-auto">{totalFiltered} puntos visibles</span>
        <button onClick={exportToExcel}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white flex items-center gap-1.5"
          style={{ background: '#0284C7' }}>
          <Download size={13} /> Excel
        </button>
      </div>

      {/* Scatter plot */}
      <div className="rounded-2xl p-5 th-shadow" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-[13px] font-bold th-text-p">Dispersión Geográfica — Panamá</h3>
            <p className="text-[11px] th-text-m mt-0.5">Eje X: Longitud (oeste→este) · Eje Y: Latitud (sur→norte) · Puntos = sitios inspeccionados</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <XAxis type="number" dataKey="x" domain={[-86, -79]} name="Longitud"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}°`} />
            <YAxis type="number" dataKey="y" domain={[7.5, 11]} name="Latitud"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${v}°`} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={scatterData} name="Sitios">
              {scatterData.map((d, i) => (
                <Cell key={i} fill={getColor(d.orgCode, d.status)} opacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mt-2">
          {Object.entries(ORG_COLORS).map(([org, color]) => (
            <div key={org} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-[11px] th-text-m">{org} (cerradas)</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-[11px] th-text-m">Abiertas</span>
          </div>
        </div>
      </div>

      {/* Nota */}
      <div className="text-[11px] th-text-m px-1">
        Nota: Este scatter plot usa coordenadas GPS reales pero no es un mapa cartográfico. Los puntos representan la posición relativa de cada sitio inspeccionado en Panamá. Para un mapa interactivo completo, los datos incluyen lat/lng exportables.
      </div>
    </div>
  )
}
