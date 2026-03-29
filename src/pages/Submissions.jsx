import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, X } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import LoadError from '../components/ui/LoadError'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { useAuthStore } from '../store/useAuthStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { FORM_TYPES, getFormMeta, isFormVisible, normalizeFormCode } from '../data/formTypes'
import { extractSiteInfo, extractMeta, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

// ── Score calculator ──────────────────────────────────────────────────────────
function getScore(sub) {
  const p = sub?.payload?.payload || sub?.payload || {}
  const data = p.data || p
  const fc = normalizeFormCode(sub?.form_code || sub?.form_type || p?.form_code || p?.form_type || '')

  const cl = data.checklistData || {}
  const keys = Object.keys(cl)
  if (keys.length) {
    let total = 0, good = 0
    for (const k of keys) {
      const item = cl[k]
      const st = (typeof item === 'string' ? item : item?.status || '').toLowerCase()
      if (!st) continue; total++
      if (st === 'bueno' || st === 'good') good++
    }
    if (total) return Math.round((good / total) * 100)
  }

  if (fc === 'grounding-system-test') {
    const FIELDS = ['rPataTorre','rCerramiento','rPorton','rPararrayos','rBarraSPT','rEscalerilla1','rEscalerilla2']
    let total = 0, pts = 0
    for (const f of FIELDS) { const v = parseFloat(data[f]); if (isNaN(v)||v===0) continue; total++; if (v<=5) pts+=100; else if (v<=10) pts+=50 }
    return total ? Math.round(pts/total) : null
  }

  if (fc === 'safety-system') {
    const FIELDS = [
      {s:'herrajes',f:'herrajeInferior'},{s:'herrajes',f:'herrajeSuperior'},
      {s:'herrajes',f:'estadoCable'},{s:'prensacables',f:'estadoPrensacables'},
      {s:'tramos',f:'estadoEscalera'},
    ]
    let total = 0, good = 0
    for (const {s,f} of FIELDS) {
      const v = ((data[s]&&data[s][f])||data[f]||'').toLowerCase()
      if (!v) continue; total++; if (v==='bueno'||v==='good') good++
    }
    return total ? Math.round((good/total)*100) : null
  }

  if (fc === 'executed-maintenance') {
    const assets = sub?.assets || []
    if (assets.length) {
      const before = new Set(), after = new Set()
      for (const a of assets) {
        const m = (a.asset_type||'').match(/^executed:(pmx-\d+):(before|after)$/)
        if (m) { if (m[2]==='before') before.add(m[1]); else after.add(m[1]) }
      }
      const all = new Set([...before,...after])
      if (all.size) return Math.round((after.size/all.size)*100)
    }
    return null
  }
  return null
}

// ── Date formatter — handles ISO strings and "YYYY-MM-DD HH:mm" ────────────
function fmtDate(raw) {
  if (!raw) return { date: '', time: '' }
  // Replace space with T so Date can parse "2026-03-13 20:12:44.542Z"
  const d = new Date(String(raw).replace(' ', 'T'))
  if (isNaN(d)) return { date: raw, time: '' }
  return {
    date: d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }),
    time: d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ── UI atoms ──────────────────────────────────────────────────────────────────
function StatusPill({ fin }) {
  return fin
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Completado
      </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Borrador
      </span>
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null
  const cls = score >= 80 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : score >= 50 ? 'bg-amber-50 text-amber-700 ring-amber-200'
            :               'bg-red-50 text-red-700 ring-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ring-inset ${cls} whitespace-nowrap`}>
      {score}%
    </span>
  )
}

function TypeBadge({ meta }) {
  const I = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold ${meta.colorLight} whitespace-nowrap`}>
      <I size={11} />{meta.shortLabel}
    </span>
  )
}

// ── Table header cell ──────────────────────────────────────────────────────────
function TH({ children, className = '' }) {
  return (
    <div className={`px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider ${className}`}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Submissions() {
  const load           = useSubmissionsStore((s) => s.load)
  const isLoading      = useSubmissionsStore((s) => s.isLoading)
  const storeError     = useSubmissionsStore((s) => s.error)
  const submissions    = useSubmissionsStore((s) => s.submissions)
  const filterFormCode = useSubmissionsStore((s) => s.filterFormCode)
  const search         = useSubmissionsStore((s) => s.search)
  const setFilter      = useSubmissionsStore((s) => s.setFilter)
  const getFiltered    = useSubmissionsStore((s) => s.getFiltered)
  const loadOrders     = useOrdersStore((s) => s.load)
  const orders         = useOrdersStore((s) => s.orders)
  const navigate       = useNavigate()

  const authReady = useAuthStore((s) => !s.isLoading && s.isAuthed)
  useEffect(() => {
    if (!authReady) return
    useSubmissionsStore.setState({ error: null })
    load(true); loadOrders()
  }, [authReady])

  const filtered = useMemo(
    () => getFiltered().filter(s => isFormVisible(s.form_code)),
    [submissions, filterFormCode, search]
  )

  const orderMap = useMemo(() => {
    const m = {}
    for (const o of orders) m[o.id] = o.order_number || o.id.slice(0, 8)
    return m
  }, [orders])

  const hasFilter = search || filterFormCode !== 'all'

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[20px] font-bold th-text-p">Formularios</h1>
        <span className="text-[12px] font-semibold th-text-m px-2.5 py-0.5 rounded-full th-bg-base tabular-nums">
          {filtered.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 th-text-m pointer-events-none" />
          <input
            type="text" value={search}
            onChange={e => setFilter({ search: e.target.value })}
            placeholder="Buscar por sitio, inspector..."
            className="w-full h-9 pl-9 pr-8 text-[13px] th-bg-card border th-border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-500 transition-all placeholder:th-text-m"
          />
          {search && (
            <button onClick={() => setFilter({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 th-text-m hover:th-text-s transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={filterFormCode}
          onChange={e => setFilter({ filterFormCode: e.target.value })}
          className="h-9 px-3 text-[13px] th-bg-card border th-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-500 transition-all th-text-s">
          <option value="all">Todos los tipos</option>
          {Object.entries(FORM_TYPES).filter(([c]) => isFormVisible(c)).map(([c, m]) =>
            <option key={c} value={c}>{m.label}</option>
          )}
        </select>

        {hasFilter && (
          <button onClick={() => setFilter({ search: '', filterFormCode: 'all' })}
            className="h-9 px-3 text-[13px] th-text-m
              rounded-lg shadow-sm flex items-center gap-1.5 transition-colors hover:bg-slate-50/40">
            <X size={13} />Limpiar
          </button>
        )}
      </div>

      {/* Error solo si no hay datos cargados — si hay datos el error de polling no los reemplaza */}
      {!isLoading && storeError && filtered.length === 0 && (
        <LoadError message={storeError} onRetry={() => {
          useSubmissionsStore.setState({ error: null })
          load(true)
        }} />
      )}

      {/* Loading — solo si no hay datos todavía */}
      {isLoading && filtered.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Spinner size={16} />
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="rounded-2xl th-shadow overflow-hidden" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>

          {/* Header row — usando <table> real para alineación correcta */}
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="border-b th-border-l">
                <th className="px-3 sm:px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider w-[140px] sm:w-[170px]">Tipo</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider">Sitio</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider w-[90px] hidden md:table-cell">Orden</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider w-[130px] hidden md:table-cell">Inspector</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider w-[120px] hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider w-[32px] sm:w-[120px]">
                  <span className="hidden sm:inline">Estado</span>
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider w-[70px] hidden sm:table-cell text-center">Score</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(sub => {
                const meta    = getFormMeta(sub.form_code)
                const site    = extractSiteInfo(sub)
                const who     = extractSubmittedBy(sub)
                const inspMeta = extractMeta(sub)
                const fin     = sub.finalized || isFinalized(sub)
                const score   = getScore(sub)

                // Date: prefer startedAt from meta, then sub.created_at
                const rawDate = inspMeta.startedAt || sub.created_at || ''
                const { date, time } = fmtDate(rawDate)

                const visitId  = sub.site_visit_id
                const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

                return (
                  <tr key={sub.id}
                    onClick={() => navigate(`/submissions/${sub.id}`)}
                    className="cursor-pointer transition-colors group"
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>

                    {/* Tipo */}
                    <td className="px-3 sm:px-4 py-3.5">
                      <TypeBadge meta={meta} />
                    </td>

                    {/* Sitio */}
                    <td className="px-4 py-3.5 min-w-0">
                      <div className="text-[13px] font-semibold th-text-p truncate max-w-[220px]">
                        {site.nombreSitio || <span className="th-text-m font-normal">Sin nombre</span>}
                      </div>
                      {site.idSitio && (
                        <div className="text-[11px] th-text-m mt-0.5">ID: {site.idSitio}</div>
                      )}
                    </td>

                    {/* Orden */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {hasOrder
                        ? <Link to={`/orders/${visitId}`} onClick={e => e.stopPropagation()}
                            className="text-[12px] font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors">
                            {orderMap[visitId] || '--'}
                          </Link>
                        : <span className="text-[12px] th-text-m">—</span>}
                    </td>

                    {/* Inspector */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-[13px] th-text-s truncate block max-w-[120px]">
                        {who?.name || '—'}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-[13px] th-text-s">{date}</div>
                      {time && <div className="text-[11px] th-text-m mt-0.5">{time}</div>}
                    </td>

                    {/* Estado */}
                    <td className="px-2 sm:px-4 py-3.5">
                      {/* Móvil: solo dot */}
                      <span className="sm:hidden flex items-center justify-center">
                        <span className={`w-2.5 h-2.5 rounded-full ${fin ? 'bg-emerald-500' : 'bg-amber-400'}`}
                          title={fin ? 'Completado' : 'Borrador'} />
                      </span>
                      {/* Desktop: badge completo */}
                      <span className="hidden sm:inline">
                        <StatusPill fin={fin} />
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3.5 hidden sm:table-cell text-center">
                      <ScoreBadge score={score} />
                    </td>

                    {/* Arrow */}
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
      )}

      {/* Empty */}
      {!isLoading && !storeError && filtered.length === 0 && (
        <div className="rounded-2xl th-shadow py-20 text-center" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
          <div className="text-[15px] font-semibold th-text-m mb-1">Sin resultados</div>
          <div className="text-[13px] th-text-m">
            {hasFilter ? 'Ajusta los filtros para ver más.' : 'Aún no hay formularios registrados.'}
          </div>
        </div>
      )}
    </div>
  )
}
