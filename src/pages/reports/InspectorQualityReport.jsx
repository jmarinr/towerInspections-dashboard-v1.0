import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'

const scoreColor = s => s >= 75 ? '#16a34a' : s >= 50 ? '#ca8a04' : '#dc2626'
const rateColor  = r => r >= 75 ? '#16a34a' : r >= 50 ? '#ca8a04' : '#dc2626'

function ScoreBar({ value, color }) {
  return (
    <div style={{ background: 'var(--bg-base)', borderRadius: 4, height: 6, width: '100%', overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
    </div>
  )
}
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl p-4 th-shadow" style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold th-text-p mt-0.5">{label}</div>
      {sub && <div className="text-[10px] th-text-m mt-0.5">{sub}</div>}
    </div>
  )
}

export default function InspectorQualityReport({ hook }) {
  const { filtered, kpis, orgs, filterOrg, setFilter, isLoading, error } = hook

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Score Promedio"     value={`${kpis.avg ?? 0}/100`}  color="var(--accent)" sub="calidad promedio equipo" />
        <KpiCard label="Tasa Cierre Prom."  value={`${kpis.avgClosure ?? 0}%`} color="#0284C7" sub="órdenes cerradas vs total" />
        <KpiCard label="Top Performer"      value={kpis.top?.name?.split(' ')[0] || '—'} color="#16a34a" sub={`Score ${kpis.top?.qualityScore ?? 0}`} />
        <KpiCard label="Requiere Atención"  value={kpis.bottom?.name?.split(' ')[0] || '—'} color="#dc2626" sub={`Score ${kpis.bottom?.qualityScore ?? 0}`} />
      </div>
      <div className="flex gap-3 items-center">
        <select value={filterOrg} onChange={e => setFilter('org', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value="">Todas las orgs</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.filter(i => i.orders > 0).map(ins => (
          <div key={ins.username || ins.name} className="rounded-2xl p-5 th-shadow"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${scoreColor(ins.qualityScore)}` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                style={{ background: `${scoreColor(ins.qualityScore)}22`, color: scoreColor(ins.qualityScore), border: `1px solid ${scoreColor(ins.qualityScore)}44` }}>
                {(ins.name || '?').split(/[\s@]/)[0].slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold th-text-p truncate">{ins.name}</div>
                <div className="text-[10px] th-text-m">ORG: {ins.orgCode}</div>
              </div>
              <div className="ml-auto text-[22px] font-bold flex-shrink-0" style={{ color: scoreColor(ins.qualityScore) }}>{ins.qualityScore}</div>
            </div>
            {[
              { label: 'Tasa de Cierre',    value: ins.closureRate,    sub: `${ins.closed}/${ins.orders} órdenes` },
              { label: 'Completitud Forms', value: ins.formRate,       sub: `${ins.finalizedForms}/${ins.totalForms} formularios` },
              { label: 'Órdenes Completas', value: ins.completionRate, sub: 'con los 6 forms requeridos' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] th-text-m">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] th-text-m">{sub}</span>
                    <span className="font-mono font-bold text-[13px]" style={{ color: rateColor(value) }}>{value}%</span>
                  </div>
                </div>
                <ScoreBar value={value} color={rateColor(value)} />
              </div>
            ))}
            {ins.avgDaysOpenVal !== null && (
              <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-light)' }}>
                <span className="text-[11px] th-text-m">Días prom. orden abierta</span>
                <span className="font-mono font-bold text-[13px]" style={{ color: ins.avgDaysOpenVal > 7 ? '#dc2626' : ins.avgDaysOpenVal > 3 ? '#ca8a04' : '#16a34a' }}>{ins.avgDaysOpenVal}d</span>
              </div>
            )}
            {ins.openOrders > 0 && (
              <div className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-center"
                style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fde047' }}>
                {ins.openOrders} orden{ins.openOrders !== 1 ? 'es' : ''} abierta{ins.openOrders !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
