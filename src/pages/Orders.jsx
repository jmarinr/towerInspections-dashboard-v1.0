import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Download, Loader2, X } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import LoadError from '../components/ui/LoadError'
import Pagination from '../components/ui/Pagination'
import { useOrdersStore } from '../store/useOrdersStore'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { extractRegion, regionLabel } from '../utils/regionUtils'

const PAGE_SIZE = 25
import { useAuthStore } from '../store/useAuthStore'
import { fetchSubmissionsWithAssetsForVisit } from '../lib/supabaseQueries'
import { normalizeFormCode, isFormVisible } from '../data/formTypes'
import { generateMaintenancePdf } from '../utils/pdf/maintenancePdf'
import { generateGroundingPdf } from '../utils/pdf/groundingPdf'
import { generatePMExecutedPdf } from '../utils/pdf/pmExecutedPdf'
import { generateSafetyPdf } from '../utils/pdf/safetyPdf'
import { generateSubmissionPdf } from '../utils/pdf/generateReport'
import { generateEquipmentV2Pdf } from '../utils/pdf/equipmentV2Pdf'

async function downloadAllPdfs(orderId, orderNumber) {
  const subs = await fetchSubmissionsWithAssetsForVisit(orderId)
  const visible = subs.filter(s => isFormVisible(s.form_code))
  if (!visible.length) { alert('No hay formularios para descargar'); return }

  for (const sub of visible) {
    const fc = normalizeFormCode(sub.form_code)
    let bytes
    try {
      if      (fc === 'preventive-maintenance') bytes = await generateMaintenancePdf(sub, sub.assets || [])
      else if (fc === 'grounding-system-test')  bytes = await generateGroundingPdf(sub, sub.assets || [])
      else if (fc === 'executed-maintenance')   bytes = await generatePMExecutedPdf(sub, sub.assets || [])
      else if (fc === 'safety-system')          bytes = await generateSafetyPdf(sub, sub.assets || [])
      else if (fc === 'equipment-v2') {
        const photoMap = {}
        ;(sub.assets || []).forEach(a => {
          const key = a.asset_type || a.type || ''
          const url = a.public_url || a.storage_url || a.url
          if (key && url) photoMap[key] = url
        })
        bytes = await generateEquipmentV2Pdf(sub, photoMap)
      }
      else bytes = await generateSubmissionPdf(sub, sub.assets || [])
    } catch (e) { console.error(`PDF error for ${fc}:`, e); continue }

    if (bytes) {
      const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${orderNumber || orderId.slice(0,8)}_${fc}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

function BulkDownloadBtn({ orderId, orderNumber }) {
  const [loading, setLoading] = useState(false)
  const handleClick = async (e) => {
    e.stopPropagation(); e.preventDefault()
    setLoading(true)
    try { await downloadAllPdfs(orderId, orderNumber) } catch (e) { console.error(e) }
    setLoading(false)
  }
  return (
    <button onClick={handleClick} disabled={loading}
      title="Descargar todos los PDFs"
      className="p-1.5 rounded-lg th-text-m hover:text-sky-600 hover:bg-sky-50 disabled:opacity-40 transition-colors">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
    </button>
  )
}

// Tooltips por estado
const KPI_TOOLTIPS = {
  'all':         'Todas las visitas según los filtros activos',
  'closed':      'Inspección finalizada y cerrada',
  'con-avance':  'Abierta con al menos 1 formulario finalizado',
  'sin-iniciar': 'El inspector aún no ha enviado ningún formulario',
  'en-curso':    'Formularios enviados pero ninguno finalizado aún',
}

function VisitKpiCard({ label, value, accent = false, borderColor, className = '', filterKey, activeFilter, onFilter }) {
  const isActive = activeFilter === filterKey
  return (
    <div
      onClick={() => onFilter(isActive ? 'all' : filterKey)}
      title={KPI_TOOLTIPS[filterKey] || ''}
      className={`rounded-2xl p-4 border th-shadow flex flex-col gap-2 cursor-pointer select-none
        transition-all duration-150 relative group ${className}
        ${isActive ? 'ring-2 ring-offset-1' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
      style={{
        background:  accent ? (isActive ? '#263446' : 'var(--stat-accent-bg)') : (isActive ? '#f1f5f9' : 'var(--bg-card)'),
        borderColor: accent ? 'transparent' : isActive ? (borderColor || '#475569') : (borderColor || 'var(--border)'),
        borderLeft:  !accent && borderColor ? `3px solid ${borderColor}` : undefined,
        ringColor:   borderColor || '#475569',
      }}>

      {/* Hint "Filtrar" / "Filtrando" */}
      <span className={`absolute top-2 right-2.5 text-[9px] font-semibold transition-opacity duration-150
        ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ color: accent ? 'rgba(255,255,255,0.5)' : borderColor || '#94a3b8' }}>
        {isActive ? '● filtrando' : 'filtrar ↑'}
      </span>

      <div className="text-[26px] font-bold leading-none tabular-nums"
        style={{ color: accent ? 'var(--stat-accent-text)' : 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-[11.5px] font-medium"
        style={{ color: accent ? 'var(--stat-accent-sub)' : 'var(--text-secondary)' }}>
        {label}
      </div>
    </div>
  )
}

export default function Orders() {
  const load         = useOrdersStore((s) => s.load)
  const isLoading    = useOrdersStore((s) => s.isLoading)
  const storeError   = useOrdersStore((s) => s.error)
  const orders       = useOrdersStore((s) => s.orders)
  const filterStatus = useOrdersStore((s) => s.filterStatus)
  const filterRegion = useOrdersStore((s) => s.filterRegion)
  const search       = useOrdersStore((s) => s.search)
  const setFilter    = useOrdersStore((s) => s.setFilter)
  const getFiltered  = useOrdersStore((s) => s.getFiltered)
  const navigate     = useNavigate()
  const [page, setPage] = useState(1)

  const authReady = useAuthStore((s) => !s.isLoading && s.isAuthed)
  useEffect(() => {
    if (!authReady) return
    useOrdersStore.setState({ error: null })
    load(true)
  }, [authReady])

  const submissions  = useSubmissionsStore((s) => s.submissions)

  // subsByVisit debe estar antes de filtered (TDZ: filtered usa subsByVisit)
  const subsByVisit = useMemo(() => {
    const map = {}
    for (const sub of submissions) {
      if (!sub.site_visit_id) continue
      if (!map[sub.site_visit_id]) map[sub.site_visit_id] = []
      map[sub.site_visit_id].push(sub)
    }
    return map
  }, [submissions])

  const filtered = useMemo(() => {
    setPage(1)
    const base = getFiltered()
    // Sub-estados: filtrar por estado de submissions si aplica
    if (['con-avance', 'sin-iniciar', 'en-curso'].includes(filterStatus)) {
      return base.filter(o => {
        const subs        = subsByVisit[o.id] || []
        const hasSubs     = subs.length > 0
        const hasFinalized = subs.some(s => s.finalized === true)
        if (filterStatus === 'con-avance')  return hasSubs && hasFinalized
        if (filterStatus === 'sin-iniciar') return !hasSubs
        if (filterStatus === 'en-curso')    return hasSubs && !hasFinalized
        return true
      })
    }
    return base
  }, [orders, filterStatus, filterRegion, search, subsByVisit])
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])
  const hasFilter = search || filterRegion !== 'all'

  // KPIs — calculados sobre filtered sin nuevas queries
  const kpis = useMemo(() => {
    let cerradas = 0, abiertas = 0, pendientes = 0, borrador = 0
    for (const o of filtered) {
      const subs        = subsByVisit[o.id] || []
      const hasSubs     = subs.length > 0
      const hasFinalized = subs.some(s => s.finalized === true)
      if (o.status === 'closed')                                cerradas++
      else if (o.status === 'open' && !hasSubs)                 pendientes++
      else if (o.status === 'open' && hasSubs && !hasFinalized) borrador++
      else if (o.status === 'open' && hasSubs)                  abiertas++
    }
    return { total: filtered.length, cerradas, abiertas, pendientes, borrador }
  }, [filtered, subsByVisit])

  // Opciones de región derivadas dinámicamente del dataset completo
  const regionOptions = useMemo(() => {
    const regions = new Set()
    for (const o of orders) {
      const r = extractRegion(o.order_number)
      if (r) regions.add(r)
    }
    return [...regions].sort()
  }, [orders])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[20px] font-bold th-text-p">Visitas</h1>
        <span className="text-[12px] font-semibold th-text-m th-bg-base px-2.5 py-0.5 rounded-full tabular-nums">
          {filtered.length}
        </span>
      </div>

      {/* KPIs clickeables */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <VisitKpiCard label="Total visitas"  value={kpis.total}      accent           filterKey="all"         activeFilter={filterStatus} onFilter={f => setFilter({ filterStatus: f })} className="animate-kpi-enter delay-50" />
        <VisitKpiCard label="Cerradas"       value={kpis.cerradas}   borderColor="#0d9488" filterKey="closed"      activeFilter={filterStatus} onFilter={f => setFilter({ filterStatus: f })} className="animate-kpi-enter delay-100" />
        <VisitKpiCard label="Con avance"     value={kpis.abiertas}   borderColor="#475569" filterKey="con-avance"  activeFilter={filterStatus} onFilter={f => setFilter({ filterStatus: f })} className="animate-kpi-enter delay-150" />
        <VisitKpiCard label="Sin iniciar"    value={kpis.pendientes} borderColor="#d97706" filterKey="sin-iniciar" activeFilter={filterStatus} onFilter={f => setFilter({ filterStatus: f })} className="animate-kpi-enter delay-200" />
        <VisitKpiCard label="En curso"       value={kpis.borrador}   borderColor="#6366f1" filterKey="en-curso"    activeFilter={filterStatus} onFilter={f => setFilter({ filterStatus: f })} className="animate-kpi-enter delay-250" />
      </div>

      {/* Hint bar */}
      <div className="flex items-center gap-2 px-1" style={{ minHeight: 28 }}>
        {filterStatus === 'all' ? (
          <span className="text-[11px] th-text-m flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M2.5 6h7M4 9h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Toca una tarjeta para filtrar por ese estado
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] th-text-m">Filtrando por:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
              {{ 'closed': 'Cerradas', 'con-avance': 'Con avance', 'sin-iniciar': 'Sin iniciar', 'en-curso': 'En curso' }[filterStatus]}
              <button onClick={() => setFilter({ filterStatus: 'all' })}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: '#94a3b8', color: '#fff' }}>✕</button>
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 th-text-m pointer-events-none" />
          <input type="text" value={search} onChange={e => setFilter({ search: e.target.value })}
            placeholder="Buscar orden, sitio…"
            className="w-full h-9 pl-9 pr-8 text-[13px] th-bg-card border th-border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-500 transition-all placeholder:th-text-m" />
          {search && (
            <button onClick={() => setFilter({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 th-text-m hover:th-text-s">
              <X size={13} />
            </button>
          )}
        </div>

        <select value={filterRegion} onChange={e => setFilter({ filterRegion: e.target.value })}
          className="h-9 px-3 text-[13px] th-bg-card border th-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-500 transition-all th-text-s">
          <option value="all">Todas las regiones</option>
          {regionOptions.map(r => (
            <option key={r} value={r}>{regionLabel(r)}</option>
          ))}
        </select>

        {hasFilter && (
          <button onClick={() => setFilter({ search: '', filterStatus: 'all', filterRegion: 'all' })}
            className="h-9 px-3 text-[13px] th-text-m hover:th-text-p th-bg-card border th-border
              rounded-lg shadow-sm flex items-center gap-1.5 transition-colors hover:bg-slate-50/40">
            <X size={13} />Limpiar
          </button>
        )}
      </div>

      {/* Error solo si no hay datos */}
      {!isLoading && storeError && filtered.length === 0 && (
        <LoadError message={storeError} onRetry={() => {
          useOrdersStore.setState({ error: null })
          load(true)
        }} />
      )}

      {/* Loading — solo si no hay datos todavía */}
      {isLoading && filtered.length === 0 && <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>}

      {filtered.length > 0 && (
        <>
        <div className="rounded-2xl th-shadow overflow-hidden" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b th-border-l">
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider">Orden</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider">Sitio</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider hidden md:table-cell">Inspector</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider text-center w-16">PDFs</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map(o => {
                const d    = o.started_at ? new Date(o.started_at) : null
                const open = o.status === 'open'
                const subs          = subsByVisit[o.id] || []
                const hasSubs       = subs.length > 0
                const hasFinalized  = subs.some(s => s.finalized === true)
                const subState = !open ? 'closed'
                  : !hasSubs ? 'sin-iniciar'
                  : hasFinalized ? 'con-avance'
                  : 'en-curso'
                const STATE_BADGE = {
                  'closed':      { label: 'Cerrada',    bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', ring: '#e2e8f0' },
                  'con-avance':  { label: 'Con avance', bg: '#f0fdfa', color: '#0f766e', dot: '#0d9488', ring: '#99f6e4' },
                  'sin-iniciar': { label: 'Sin iniciar',bg: '#fafafa',  color: '#6b7280', dot: '#9ca3af', ring: '#e5e7eb' },
                  'en-curso':    { label: 'En curso',   bg: '#fef3c7', color: '#92400e', dot: '#d97706', ring: '#fde68a' },
                }
                const badge = STATE_BADGE[subState]
                return (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)}
                    className="cursor-pointer transition-colors group"
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>

                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-bold text-sky-600">{o.order_number}</span>
                    </td>

                    <td className="px-4 py-3.5 min-w-0">
                      <div className="text-[13px] font-semibold th-text-p truncate max-w-[200px]">{o.site_name}</div>
                      {o.site_id && <div className="text-[11px] th-text-m mt-0.5">ID: {o.site_id}</div>}
                    </td>

                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-[13px] th-text-s">{o.inspector_name || '—'}</span>
                    </td>

                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-[13px] th-text-s">
                        {d ? d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset"
                        style={{ background: badge.bg, color: badge.color, '--tw-ring-color': badge.ring }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <BulkDownloadBtn orderId={o.id} orderNumber={o.order_number} />
                    </td>

                    <td className="pr-3 py-3.5">
                      <ChevronRight size={15} className="th-text-m group-hover:text-sky-600 transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
        </>
      )}

      {!isLoading && !storeError && filtered.length === 0 && (
        <div className="rounded-2xl th-shadow py-20 text-center" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
          <div className="text-[15px] font-semibold th-text-m mb-1">Sin resultados</div>
          <div className="text-[13px] th-text-m">
            {hasFilter ? 'Ajusta los filtros.' : 'Sin visitas registradas aún.'}
          </div>
        </div>
      )}
    </div>
  )
}
