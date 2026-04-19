import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'
import ReportInfo from '../../components/ui/ReportInfo'

const FORM_COLORS = {
  'mantenimiento':'#0284C7','mantenimiento-ejecutado':'#0891b2','inventario-v2':'#7c3aed',
  'sistema-ascenso':'#16a34a','additional-photo-report':'#dc2626','puesta-tierra':'#d97706','inspeccion':'#64748b',
}
const rateColor = r => r >= 65 ? '#16a34a' : r >= 50 ? '#ca8a04' : '#dc2626'

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow" style={{ background:'var(--bg-card)', border:`1px solid var(--border)`, borderLeft:`3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold th-text-p mt-0.5">{label}</div>
      {sub && <div className="text-[10px] th-text-m mt-0.5">{sub}</div>}
    </div>
  )
}

export default function FormComplianceReport({ hook }) {
  const { byForm, filteredTrend, kpis, formCodes, filterForm, setFilterForm, isLoading, error, FORM_LABELS } = hook
  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />
  const activeCodes = filterForm ? [filterForm] : formCodes.filter(fc => fc !== 'inspeccion')
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Tasa Promedio"    value={`${kpis.avg ?? 0}%`}  color="var(--accent)" sub="completitud global" />
        <KpiCard label="Total Rows Forms" value={kpis.totalForms ?? 0} color="#0284C7" />
        <KpiCard label="Mejor Form"       value={`${kpis.best?.rate ?? 0}%`} color="#16a34a" sub={kpis.best?.label} />
        <KpiCard label="Peor Form"        value={`${kpis.worst?.rate ?? 0}%`} color="#dc2626" sub={kpis.worst?.label} />
      </div>
      <div className="rounded-2xl p-5 th-shadow" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <h3 className="text-[14px] font-bold th-text-p mb-4">Tasa de Completitud por Formulario</h3>
      <ReportInfo
        title="Cumplimiento de Formularios"
        description="Muestra la tasa de completitud (formularios finalizados / total de filas) para cada tipo de formulario, con tendencia mensual para detectar mejoras o retrocesos en el tiempo."
        howToUse={[
          "Identifica qué formularios tienen las tasas más bajas para enfocar capacitación en esas áreas.",
          "Usa el filtro de formulario en la tendencia mensual para ver la evolución de un formulario específico.",
          "Exporta a Excel para tener dos hojas: resumen por formulario y tendencia mensual.",
          "Compara los meses disponibles para ver si la tasa de completitud mejora conforme el equipo gana experiencia.",
        ]}
        howToInterpret={[
          "Verde (≥65%): Tasa aceptable — la mayoría de los formularios se completan correctamente.",
          "Amarillo (50-64%): Atención — casi la mitad de los formularios quedan sin finalizar.",
          "Rojo (<50%): Crítico — más de la mitad no se finalizan. Revisar si el formulario es difícil o si hay problemas de conectividad.",
          "Los porcentajes cuentan filas de submissions, no visitas únicas. Múltiples envíos de un mismo formulario incrementan el total.",
          "Fotos Adicionales históricamente tiene la tasa más baja porque suele llenarse al final y los inspectores pueden cerrar antes.",
        ]}
      />

        <div className="space-y-4">
          {[...byForm].sort((a,b) => b.rate - a.rate).map(f => (
            <div key={f.code}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-[13px] font-semibold th-text-p">{f.label}</span>
                  <span className="ml-2 text-[11px] th-text-m">({f.finalized}/{f.total} rows)</span>
                </div>
                <span className="font-mono font-bold text-[14px]" style={{ color: rateColor(f.rate) }}>{f.rate}%</span>
              </div>
              <div style={{ background:'var(--bg-base)', borderRadius:6, height:10, overflow:'hidden' }}>
                <div style={{ width:`${f.rate}%`, height:'100%', background:rateColor(f.rate), borderRadius:6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {filteredTrend.length >= 2 && (
        <div className="rounded-2xl p-5 th-shadow" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-[14px] font-bold th-text-p">Tendencia Mensual</h3>
            <select value={filterForm} onChange={e => setFilterForm(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-[12px] border"
              style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
              <option value="">Todos los formularios</option>
              {formCodes.filter(fc => fc !== 'inspeccion').map(fc => <option key={fc} value={fc}>{FORM_LABELS[fc] || fc}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={filteredTrend}>
              <XAxis dataKey="month" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} formatter={(v, name) => [`${v ?? '—'}%`, FORM_LABELS[name] || name]} />
              <Legend formatter={name => FORM_LABELS[name] || name} wrapperStyle={{ fontSize:11 }} />
              {activeCodes.map(fc => <Line key={fc} type="monotone" dataKey={fc} stroke={FORM_COLORS[fc] || '#94a3b8'} strokeWidth={2} dot={{ r:4 }} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[11px] th-text-m mt-2">Nota: Las tasas reflejan filas de submissions (pueden incluir duplicados de re-envíos).</p>
        </div>
      )}
    </div>
  )
}
