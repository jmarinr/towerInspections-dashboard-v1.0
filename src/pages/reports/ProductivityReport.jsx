/**
 * ProductivityReport.jsx
 * Reporte de Productividad por Orden.
 * Filas expandibles con detalle de formularios, semáforo referencial,
 * benchmarks históricos con tooltip, duración total de orden.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock, ChevronRight, ExternalLink, Info, LayoutList,
  BarChart2, Activity, Zap, Award,
} from 'lucide-react'
import Badge      from '../../components/ui/Badge'
import Card       from '../../components/ui/Card'
import Select     from '../../components/ui/Select'
import Spinner    from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import { SEMAFORO_THRESHOLDS, MIN_BENCHMARK_SAMPLES } from '../../hooks/useProductivityReport'

// ── KPI Cards ─────────────────────────────────────────────────────────────────
function KpiPrimary({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl p-5 border th-shadow flex flex-col gap-3"
      style={{ background: 'var(--stat-accent-bg)', borderColor: 'transparent' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.15)' }}>
        <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--stat-accent-text)' }} />
      </div>
      <div>
        <div className="text-[26px] font-bold leading-none tabular-nums"
          style={{ color: 'var(--stat-accent-text)' }}>{value}</div>
        <div className="text-[11px] font-medium mt-0.5"
          style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</div>
        {sub && <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function KpiAccent({ icon: Icon, label, value, sub, borderColor, valueColor, compact = false }) {
  return (
    <div className="rounded-2xl p-4 th-shadow flex items-center gap-3 border-l-4"
      style={{ background: 'var(--bg-card)', borderColor, borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
      <Icon size={17} strokeWidth={1.8} style={{ color: borderColor, flexShrink: 0 }} />
      <div className="min-w-0 flex-1">
        <div className={`font-bold leading-tight ${compact ? 'text-[14px] line-clamp-2' : 'text-[20px] leading-none tabular-nums'}`}
          style={{ color: valueColor }}>{value}</div>
        <div className="text-[11px] font-medium mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        {sub && <div className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Inspector avatar chip ──────────────────────────────────────────────────────
function InspectorChip({ inspector, highlight = false }) {
  if (!inspector) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
        style={{ background: highlight ? '#6366f1' : '#0284C7' }}>
        {inspector.initials}
      </div>
      <span className="text-[12px] th-text-p truncate">{inspector.name}</span>
    </div>
  )
}

// ── Semáforo pill ──────────────────────────────────────────────────────────────
const SEMAFORO_STYLES = {
  green:  { label: 'Normal',   bg: '#f0fdf4', color: '#166534', dot: '#22c55e' },
  yellow: { label: 'Moderado', bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
  red:    { label: 'Lento',    bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
}

function SemaforoPill({ value }) {
  if (!value) return <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
  const s = SEMAFORO_STYLES[value] || SEMAFORO_STYLES.green
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ── Ref. histórico con tooltip ─────────────────────────────────────────────────
function BenchmarkCell({ benchmark, benchmarkStr }) {
  const [show, setShow] = useState(false)
  if (!benchmark) return <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
  const insufficient = benchmark.sampleCount < MIN_BENCHMARK_SAMPLES
  return (
    <span className="relative inline-flex items-center gap-1"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
        {insufficient ? '—' : benchmarkStr}
      </span>
      <Info size={11} strokeWidth={1.8} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
      {show && (
        <span className="absolute bottom-full left-1/2 mb-1.5 z-20 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug pointer-events-none whitespace-nowrap"
          style={{ transform: 'translateX(-50%)', background: 'var(--ink, #0F1F33)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {insufficient
            ? `Solo ${benchmark.sampleCount} muestra(s) — necesita al menos ${MIN_BENCHMARK_SAMPLES}`
            : `Promedio de ${benchmark.sampleCount} registros históricos — solo orientativo`}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid var(--ink, #0F1F33)' }} />
        </span>
      )}
    </span>
  )
}

// ── Fila de detalle expandible ─────────────────────────────────────────────────
function DetailRow({ order }) {
  return (
    <tr>
      <td colSpan={8} style={{ background: 'var(--bg-base)', padding: '0 0 12px 0' }}>
        <div className="mx-4 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {order.forms.length === 0 ? (
            <div className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Sin formularios registrados para esta visita.
            </div>
          ) : (
            <table className="w-full text-[11px]" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Formulario', 'Inspector', 'Inicio', 'Fin', 'Duración', 'Ref. histórico', 'Semáforo']
                    .map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.forms.map((f, i) => (
                  <tr key={f.submissionId || i}
                    style={{ borderBottom: i < order.forms.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <td className="px-3 py-2.5">
                      <Badge tone="neutral">{f.formLabel}</Badge>
                    </td>
                    <td className="px-3 py-2.5"><InspectorChip inspector={f.inspector} /></td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap"
                      title={f.isApproximate ? 'Tiempo aproximado — timestamp exacto no disponible' : ''}
                      style={{ color: f.isApproximate ? 'var(--text-muted)' : 'var(--text-secondary)', fontStyle: f.isApproximate ? 'italic' : 'normal' }}>
                      {f.startTime || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap"
                      title={f.isApproximate ? 'Tiempo aproximado — timestamp exacto no disponible' : ''}
                      style={{ color: f.isApproximate ? 'var(--text-muted)' : 'var(--text-secondary)', fontStyle: f.isApproximate ? 'italic' : 'normal' }}>
                      {f.endTime || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>
                      {f.durationStr}
                    </td>
                    <td className="px-3 py-2.5">
                      <BenchmarkCell benchmark={f.benchmark} benchmarkStr={f.benchmarkStr} />
                    </td>
                    <td className="px-3 py-2.5">
                      <SemaforoPill value={f.semaforo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Notas al pie — siempre visibles */}
          <div className="px-4 py-2.5 space-y-1" style={{ borderTop: '1px solid var(--border-light)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              ⚠ La duración total de la orden (tiempo en campo) y la suma de formularios son métricas distintas.
              Pueden diferir por ejecución en paralelo o tiempos entre formularios.
            </p>
          </div>
        </div>
      </td>
    </tr>
  )
}

const Dash = () => <span style={{ color: 'var(--text-muted)' }}>—</span>

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProductivityReport({ hookData }) {
  const {
    paginatedOrders,
    totalOrders, avgOrderDuration, avgFormDuration, slowestFormType, topInspector,
    quarterOptions, selectedQuarter, setSelectedQuarter,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    isLoading, error,
  } = hookData

  const [expandedIds, setExpandedIds] = useState(new Set())
  const toggleExpand = (id) => setExpandedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const from = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, totalFiltered)

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner size={16} /></div>
  if (error) return (
    <div className="rounded-2xl border px-6 py-8 text-center" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[13px] th-text-m">Error: {error}</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* KPIs — 5 tarjetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiPrimary  icon={BarChart2} label="Órdenes Cerradas"   value={totalOrders}                sub="período activo" />
        <KpiAccent   icon={Clock}     label="Promedio por Orden"  value={avgOrderDuration}           sub="tiempo en campo"  borderColor="#0d9488" valueColor="#0f766e" />
        <KpiAccent   icon={Activity}  label="Promedio por Form."  value={avgFormDuration}            sub="todos los tipos"  borderColor="#6366f1" valueColor="#4338ca" />
        <KpiAccent   icon={Zap}       label="Form. más lento"     value={slowestFormType.label}      sub={slowestFormType.avgStr} borderColor="#f59e0b" valueColor="#b45309" compact />
        <KpiAccent   icon={Award}     label="Más órdenes"         value={topInspector.name}          sub={`${topInspector.orderCount} órdenes`} borderColor="#10b981" valueColor="#065f46" compact />
      </div>

      {/* Filtros */}
      <ReportInfo
        title="Productivity Report"
        description="Analiza el tiempo que tarda cada inspector en completar las órdenes y formularios individuales. Incluye benchmarks históricos y semáforos para identificar formularios que toman más tiempo de lo normal."
        howToUse={[
          "Filtra por inspector para analizar el tiempo de trabajo de una persona específica.",
          "Expande una orden (clic en la fila) para ver el tiempo por formulario individual.",
          "Los semáforos comparan cada formulario contra el promedio histórico del mismo tipo.",
          "Las órdenes 'En curso' no tienen duración total — se calculará cuando se cierren.",
          "Exporta a Excel para análisis detallado con todos los timestamps de inicio y fin.",
        ]}
        howToInterpret={[
          "Verde: El formulario se completó en tiempo normal (dentro del promedio histórico).",
          "Amarillo: +20% sobre el promedio. Puede ser normal en sitios complejos.",
          "Rojo: +50% sobre el promedio. Revisar si hubo dificultades técnicas o de conectividad.",
          "— (guión): No hay suficientes muestras históricas para establecer un benchmark (mínimo 3).",
          "Los tiempos con prefijo ~ son aproximados porque el formulario fue enviado antes de activar el registro de timestamps (órdenes antiguas).",
          "La duración de la orden NO es la suma de formularios — los inspectores pueden trabajar en paralelo.",
        ]}
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
          <div className="flex-1 min-w-[150px]">
            <Select value={selectedQuarter?.value || ''}
              onChange={e => {
                const opt = quarterOptions.find(o => o.value === e.target.value)
                if (opt) setSelectedQuarter(opt)
              }}>
              {quarterOptions.length === 0
                ? <option value="">Sin datos</option>
                : quarterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.inspector} onChange={e => setFilter('inspector', e.target.value)}>
              <option value="">Todos los Inspectores</option>
              {filterOptions.inspectors.map(i => <option key={i} value={i}>{i}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <Select value={filters.site} onChange={e => setFilter('site', e.target.value)}>
              <option value="">Todos los Sitios</option>
              {filterOptions.sites.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <Select value={filters.formType} onChange={e => setFilter('formType', e.target.value)}>
              <option value="">Todos los Formularios</option>
              {filterOptions.formTypes.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div className="whitespace-nowrap text-[12px] th-text-m font-medium px-1 flex-shrink-0">
            Mostrando <span className="font-bold th-text-p mx-1">
              {totalFiltered === 0 ? 0 : `${from}–${to}`}
            </span> de <span className="font-bold th-text-p mx-1">{totalFiltered}</span> órdenes
          </div>
        </div>
      </Card>

      {/* Banner referencial */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg"
        style={{ background: 'rgba(99,102,241,0.07)', border: '0.5px solid rgba(99,102,241,0.2)' }}>
        <Info size={13} strokeWidth={1.8} style={{ color: '#6366f1', flexShrink: 0 }} />
        <p className="text-[11px]" style={{ color: '#6366f1' }}>
          Los tiempos referenciales del semáforo se calculan sobre el promedio histórico del sistema
          y son <strong>solo orientativos</strong>. No representan un estándar oficial.
          Mínimo {MIN_BENCHMARK_SAMPLES} muestras para mostrar semáforo.
        </p>
      </div>

      {/* Tabla principal */}
      <Card>
        <div className="overflow-x-auto">
          {paginatedOrders.length === 0 ? (
            <EmptyState icon={LayoutList} title="Sin órdenes"
              description="No hay órdenes que coincidan con los filtros seleccionados." />
          ) : (
            <table className="w-full border-collapse text-[12px]" style={{ minWidth: 780 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                  <th className="w-8" />
                  {[
                    ['Orden','left'], ['Sitio','left'], ['Inspector','left'],
                    ['Fecha','left'], ['Duración Total','right'], ['# Forms','center'],
                  ].map(([h, align]) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)', textAlign: align, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(order => {
                  const expanded = expandedIds.has(order.orderId)
                  return (
                    <>
                      <tr key={order.orderId}
                        style={{ borderBottom: expanded ? 'none' : '1px solid var(--border-light)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => toggleExpand(order.orderId)}>

                        {/* Expand toggle */}
                        <td className="pl-4 py-3 w-8">
                          <ChevronRight size={14} strokeWidth={2}
                            style={{
                              color: 'var(--text-muted)',
                              transform: expanded ? 'rotate(90deg)' : 'none',
                              transition: 'transform .15s',
                            }} />
                        </td>

                        {/* Orden */}
                        <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <Link to={`/orders/${order.orderId}`}
                            className="inline-flex items-center gap-1 font-mono font-semibold text-[12px] hover:underline"
                            style={{ color: 'var(--accent)' }}>
                            {order.orderNumber || order.orderId.slice(0, 8)}
                            <ExternalLink size={10} strokeWidth={2} />
                          </Link>
                        </td>

                        {/* Sitio */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]"
                          style={{ color: 'var(--text-secondary)' }}>
                          {order.idSitio || '—'}
                        </td>

                        {/* Inspector */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <InspectorChip inspector={order.inspector} />
                        </td>

                        {/* Fecha */}
                        <td className="px-4 py-3 whitespace-nowrap text-[11px]"
                          style={{ color: 'var(--text-secondary)' }}>
                          {order.date || '—'}
                        </td>

                        {/* Duración total */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {order.isInProgress ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: '#fffbeb', color: '#92400e' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              En curso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold th-text-p">
                              <Clock size={11} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                              {order.orderDurationStr}
                            </span>
                          )}
                        </td>

                        {/* # Forms */}
                        <td className="px-4 py-3 text-center font-mono font-semibold text-[12px] th-text-p">
                          {order.formCount}
                        </td>
                      </tr>

                      {/* Detalle expandible */}
                      {expanded && <DetailRow key={`${order.orderId}-detail`} order={order} />}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalFiltered > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-2 text-[12px] th-text-m">
              <span>Filas por página:</span>
              {[10, 25, 50].map(size => (
                <button key={size} onClick={() => setPageSize(size)}
                  className="h-7 px-2.5 rounded-lg text-[12px] font-semibold border transition-colors"
                  style={{
                    background:  pageSize === size ? 'var(--accent)' : 'var(--bg-card)',
                    color:       pageSize === size ? '#fff' : 'var(--text-secondary)',
                    borderColor: pageSize === size ? 'var(--accent)' : 'var(--border)',
                  }}>
                  {size}
                </button>
              ))}
            </div>
            <Pagination currentPage={currentPage} totalItems={totalFiltered}
              pageSize={pageSize} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
