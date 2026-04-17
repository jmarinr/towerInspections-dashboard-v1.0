/**
 * EquipmentInventoryReport.jsx  v3
 * Filtro cuatrimestre (primero) + columna Visita con link
 */

import { Link } from 'react-router-dom'
import { Package, LayoutList, Radio, Users, ExternalLink } from 'lucide-react'
import Badge      from '../../components/ui/Badge'
import Card       from '../../components/ui/Card'
import Select     from '../../components/ui/Select'
import Spinner    from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'

const TYPE_TONE    = { 'Panel': 'teal', 'MW': 'purple', 'Microondas': 'purple', 'Omnidireccional': 'emerald' }
const CARRIER_TONE = { 'Movistar': 'teal', 'Claro': 'danger', 'Entel': 'warning', 'WOM': 'purple', 'Compartido': 'neutral' }
const typeTone    = v => TYPE_TONE[v]    || 'neutral'
const carrierTone = v => CARRIER_TONE[v] || 'neutral'

const Dash = () => <span style={{ color: 'var(--text-muted)' }}>—</span>
const cell = v => (v == null || v === '') ? <Dash /> : v

function StatCard({ icon: Icon, label, value, primary = false }) {
  return (
    <div className="rounded-2xl p-5 border th-shadow flex flex-col gap-3 transition-colors"
      style={{ background: primary ? 'var(--stat-accent-bg)' : 'var(--bg-card)', borderColor: primary ? 'transparent' : 'var(--border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: primary ? 'rgba(255,255,255,0.15)' : 'var(--accent-light)' }}>
        <Icon size={16} strokeWidth={1.8}
          style={{ color: primary ? 'var(--stat-accent-text)' : 'var(--accent)' }} />
      </div>
      <div>
        <div className="text-[28px] font-bold leading-none tabular-nums"
          style={{ color: primary ? 'var(--stat-accent-text)' : 'var(--text-primary)' }}>{value}</div>
        <div className="text-[12px] font-medium mt-1"
          style={{ color: primary ? 'rgba(255,255,255,0.55)' : 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function EquipmentInventoryReport({ hookData }) {
  const {
    paginatedItems,
    totalEquipment, totalTowers, antennaTypes, activeCarriers,
    quarterOptions, selectedQuarter, setSelectedQuarter,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    isLoading, error,
  } = hookData

  const from = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, totalFiltered)

  if (isLoading) return <div className="flex items-center justify-center py-24"><Spinner size={16} /></div>
  if (error) return (
    <div className="rounded-2xl border px-6 py-8 text-center th-bg-card" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[13px] th-text-m">Error: {error}</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Package}    label="Total Equipos"    value={totalEquipment} primary />
        <StatCard icon={LayoutList} label="Torres"           value={totalTowers} />
        <StatCard icon={Radio}      label="Tipos de Antena"  value={antennaTypes} />
        <StatCard icon={Users}      label="Carriers Activos" value={activeCarriers} />
      </div>

      {/* Filtros — cuatrimestre primero */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-center">
          {/* Cuatrimestre */}
          <div className="flex-1 min-w-[150px]">
            <Select
              value={selectedQuarter?.value || ''}
              onChange={e => {
                const opt = quarterOptions.find(o => o.value === e.target.value)
                if (opt) setSelectedQuarter(opt)
              }}>
              {quarterOptions.length === 0
                ? <option value="">Sin datos</option>
                : quarterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
              }
            </Select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <Select value={filters.site} onChange={e => setFilter('site', e.target.value)}>
              <option value="">Todos los Sitios</option>
              {filterOptions.sites.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <Select value={filters.carrier} onChange={e => setFilter('carrier', e.target.value)}>
              <option value="">Todos los Carriers</option>
              {filterOptions.carriers.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <Select value={filters.type} onChange={e => setFilter('type', e.target.value)}>
              <option value="">Todos los Tipos</option>
              {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <Select value={filters.height} onChange={e => setFilter('height', e.target.value)}>
              <option value="">Todas las Alturas</option>
              {filterOptions.heights.map(h => <option key={h} value={h}>{h} m</option>)}
            </Select>
          </div>
          <div className="whitespace-nowrap text-[12px] th-text-m font-medium px-1 flex-shrink-0">
            Mostrando <span className="font-bold th-text-p mx-1">
              {totalFiltered === 0 ? 0 : `${from}–${to}`}
            </span> de <span className="font-bold th-text-p mx-1">{totalFiltered}</span> equipos
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto">
          {paginatedItems.length === 0 ? (
            <EmptyState icon={LayoutList} title="Sin equipos"
              description="No hay equipos que coincidan con los filtros seleccionados." />
          ) : (
            <table className="w-full border-collapse text-[12px]" style={{ minWidth: 1020 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                  {[
                    ['ID Sitio','left'], ['Visita','left'], ['Altura','left'],
                    ['Orient. (Cara)','left'], ['Orient. (°)','center'],
                    ['Tipo Antena','left'], ['Cant.','center'],
                    ['Alto','center'], ['Diám.','center'], ['Ancho','center'],
                    ['Prof.','center'], ['Área M²','center'],
                    ['Carrier','left'], ['Comentarios','left'],
                  ].map(([h, align]) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: align }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    {/* ID Sitio */}
                    <td className="px-4 py-3 font-mono font-semibold text-[12px] whitespace-nowrap"
                      style={{ color: 'var(--accent)' }}>
                      {item.idSitio || '—'}
                    </td>

                    {/* Visita — link a /orders/:orderId */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.orderId ? (
                        <Link to={`/orders/${item.orderId}`}
                          className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline"
                          style={{ color: 'var(--accent)' }}>
                          {item.orderLabel || item.orderId.slice(0, 8)}
                          <ExternalLink size={10} strokeWidth={2} />
                        </Link>
                      ) : <Dash />}
                    </td>

                    <td className="px-4 py-3 font-mono text-[12px] th-text-p whitespace-nowrap">
                      {item.alturaMts != null ? `${item.alturaMts} m` : <Dash />}
                    </td>
                    <td className="px-4 py-3 th-text-p whitespace-nowrap">{cell(item.orientacionCara)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-center th-text-p whitespace-nowrap">
                      {item.orientacionGrados != null ? item.orientacionGrados : <Dash />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.tipoEquipo ? <Badge tone={typeTone(item.tipoEquipo)}>{item.tipoEquipo}</Badge> : <Dash />}
                    </td>
                    <td className="px-4 py-3 font-mono text-center th-text-p">{cell(item.cantidad)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-center th-text-p">{cell(item.alto)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-center th-text-p">{cell(item.diametro)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-center th-text-p">{cell(item.ancho)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-center th-text-p">{cell(item.profundidad)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-center font-semibold"
                      style={{ color: item.area != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {item.area != null ? item.area : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.carrier ? <Badge tone={carrierTone(item.carrier)}>{item.carrier}</Badge> : <Dash />}
                    </td>
                    <td className="px-4 py-3 th-text-m text-[11px] max-w-[200px]"
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {item.comentario != null && item.comentario !== '' ? item.comentario : <Dash />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
