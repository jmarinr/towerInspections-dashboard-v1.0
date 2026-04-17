/**
 * EquipmentInventoryReport.jsx
 *
 * Reporte General de Inventario de Equipos.
 * Componente puramente visual — toda la lógica vive en useEquipmentInventoryReport.
 */

import { Download, Package, Tower, Radio, Users, LayoutList } from 'lucide-react'
import useEquipmentInventoryReport from '../../hooks/useEquipmentInventoryReport'
import Badge    from '../../components/ui/Badge'
import Card     from '../../components/ui/Card'
import Select   from '../../components/ui/Select'
import Spinner  from '../../components/ui/Spinner'
import Pagination  from '../../components/ui/Pagination'
import EmptyState  from '../../components/ui/EmptyState'

// ── Badge mappings ────────────────────────────────────────────────────────────
const TYPE_TONE = {
  'Panel':              'teal',
  'Microondas':         'purple',
  'Omnidireccional':    'emerald',
}
const CARRIER_TONE = {
  'Movistar':   'teal',
  'Claro':      'danger',
  'Entel':      'warning',
  'WOM':        'purple',
  'Compartido': 'neutral',
}
function typeTone(v)    { return TYPE_TONE[v]    || 'neutral' }
function carrierTone(v) { return CARRIER_TONE[v] || 'neutral' }

// ── Helpers ───────────────────────────────────────────────────────────────────
const dash = v => (v == null || v === '') ? '—' : v
const num  = v => (v == null || v === '') ? '—' : v

// ── StatCard — mismo patrón que Dashboard.jsx ─────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, primary = false }) {
  return (
    <div className="rounded-2xl p-5 border th-shadow flex flex-col gap-3 transition-colors"
      style={{
        background:  primary ? 'var(--stat-accent-bg)' : 'var(--bg-card)',
        borderColor: primary ? 'transparent' : 'var(--border)',
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

// ── Main component ────────────────────────────────────────────────────────────
export default function EquipmentInventoryReport() {
  const {
    paginatedItems,
    totalEquipment, totalTowers, antennaTypes, activeCarriers,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    exportToExcel,
    isLoading, error,
  } = useEquipmentInventoryReport()

  const from = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, totalFiltered)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={16} />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border px-6 py-8 text-center th-bg-card"
        style={{ borderColor: 'var(--border)' }}>
        <p className="text-[13px] th-text-m">Error al cargar los datos: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Package}    label="Total Equipos"    value={totalEquipment} primary />
        <StatCard icon={LayoutList} label="Torres"           value={totalTowers} />
        <StatCard icon={Radio}      label="Tipos de Antena"  value={antennaTypes} />
        <StatCard icon={Users}      label="Carriers Activos" value={activeCarriers} />
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.site} onChange={e => setFilter('site', e.target.value)}>
              <option value="">Todos los Sitios</option>
              {filterOptions.sites.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.carrier} onChange={e => setFilter('carrier', e.target.value)}>
              <option value="">Todos los Carriers</option>
              {filterOptions.carriers.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.type} onChange={e => setFilter('type', e.target.value)}>
              <option value="">Todos los Tipos</option>
              {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filters.height} onChange={e => setFilter('height', e.target.value)}>
              <option value="">Todas las Alturas</option>
              {filterOptions.heights.map(h => <option key={h} value={h}>{h} m</option>)}
            </Select>
          </div>
          <div className="flex items-center whitespace-nowrap text-[12px] th-text-m font-medium px-1">
            Mostrando <span className="font-bold th-text-p mx-1">{totalFiltered === 0 ? 0 : `${from}–${to}`}</span> de <span className="font-bold th-text-p mx-1">{totalFiltered}</span> equipos
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto">
          {paginatedItems.length === 0 ? (
            <EmptyState
              icon={LayoutList}
              title="Sin equipos"
              description="No hay equipos que coincidan con los filtros seleccionados."
            />
          ) : (
            <table className="w-full border-collapse text-[12px]" style={{ minWidth: 820 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                  {[
                    'ID Sitio', 'Altura', 'Orient. (Cara)', 'Orient. (°)',
                    'Tipo Antena', 'Cant.', 'Alto', 'Ancho', 'Diámetro',
                    'Carrier', 'Comentarios',
                  ].map(h => (
                    <th key={h}
                      className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, idx) => (
                  <tr key={idx}
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    {/* ID Sitio */}
                    <td className="px-4 py-3 font-mono font-semibold text-[12px]"
                      style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                      {dash(item.idSitio)}
                    </td>

                    {/* Altura */}
                    <td className="px-4 py-3 font-mono text-[12px] th-text-p whitespace-nowrap">
                      {item.alturaMts != null ? `${item.alturaMts} m` : <Dash />}
                    </td>

                    {/* Orient. cara */}
                    <td className="px-4 py-3 th-text-p whitespace-nowrap">{dash(item.orientacion)}</td>

                    {/* Orient. grados */}
                    <td className="px-4 py-3 font-mono text-[12px] th-text-p whitespace-nowrap">
                      {item.orientacionGrados != null ? `${item.orientacionGrados}°` : <Dash />}
                    </td>

                    {/* Tipo antena */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.tipoEquipo
                        ? <Badge tone={typeTone(item.tipoEquipo)}>{item.tipoEquipo}</Badge>
                        : <Dash />}
                    </td>

                    {/* Cantidad */}
                    <td className="px-4 py-3 font-mono text-center th-text-p">{num(item.cantidad)}</td>

                    {/* Alto */}
                    <td className="px-4 py-3 font-mono text-[12px] th-text-p">{num(item.alto)}</td>

                    {/* Ancho */}
                    <td className="px-4 py-3 font-mono text-[12px] th-text-p">{num(item.ancho)}</td>

                    {/* Diámetro */}
                    <td className="px-4 py-3 font-mono text-[12px] th-text-p">{num(item.diametro)}</td>

                    {/* Carrier */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.carrier
                        ? <Badge tone={carrierTone(item.carrier)}>{item.carrier}</Badge>
                        : <Dash />}
                    </td>

                    {/* Comentarios */}
                    <td className="px-4 py-3 th-text-m text-[11px] max-w-[200px] truncate"
                      title={item.comentario || ''}>
                      {dash(item.comentario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie de tabla — paginación */}
        {totalFiltered > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3
            px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-light)' }}>

            {/* Selector rows/page */}
            <div className="flex items-center gap-2 text-[12px] th-text-m">
              <span>Filas por página:</span>
              {[10, 25, 50].map(size => (
                <button key={size}
                  onClick={() => setPageSize(size)}
                  className="h-7 px-2.5 rounded-lg text-[12px] font-semibold border transition-colors"
                  style={{
                    background:   pageSize === size ? 'var(--accent)' : 'var(--bg-card)',
                    color:        pageSize === size ? '#fff' : 'var(--text-secondary)',
                    borderColor:  pageSize === size ? 'var(--accent)' : 'var(--border)',
                  }}>
                  {size}
                </button>
              ))}
            </div>

            {/* Paginación */}
            <Pagination
              currentPage={currentPage}
              totalItems={totalFiltered}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Botón exportar */}
      <div className="flex justify-end">
        <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold
            text-white transition-all hover:opacity-90 active:scale-[.98]"
          style={{ background: '#0284C7', boxShadow: '0 2px 8px rgba(2,132,199,0.25)' }}>
          <Download size={15} strokeWidth={2} />
          Descargar Excel
        </button>
      </div>
    </div>
  )
}

// Componente auxiliar para valores nulos en tabla
function Dash() {
  return <span style={{ color: 'var(--text-muted)' }}>—</span>
}
