import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, X } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
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
    <div className={`px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${className}`}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Submissions() {
  const load           = useSubmissionsStore((s) => s.load)
  const isLoading      = useSubmissionsStore((s) => s.isLoading)
  const submissions    = useSubmissionsStore((s) => s.submissions)
  const filterFormCode = useSubmissionsStore((s) => s.filterFormCode)
  const search         = useSubmissionsStore((s) => s.search)
  const setFilter      = useSubmissionsStore((s) => s.setFilter)
  const getFiltered    = useSubmissionsStore((s) => s.getFiltered)
  const loadOrders     = useOrdersStore((s) => s.load)
  const orders         = useOrdersStore((s) => s.orders)
  const navigate       = useNavigate()

  useEffect(() => { load(); loadOrders() }, [])

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
        <h1 className="text-[20px] font-bold text-slate-900">Formularios</h1>
        <span className="text-[12px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
          {filtered.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text" value={search}
            onChange={e => setFilter({ search: e.target.value })}
            placeholder="Buscar por sitio, inspector..."
            className="w-full h-9 pl-9 pr-8 text-[13px] bg-white border border-slate-200 rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setFilter({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={filterFormCode}
          onChange={e => setFilter({ filterFormCode: e.target.value })}
          className="h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-700">
          <option value="all">Todos los tipos</option>
          {Object.entries(FORM_TYPES).filter(([c]) => isFormVisible(c)).map(([c, m]) =>
            <option key={c} value={c}>{m.label}</option>
          )}
        </select>

        {hasFilter && (
          <button onClick={() => setFilter({ search: '', filterFormCode: 'all' })}
            className="h-9 px-3 text-[13px] text-slate-500 hover:text-slate-800 bg-white border border-slate-200
              rounded-lg shadow-sm flex items-center gap-1.5 transition-colors hover:bg-slate-50">
            <X size={13} />Limpiar
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size={16} />
        </div>
      )}

      {/* Table */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Header row — usando <table> real para alineación correcta */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[170px]">Tipo</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sitio</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[90px] hidden md:table-cell">Orden</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[130px] hidden md:table-cell">Inspector</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[120px] hidden lg:table-cell">Fecha</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[120px]">Estado</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[70px] hidden sm:table-cell text-center">Score</th>
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
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors group">

                    {/* Tipo */}
                    <td className="px-4 py-3.5">
                      <TypeBadge meta={meta} />
                    </td>

                    {/* Sitio */}
                    <td className="px-4 py-3.5 min-w-0">
                      <div className="text-[13px] font-semibold text-slate-800 truncate max-w-[220px]">
                        {site.nombreSitio || <span className="text-slate-400 font-normal">Sin nombre</span>}
                      </div>
                      {site.idSitio && (
                        <div className="text-[11px] text-slate-400 mt-0.5">ID: {site.idSitio}</div>
                      )}
                    </td>

                    {/* Orden */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {hasOrder
                        ? <Link to={`/orders/${visitId}`} onClick={e => e.stopPropagation()}
                            className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 hover:underline transition-colors">
                            {orderMap[visitId] || '--'}
                          </Link>
                        : <span className="text-[12px] text-slate-300">—</span>}
                    </td>

                    {/* Inspector */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-[13px] text-slate-600 truncate block max-w-[120px]">
                        {who?.name || '—'}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-[13px] text-slate-700">{date}</div>
                      {time && <div className="text-[11px] text-slate-400 mt-0.5">{time}</div>}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3.5">
                      <StatusPill fin={fin} />
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3.5 hidden sm:table-cell text-center">
                      <ScoreBadge score={score} />
                    </td>

                    {/* Arrow */}
                    <td className="pr-3 py-3.5">
                      <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-sm">
          <div className="text-[15px] font-semibold text-slate-500 mb-1">Sin resultados</div>
          <div className="text-[13px] text-slate-400">
            {hasFilter ? 'Ajusta los filtros para ver más.' : 'Aún no hay formularios registrados.'}
          </div>
        </div>
      )}
    </div>
  )
}
