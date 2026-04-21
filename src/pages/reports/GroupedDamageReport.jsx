/**
 * GroupedDamageReport.jsx
 * Reporte de Daños Agrupados por Descripción + Categoría.
 * Una fila por grupo, expandible con subtabla de sitios.
 */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ExternalLink, Download } from 'lucide-react'
import Card       from '../../components/ui/Card'
import Select     from '../../components/ui/Select'
import Spinner    from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import ReportInfo from '../../components/ui/ReportInfo'
import { AlertTriangle } from 'lucide-react'

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABELS  = { pendiente: 'Pendiente', cotizado: 'Cotizado', reparado: 'Reparado' }
const STATUS_STYLES  = {
  pendiente: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  cotizado:  { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  reparado:  { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
}

function StatusPill({ value, onChange }) {
  const cfg = STATUS_STYLES[value] || STATUS_STYLES.pendiente
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value || 'pendiente'}
        onChange={e => onChange(e.target.value)}
        className="appearance-none text-[11px] font-bold pl-2.5 pr-6 py-1 rounded-full cursor-pointer border"
        style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <ChevronRight size={10} style={{ color: cfg.color, position: 'absolute', right: 8, pointerEvents: 'none' }} />
    </div>
  )
}

// ── Inline text input con debounce ────────────────────────────────────────────
function InlineInput({ value, onSave, placeholder, width = '100%' }) {
  const [draft, setDraft] = useState(value || '')
  const debRef = useRef(null)

  useEffect(() => { setDraft(value || '') }, [value])

  const handleChange = e => {
    const v = e.target.value
    setDraft(v)
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => onSave(v), 500)
  }

  return (
    <input
      value={draft}
      onChange={handleChange}
      placeholder={placeholder}
      style={{ width, background: 'transparent', border: 'none', outline: 'none',
        fontSize: 12, color: 'var(--text-primary)', padding: '2px 4px',
        borderRadius: 4 }}
      onFocus={e => e.target.style.background = 'var(--bg-base)'}
      onBlur={e => e.target.style.background = 'transparent'}
    />
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, sub, accent = false }) {
  return (
    <div className="rounded-2xl p-4 th-shadow"
      style={{
        background:  accent ? color : 'var(--bg-card)',
        border:      `1px solid var(--border)`,
        borderLeft:  accent ? undefined : `3px solid ${color}`,
      }}>
      <div className="text-[22px] font-bold" style={{ color: accent ? '#fff' : color }}>{value}</div>
      <div className="text-[11px] font-semibold mt-0.5" style={{ color: accent ? 'rgba(255,255,255,0.8)' : 'var(--text-primary)' }}>{label}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: accent ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ── Fila de grupo expandible ──────────────────────────────────────────────────
function GroupRow({ group, isExpanded, onToggle, onGroupCommentSave, onSiteStatus, onSiteComment, getSitePage, setSitePage }) {
  const catColor    = group.category === 'Malo' ? '#dc2626' : '#0284C7'
  const catBg       = group.category === 'Malo' ? '#fee2e2' : '#dbeafe'
  const catBorder   = group.category === 'Malo' ? '#fca5a5' : '#93c5fd'

  // Paginación interna de sitios
  const usePagination = group.totalSites >= 30
  const sitePage      = getSitePage(group.groupKey)
  const sitePageSize  = 25
  const sitesSlice    = usePagination
    ? group.sites.slice((sitePage - 1) * sitePageSize, sitePage * sitePageSize)
    : group.sites
  const siteFrom = usePagination ? (sitePage - 1) * sitePageSize + 1 : 1
  const siteTo   = usePagination ? Math.min(sitePage * sitePageSize, group.totalSites) : group.totalSites

  return (
    <>
      {/* Fila principal del grupo */}
      <tr
        onClick={onToggle}
        style={{ borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>

        {/* Expand chevron */}
        <td className="px-3 py-3 w-8">
          <ChevronRight size={14} className="th-text-m transition-transform"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
        </td>

        {/* Descripción */}
        <td className="px-4 py-3 th-text-p font-semibold text-[13px] max-w-[260px]">
          {group.description || '—'}
        </td>

        {/* Categoría */}
        <td className="px-4 py-3">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ background: catBg, color: catColor, border: `1px solid ${catBorder}` }}>
            {group.category}
          </span>
        </td>

        {/* Sitios afectados */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold" style={{ color: catColor }}>{group.totalSites}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: catBg, color: catColor, border: `1px solid ${catBorder}` }}>
              {group.totalSites === 1 ? '1 sitio' : `${group.totalSites} sitios`}
            </span>
          </div>
        </td>

        {/* Resumen de estado — solo > 0 */}
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex flex-wrap gap-1.5">
            {group.pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background:'#fef3c7', color:'#92400e', border:'1px solid #fcd34d' }}>
                {group.pendingCount} Pend.
              </span>
            )}
            {group.quotedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background:'#dbeafe', color:'#1d4ed8', border:'1px solid #93c5fd' }}>
                {group.quotedCount} Cot.
              </span>
            )}
            {group.repairedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background:'#dcfce7', color:'#15803d', border:'1px solid #86efac' }}>
                {group.repairedCount} Rep.
              </span>
            )}
          </div>
        </td>

        {/* Comentario cotización inline */}
        <td className="px-4 py-3 min-w-[180px]" onClick={e => e.stopPropagation()}>
          <InlineInput
            value={group.groupComment}
            onSave={v => onGroupCommentSave(group.groupKey, v)}
            placeholder="Agregar nota de cotización…"
            width="100%"
          />
        </td>
      </tr>

      {/* Fila expandida — subtabla de sitios */}
      {isExpanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: 'var(--bg-base)' }}>
            <div className="px-6 py-4">
              {/* Sub-header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider th-text-m">
                  {group.totalSites} sitio{group.totalSites !== 1 ? 's' : ''} afectado{group.totalSites !== 1 ? 's' : ''}
                  {usePagination && ` — Mostrando ${siteFrom}–${siteTo}`}
                </span>
              </div>

              {/* Subtabla */}
              <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-[12px]" style={{ background: 'var(--bg-card)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                      {['ID Sitio', 'Visita', 'Formulario', 'Estado', 'Comentario Auditoría'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold th-text-m uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sitesSlice.map((site, idx) => (
                      <tr key={site.damageKey || idx}
                        style={{ borderTop: '1px solid var(--border-light)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>

                        {/* ID Sitio */}
                        <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap"
                          style={{ color: 'var(--accent)' }}>
                          {site.orderId ? (
                            <Link to={`/orders/${site.orderId}`}
                              className="inline-flex items-center gap-1 hover:underline"
                              onClick={e => e.stopPropagation()}>
                              {site.idSitio || '—'}
                              <ExternalLink size={9} />
                            </Link>
                          ) : (site.idSitio || '—')}
                        </td>

                        {/* Visita */}
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          {site.orderId ? (
                            <Link to={`/orders/${site.orderId}`}
                              className="inline-flex items-center gap-1 hover:underline text-[11px]"
                              style={{ color: 'var(--accent)' }}
                              onClick={e => e.stopPropagation()}>
                              {site.orderLabel || site.orderId.slice(0, 8)}
                              <ExternalLink size={9} />
                            </Link>
                          ) : (site.orderLabel || '—')}
                        </td>

                        {/* Formulario */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {site.submissionId ? (
                            <Link to={`/submissions/${site.submissionId}`}
                              className="inline-flex items-center gap-1 hover:underline"
                              style={{ color: 'var(--accent)', fontSize: 11 }}
                              onClick={e => e.stopPropagation()}>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                {site.formLabel || site.formCode || '—'}
                              </span>
                            </Link>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px]"
                              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                              {site.formLabel || '—'}
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <StatusPill
                            value={site.status}
                            onChange={val => onSiteStatus(site.damageKey, site.submissionId, val)}
                          />
                        </td>

                        {/* Comentario auditoría */}
                        <td className="px-3 py-2 min-w-[180px]">
                          <InlineInput
                            value={site.auditComment}
                            onSave={v => onSiteComment(site.damageKey, site.submissionId, v)}
                            placeholder="Agregar comentario…"
                            width="100%"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación interna (solo si ≥30 sitios) */}
              {usePagination && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] th-text-m">
                    Mostrando {siteFrom}–{siteTo} de {group.totalSites} sitios
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSitePage(group.groupKey, sitePage - 1)}
                      disabled={sitePage === 1}
                      className="px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-40"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                      ← Anterior
                    </button>
                    <span className="text-[11px] th-text-m">
                      Página {sitePage} de {Math.ceil(group.totalSites / sitePageSize)}
                    </span>
                    <button
                      onClick={() => setSitePage(group.groupKey, sitePage + 1)}
                      disabled={siteTo >= group.totalSites}
                      className="px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-40"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GroupedDamageReport({ hook }) {
  const {
    paginatedGroups,
    totalGroups, totalUniqueSites, totalPending, totalQuoted, totalRepaired,
    filterCategory, filterStatus, filterRegion, setFilter, filterOptions,
    quarterOptions, selectedQuarter, setSelectedQuarter,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    setSitePage, getSitePage,
    updateGroupComment, updateSiteStatus, updateSiteComment,
    exportToExcel,
    isLoading, error,
  } = hook

  const [expandedKeys, setExpandedKeys] = useState(new Set())

  const toggleExpand = (key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const from = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to   = Math.min(currentPage * pageSize, totalFiltered)

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>Error: {error}</div>

  return (
    <div className="space-y-5">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Grupos de Daños"   value={totalGroups}      color="#0284C7" sub="descripciones únicas" accent />
        <KpiCard label="Sitios Afectados"  value={totalUniqueSites} color="#0d9488" sub="sitios únicos con daños" />
        <KpiCard label="Pendientes"        value={totalPending}     color="#f59e0b" sub="daños sin acción" />
        <KpiCard label="Cotizados"         value={totalQuoted}      color="#0284C7" sub="en proceso de cotización" />
        <KpiCard label="Reparados"         value={totalRepaired}    color="#10b981" sub="daños resueltos" />
      </div>

      {/* ── Guía del reporte ── */}
      <ReportInfo
        title="Daños Agrupados por Descripción"
        description="Consolida todos los daños del período agrupando cada descripción única de daño. Para cada grupo muestra cuántos sitios distintos presentan ese daño, su estado de resolución y permite agregar un comentario de cotización. Diseñado para armar cotizaciones y rutas de correctivo agrupando el mismo trabajo en múltiples sitios."
        howToUse={[
          "Filtra por Categoría para ver solo los daños 'Malo' que son más urgentes.",
          "Filtra por Estado 'Pendiente' para ver los grupos que aún no tienen cotización.",
          "Expande un grupo (clic en la fila) para ver todos los sitios afectados con su estado individual.",
          "Escribe en la columna 'Nota Cotización' para guardar comentarios de presupuesto — se guardan automáticamente.",
          "Exporta a Excel para compartir con el equipo de mantenimiento o preparar cotizaciones.",
        ]}
        howToInterpret={[
          "Un número alto en Sitios Afectados indica un daño sistémico que requiere corrección en múltiples torres.",
          "Si todos los sitios de un grupo están 'Pendiente', el daño no ha sido atendido en ninguna torre.",
          "El filtro de Estado muestra grupos que tengan AL MENOS UN sitio en ese estado.",
          "Los grupos están ordenados por mayor número de sitios afectados para priorizar el trabajo de mayor impacto.",
          "La columna Nota Cotización persiste en Supabase — visible para todos los usuarios del panel.",
        ]}
      />

      {/* ── Filtros ── */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Cuatrimestre */}
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
            <Select value={filterCategory} onChange={e => setFilter('category', e.target.value)}>
              <option value="">Todas las Categorías</option>
              {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filterStatus} onChange={e => setFilter('status', e.target.value)}>
              <option value="">Todos los Estados</option>
              {filterOptions.statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select value={filterRegion} onChange={e => setFilter('region', e.target.value)}>
              <option value="">Todas las regiones</option>
              {filterOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Tabla principal ── */}
      <Card>
        <div className="overflow-x-auto">
          {paginatedGroups.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Sin grupos de daños"
              description="No hay daños que coincidan con los filtros seleccionados." />
          ) : (
            <table className="w-full border-collapse text-[13px]" style={{ minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                  <th className="w-8" />
                  {[
                    ['Descripción del Daño', 'left'],
                    ['Categoría',            'left'],
                    ['Sitios Afectados',      'left'],
                    ['Resumen de Estado',     'left'],
                    ['Nota Cotización',       'left'],
                  ].map(([h, align]) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'var(--text-muted)', textAlign: align }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedGroups.map(group => (
                  <GroupRow
                    key={group.groupKey}
                    group={group}
                    isExpanded={expandedKeys.has(group.groupKey)}
                    onToggle={() => toggleExpand(group.groupKey)}
                    onGroupCommentSave={updateGroupComment}
                    onSiteStatus={updateSiteStatus}
                    onSiteComment={updateSiteComment}
                    getSitePage={getSitePage}
                    setSitePage={setSitePage}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer de paginación */}
        {totalFiltered > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center gap-2 text-[12px] th-text-m">
              <span>Grupos por página:</span>
              {[10, 25, 50].map(size => (
                <button key={size} onClick={() => { setPageSize(size); setCurrentPage(1) }}
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
            <div className="text-[12px] th-text-m font-medium">
              Mostrando <span className="font-bold th-text-p">{totalFiltered === 0 ? 0 : `${from}–${to}`}</span> de <span className="font-bold th-text-p">{totalFiltered}</span> grupos
            </div>
          </div>
        )}
      </Card>

    </div>
  )
}
