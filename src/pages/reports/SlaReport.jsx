import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'
import Pagination from '../../components/ui/Pagination'
import ReportInfo from '../../components/ui/ReportInfo'

const SLA_COLORS = {
  closed: { label:'Cerrada',    bg:'#dcfce7', color:'#15803d', border:'#86efac' },
  ok:     { label:'OK',         bg:'#dbeafe', color:'#1d4ed8', border:'#93c5fd' },
  warn:   { label:'En espera',  bg:'#fef9c3', color:'#a16207', border:'#fde047' },
  alert:  { label:'Crítica',    bg:'#fee2e2', color:'#dc2626', border:'#fca5a5' },
}
function SlaStatusBadge({ status }) {
  const cfg = SLA_COLORS[status] || SLA_COLORS.ok
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
}
function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow" style={{ background:'var(--bg-card)', border:`1px solid var(--border)`, borderLeft:`3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value ?? '—'}</div>
      <div className="text-[11px] font-semibold th-text-p mt-0.5">{label}</div>
      {sub && <div className="text-[10px] th-text-m mt-0.5">{sub}</div>}
    </div>
  )
}
function fmtDur(min) {
  if (!min || min <= 0) return '—'
  const h = Math.floor(min/60), m = min%60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function SlaReport({ hook }) {
  const {
    visits: paginated, kpis, inspectors, durationBuckets,
    quarterOptions, selectedQuarter, setSelectedQuarter,
    filterInspector, filterStatus, setFilter,
    currentPage, setCurrentPage, pageSize, totalFiltered,
    isLoading, error, SLA_WARN_DAYS, SLA_ALERT_DAYS,
  } = hook

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Órdenes Abiertas" value={kpis.open}         color="#0284C7" sub="en el período" />
        <KpiCard label="Críticas (>7d)"   value={kpis.alert}        color="#dc2626" sub="requieren cierre urgente" />
        <KpiCard label="En Espera (3-7d)" value={kpis.warn}         color="#ca8a04" sub="monitorear" />
        <KpiCard label="Duración Prom."   value={fmtDur(kpis.avgClosedMin)} color="#16a34a" sub="órdenes cerradas" />
      </div>
      {kpis.maxOpen && (
      <ReportInfo
        title="SLA de Cierre"
        description="Monitorea el tiempo de vida de las órdenes abiertas y la distribución de duración de las cerradas. Permite identificar órdenes que llevan demasiado tiempo abiertas antes de que se conviertan en un problema operativo."
        howToUse={[
          "Filtra por 'Críticas' para ver solo las órdenes que llevan más de 7 días abiertas — requieren acción inmediata.",
          "Filtra por inspector para identificar quién tiene más órdenes envejecidas.",
          "El histograma de duración muestra la distribución de tiempos de cierre — útil para definir SLAs formales.",
          "Exporta a Excel para incluir en reportes semanales de operaciones.",
        ]}
        howToInterpret={[
          "OK (0-3 días): Orden reciente, dentro del ciclo normal de trabajo.",
          "En Espera (3-7 días): La orden lleva más de lo habitual. Verificar si hay bloqueos operativos.",
          "Crítica (>7 días): Requiere atención. El inspector puede necesitar apoyo o la orden puede tener problemas técnicos.",
          "La duración de órdenes cerradas con valor 0 corresponde a órdenes cerradas por el sistema antiguo (antes de v2.7.1) — no representan duración real.",
          "El promedio de duración solo considera órdenes cerradas con duración >0 para mayor precisión.",
        ]}
      />

      {kpis.maxOpen && (
        <div className="px-4 py-3 rounded-xl text-[12px]" style={{ background:'#fee2e2', border:'1px solid #fca5a5', color:'#dc2626' }}>
          <strong>⚠️ Orden más antigua:</strong> {kpis.maxOpen.order_number} — {kpis.maxOpen.ageDays} días abierta · Inspector: {kpis.maxOpen.inspector}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl p-5 th-shadow" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <h3 className="text-[13px] font-bold th-text-p mb-3">Distribución de Duración (Órdenes Cerradas)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={durationBuckets}>
              <XAxis dataKey="label" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} cursor={{ fill:'var(--bg-base)' }} />
              <Bar dataKey="count" name="Órdenes" radius={[4,4,0,0]}>
                {durationBuckets.map((b,i) => <Cell key={i} fill={b.label.includes('>')?'#dc2626':b.label.includes('3d')?'#ca8a04':'#0284C7'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl p-5 th-shadow flex flex-col gap-3" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <h3 className="text-[13px] font-bold th-text-p">Filtros</h3>
          {quarterOptions?.length > 0 && (
            <select value={selectedQuarter?.value || ''} onChange={e => setSelectedQuarter(quarterOptions.find(q => q.value === e.target.value))}
              className="px-3 py-2 rounded-xl text-[13px] border"
              style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
              {quarterOptions.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          )}
          <select value={filterInspector} onChange={e => setFilter('inspector', e.target.value)}
            className="px-3 py-2 rounded-xl text-[13px] border"
            style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
            <option value="">Todos los inspectores</option>
            {inspectors.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilter('status', e.target.value)}
            className="px-3 py-2 rounded-xl text-[13px] border"
            style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
            <option value="">Todos los estados</option>
            <option value="alert">Críticas (&gt;{SLA_ALERT_DAYS}d)</option>
            <option value="warn">En espera ({SLA_WARN_DAYS}-{SLA_ALERT_DAYS}d)</option>
            <option value="open">Abiertas</option>
            <option value="closed">Cerradas</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid var(--border)' }}>
        <table className="w-full text-[13px]" style={{ background:'var(--bg-card)' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-base)' }}>
              {['Orden','Sitio','Inspector','Iniciada','Cerrada','Duración / Edad','SLA'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold th-text-m uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((v,i) => (
              <tr key={v.id || i} style={{ borderTop:'1px solid var(--border-light)' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--row-hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                <td className="px-4 py-3 font-mono text-[12px] font-semibold th-text-p">{v.order_number || '—'}</td>
                <td className="px-4 py-3 th-text-m text-[12px]">{v.site_id} · {v.site_name}</td>
                <td className="px-4 py-3 th-text-m text-[12px]">{v.inspector}</td>
                <td className="px-4 py-3 th-text-m text-[12px]">{v.started_at ? new Date(v.started_at).toLocaleDateString('es',{day:'numeric',month:'short'}) : '—'}</td>
                <td className="px-4 py-3 th-text-m text-[12px]">{v.closed_at ? new Date(v.closed_at).toLocaleDateString('es',{day:'numeric',month:'short'}) : <span className="text-yellow-500 font-semibold">Abierta</span>}</td>
                <td className="px-4 py-3 font-mono font-bold text-[13px]" style={{ color:v.status==='closed'?'var(--text-secondary)':v.slaStatus==='alert'?'#dc2626':v.slaStatus==='warn'?'#ca8a04':'var(--text-secondary)' }}>
                  {v.status==='closed' ? fmtDur(v.durationMin) : v.ageDays !== null ? `${v.ageDays}d` : '—'}
                </td>
                <td className="px-4 py-3"><SlaStatusBadge status={v.slaStatus} /></td>
              </tr>
            ))}
            {!paginated.length && <tr><td colSpan={7} className="px-4 py-10 text-center th-text-m">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalItems={totalFiltered} pageSize={pageSize} onPageChange={setCurrentPage} />
    </div>
  )
}
