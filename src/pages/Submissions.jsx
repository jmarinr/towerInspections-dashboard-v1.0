import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { FORM_TYPES, getFormMeta, isFormVisible, normalizeFormCode } from '../data/formTypes'
import { extractSiteInfo, extractMeta, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

function getScore(sub) {
  const p = sub?.payload?.payload || sub?.payload || {}
  const data = p.data || p
  const formType = normalizeFormCode(sub?.form_code || sub?.form_type || p?.form_code || p?.form_type || '')

  const cl = data.checklistData || {}
  const keys = Object.keys(cl)
  if (keys.length) {
    let total = 0, good = 0
    for (const k of keys) {
      const item = cl[k]
      const st = (typeof item === 'string' ? item : item?.status || '').toLowerCase()
      if (!st) continue
      total++
      if (st === 'bueno' || st === 'good') good++
    }
    if (total) return Math.round((good / total) * 100)
  }

  if (formType === 'grounding-system-test') {
    const OHM_FIELDS = ['rPataTorre','rCerramiento','rPorton','rPararrayos','rBarraSPT','rEscalerilla1','rEscalerilla2']
    let total = 0, points = 0
    for (const f of OHM_FIELDS) {
      const val = parseFloat(data[f])
      if (isNaN(val) || val === 0) continue
      total++
      if (val <= 5) points += 100
      else if (val <= 10) points += 50
    }
    if (total) return Math.round(points / total)
    return null
  }

  if (formType === 'safety-system') {
    const STATUS_FIELDS = [
      { section: 'herrajes', field: 'herrajeInferior' },
      { section: 'herrajes', field: 'herrajeSuperior' },
      { section: 'herrajes', field: 'estadoCable' },
      { section: 'prensacables', field: 'estadoPrensacables' },
      { section: 'tramos', field: 'estadoEscalera' },
    ]
    let total = 0, good = 0
    for (const { section, field } of STATUS_FIELDS) {
      const val = ((data[section] && data[section][field]) || data[field] || '').toLowerCase()
      if (!val) continue
      total++
      if (val === 'bueno' || val === 'good') good++
    }
    if (total) return Math.round((good / total) * 100)
    return null
  }

  if (formType === 'executed-maintenance') {
    const assets = sub?.assets || []
    if (assets.length > 0) {
      const beforeIds = new Set(), afterIds = new Set()
      for (const a of assets) {
        const m = (a.asset_type || '').match(/^executed:(pmx-\d+):(before|after)$/)
        if (m) { if (m[2] === 'before') beforeIds.add(m[1]); if (m[2] === 'after') afterIds.add(m[1]) }
      }
      const allIds = new Set([...beforeIds, ...afterIds])
      if (allIds.size) return Math.round((afterIds.size / allIds.size) * 100)
    }
    return null
  }
  return null
}

function ScorePill({ score }) {
  if (score === null || score === undefined) return <span className="text-slate-300 text-[12px]">—</span>
  const color = score >= 80 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : score >= 50 ? 'bg-amber-50 text-amber-700 ring-amber-200'
              :               'bg-red-50 text-red-700 ring-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ring-inset ${color}`}>
      {score}%
    </span>
  )
}

function StatusPill({ finalized }) {
  return finalized
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Completado
      </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Borrador
      </span>
}

function FormTypeBadge({ meta }) {
  const I = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium ${meta.colorLight}`}>
      <I size={11} />{meta.shortLabel}
    </span>
  )
}

export default function Submissions() {
  const load            = useSubmissionsStore((s) => s.load)
  const isLoading       = useSubmissionsStore((s) => s.isLoading)
  const submissions     = useSubmissionsStore((s) => s.submissions)
  const filterFormCode  = useSubmissionsStore((s) => s.filterFormCode)
  const search          = useSubmissionsStore((s) => s.search)
  const setFilter       = useSubmissionsStore((s) => s.setFilter)
  const getFiltered     = useSubmissionsStore((s) => s.getFiltered)
  const loadOrders      = useOrdersStore((s) => s.load)
  const orders          = useOrdersStore((s) => s.orders)
  const navigate        = useNavigate()

  useEffect(() => { load(); loadOrders() }, [])

  const filtered = useMemo(
    () => getFiltered().filter(s => isFormVisible(s.form_code)),
    [submissions, filterFormCode, search]
  )

  const orderMap = useMemo(() => {
    const map = {}
    for (const o of orders) map[o.id] = o.order_number || o.id.slice(0, 8)
    return map
  }, [orders])

  const hasFilter = search || filterFormCode !== 'all'

  return (
    <div className="space-y-5">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-bold text-slate-900">Formularios</h1>
          <span className="text-[12px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text" value={search}
            onChange={e => setFilter({ search: e.target.value })}
            placeholder="Buscar por sitio, inspector..."
            className="w-full h-9 pl-9 pr-3 text-[13px] bg-white border border-slate-200 rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setFilter({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
            className="h-9 px-3 text-[13px] text-slate-500 hover:text-slate-700 bg-white border border-slate-200
              rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
            <X size={13} />Limpiar
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner size={16} />
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2.5fr_1fr_1.5fr_1fr_1fr_auto] gap-0 border-b border-slate-100 bg-slate-50/60 px-0">
            {['Tipo', 'Sitio', 'Orden', 'Inspector', 'Fecha', 'Estado', ''].map((h, i) => (
              <div key={i} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50">
            {filtered.map(sub => {
              const m         = getFormMeta(sub.form_code)
              const site      = extractSiteInfo(sub)
              const who       = extractSubmittedBy(sub)
              const inspMeta  = extractMeta(sub)
              const fin       = sub.finalized || isFinalized(sub)
              const score     = getScore(sub)

              let startDate = '', startTime = ''
              const startedAt = inspMeta.startedAt || ''
              if (startedAt) { const parts = startedAt.split(' '); startDate = parts[0] || ''; startTime = parts[1] || '' }
              if (!startDate && sub.created_at) {
                const d = new Date(sub.created_at)
                startDate = d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' })
                startTime = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
              }

              const visitId  = sub.site_visit_id
              const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

              return (
                <div key={sub.id}
                  onClick={() => navigate(`/submissions/${sub.id}`)}
                  className="grid grid-cols-[2fr_2.5fr_1fr_1.5fr_1fr_1fr_auto] items-center gap-0
                    hover:bg-indigo-50/30 cursor-pointer transition-colors group">

                  {/* Tipo */}
                  <div className="px-4 py-3.5">
                    <FormTypeBadge meta={m} />
                  </div>

                  {/* Sitio */}
                  <div className="px-4 py-3.5 min-w-0">
                    <div className="text-[13px] font-medium text-slate-800 truncate">
                      {site.nombreSitio || <span className="text-slate-400">Sin nombre</span>}
                    </div>
                    {site.idSitio && (
                      <div className="text-[11px] text-slate-400 mt-0.5">ID: {site.idSitio}</div>
                    )}
                  </div>

                  {/* Orden */}
                  <div className="px-4 py-3.5 hidden md:block">
                    {hasOrder
                      ? <Link to={`/orders/${visitId}`} onClick={e => e.stopPropagation()}
                          className="text-[12px] text-indigo-500 hover:text-indigo-700 font-medium hover:underline">
                          {orderMap[visitId] || '--'}
                        </Link>
                      : <span className="text-[12px] text-slate-300">—</span>}
                  </div>

                  {/* Inspector */}
                  <div className="px-4 py-3.5 hidden md:block">
                    <div className="text-[13px] text-slate-600 truncate">{who?.name || '—'}</div>
                  </div>

                  {/* Fecha */}
                  <div className="px-4 py-3.5 hidden lg:block">
                    <div className="text-[13px] text-slate-600">{startDate}</div>
                    {startTime && <div className="text-[11px] text-slate-400">{startTime}</div>}
                  </div>

                  {/* Estado + Score */}
                  <div className="px-4 py-3.5 flex flex-col gap-1.5">
                    <StatusPill finalized={fin} />
                    <ScorePill score={score} />
                  </div>

                  {/* Arrow */}
                  <div className="px-3 py-3.5">
                    <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-sm">
          <div className="text-[14px] font-medium text-slate-500 mb-1">Sin resultados</div>
          <div className="text-[12px] text-slate-400">
            {hasFilter ? 'Ajusta los filtros para ver más.' : 'Aún no hay formularios registrados.'}
          </div>
        </div>
      )}
    </div>
  )
}
