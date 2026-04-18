import { Download } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import useMonthlyTrendReport from '../../hooks/useMonthlyTrendReport'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'

const INSP_COLORS = ['#0284C7','#7c3aed','#16a34a','#d97706']

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow" style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value ?? '—'}</div>
      <div className="text-[11px] font-semibold th-text-p mt-0.5">{label}</div>
      {sub && <div className="text-[10px] th-text-m mt-0.5">{sub}</div>}
    </div>
  )
}

export default function MonthlyTrendReport() {
  const {
    monthly, inspectorMonthly, inspectorKeys, kpis, orgs,
    filterOrg, setFilter,
    exportToExcel, isLoading, error,
  } = useMonthlyTrendReport()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  const growthColor = kpis.growth > 0 ? '#16a34a' : kpis.growth < 0 ? '#dc2626' : '#64748b'

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Órdenes" value={kpis.totalOrders} color="var(--accent)" sub="todos los meses" />
        <KpiCard label="Cerradas Total" value={kpis.totalClosed} color="#16a34a" />
        <KpiCard label="Mes Pico"      value={kpis.peakMonth?.label} color="#0284C7" sub={`${kpis.peakMonth?.orders} órdenes`} />
        <KpiCard label="Crecimiento"   value={kpis.growth !== null ? `${kpis.growth > 0 ? '+' : ''}${kpis.growth}%` : '—'} color={growthColor} sub="último vs anterior" />
      </div>

      {/* Filtro org */}
      <div className="flex gap-3 items-center">
        <select value={filterOrg} onChange={e => setFilter('org', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">Todas las organizaciones</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button onClick={exportToExcel}
          className="ml-auto px-4 py-2 rounded-xl text-[13px] font-semibold text-white flex items-center gap-1.5"
          style={{ background: '#0284C7' }}>
          <Download size={13} /> Excel
        </button>
      </div>

      {/* Órdenes por mes — barras */}
      <div className="rounded-2xl p-5 th-shadow" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-[13px] font-bold th-text-p mb-4">Órdenes por Mes — Total vs Cerradas</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} barGap={4}>
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'var(--bg-base)' }} />
            <Bar dataKey="orders" name="Total"    fill="#1e3a5f" radius={[4,4,0,0]} />
            <Bar dataKey="closed" name="Cerradas" fill="#0284C7" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tasa de cierre y completitud forms */}
      <div className="rounded-2xl p-5 th-shadow" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-[13px] font-bold th-text-p mb-4">Tasas Mensuales — Cierre de Órdenes vs Completitud Forms</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthly}>
            <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0,100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="closureRate" name="Tasa Cierre" stroke="#0284C7" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="formRate"    name="Completitud Forms" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Inspectores por mes */}
      {inspectorKeys.length > 0 && inspectorMonthly.length >= 1 && (
        <div className="rounded-2xl p-5 th-shadow" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h3 className="text-[13px] font-bold th-text-p mb-4">Órdenes por Inspector por Mes (Top 4)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={inspectorMonthly} barGap={4}>
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'var(--bg-base)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {inspectorKeys.map((k, i) => (
                <Bar key={k} dataKey={k} name={k} fill={INSP_COLORS[i % INSP_COLORS.length]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla resumen */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-[13px]" style={{ background: 'var(--bg-card)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
              {['Mes','Órdenes','Cerradas','Tasa Cierre','Forms Total','Completitud','Inspectores'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold th-text-m uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthly.map((m, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td className="px-4 py-3 font-semibold th-text-p">{m.label}</td>
                <td className="px-4 py-3 font-mono">{m.orders}</td>
                <td className="px-4 py-3 font-mono">{m.closed}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: m.closureRate >= 60 ? '#16a34a' : m.closureRate >= 40 ? '#ca8a04' : '#dc2626' }}>{m.closureRate}%</td>
                <td className="px-4 py-3 font-mono">{m.totalForms || 0}</td>
                <td className="px-4 py-3 font-mono font-bold" style={{ color: m.formRate >= 65 ? '#16a34a' : m.formRate >= 50 ? '#ca8a04' : '#dc2626' }}>{m.formRate}%</td>
                <td className="px-4 py-3 font-mono">{m.inspectorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {monthly.length < 3 && (
        <p className="text-[11px] th-text-m px-1">Nota: Con {monthly.length} meses de datos la tendencia es indicativa. Los gráficos serán más representativos con 3+ meses de historial.</p>
      )}
    </div>
  )
}
