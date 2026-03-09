import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { useOrdersStore } from '../store/useOrdersStore'
import { FORM_TYPES, getFormMeta, isFormVisible } from '../data/formTypes'
import { extractSiteInfo, extractMeta, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'

/** Compute checklist score for a submission */
function getScore(sub) {
  const p = sub?.payload?.payload || sub?.payload || {}
  const data = p.data || p
  const formType = sub?.form_code || sub?.form_type || p?.form_code || p?.form_type || ''

  // --- Standard checklist forms (Inspección General, Mant. Preventivo) ---
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

  // --- Puesta a Tierra: score por resistencia (Ω) ---
  // ≤5Ω = Bueno (100pts), ≤10Ω = Regular (50pts), >10Ω = Malo (0pts)
  if (formType === 'grounding-system-test' || formType === 'puesta-tierra') {
    const OHM_FIELDS = ['rPataTorre', 'rCerramiento', 'rPorton', 'rPararrayos', 'rBarraSPT', 'rEscalerilla1', 'rEscalerilla2']
    let total = 0, points = 0
    for (const field of OHM_FIELDS) {
      const val = parseFloat(data[field])
      if (isNaN(val) || val === 0) continue
      total++
      if (val <= 5) points += 100
      else if (val <= 10) points += 50
      // >10Ω = 0 pts (Malo)
    }
    if (total) return Math.round(points / total)
    return null
  }

  // --- Sistema de Ascenso: score por campos de status (Bueno/Regular/Malo) ---
  if (formType === 'safety-system' || formType === 'sistema-ascenso') {
    const STATUS_FIELDS = ['herrajeInferior', 'herrajeSuperior', 'estadoCable', 'estadoPrensacables', 'estadoEscalera']
    let total = 0, good = 0
    for (const field of STATUS_FIELDS) {
      const val = (data[field] || '').toLowerCase()
      if (!val) continue
      total++
      if (val === 'bueno' || val === 'good') good++
    }
    if (total) return Math.round((good / total) * 100)
    return null
  }

  // --- Mantenimiento Ejecutado: score por actividades con foto "after" ---
  if (formType === 'executed-maintenance' || formType === 'mantenimiento-ejecutado') {
    const activities = data.activities || data.actividades || {}
    const actKeys = Object.keys(activities)
    if (!actKeys.length) return null
    let total = 0, completed = 0
    for (const k of actKeys) {
      const act = activities[k]
      if (!act) continue
      total++
      // Una actividad se considera completa si tiene foto "after" o está marcada como completada
      if (act.photoAfter || act.fotoAfter || act.completed || act.completada) completed++
    }
    if (total) return Math.round((completed / total) * 100)
    return null
  }

  return null
}

function MiniScoreRing({ score }) {
  if (score === null) return null
  const size = 32, r = 12, c = 2 * Math.PI * r
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
  const offset = c - (score / 100) * c
  return (
    <svg width={size} height={size} className="block mx-auto">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 3.5} textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{score}%</text>
    </svg>
  )
}

export default function Submissions() {
  const load = useSubmissionsStore((s) => s.load)
  const isLoading = useSubmissionsStore((s) => s.isLoading)
  const submissions = useSubmissionsStore((s) => s.submissions)
  const filterFormCode = useSubmissionsStore((s) => s.filterFormCode)
  const search = useSubmissionsStore((s) => s.search)
  const setFilter = useSubmissionsStore((s) => s.setFilter)
  const getFiltered = useSubmissionsStore((s) => s.getFiltered)
  const loadOrders = useOrdersStore((s) => s.load)
  const orders = useOrdersStore((s) => s.orders)
  const navigate = useNavigate()
  useEffect(() => { load(); loadOrders() }, [])
  const filtered = useMemo(() => getFiltered().filter(s => isFormVisible(s.form_code)), [submissions, filterFormCode, search])

  // Build order_number lookup: visit_id → order_number
  const orderMap = useMemo(() => {
    const map = {}
    for (const o of orders) { map[o.id] = o.order_number || o.id.slice(0, 8) }
    return map
  }, [orders])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setFilter({ search: e.target.value })} placeholder="Buscar..."
            className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow bg-white" />
        </div>
        <select value={filterFormCode} onChange={e => setFilter({ filterFormCode: e.target.value })}
          className="h-8 px-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white">
          <option value="all">Todos los tipos</option>
          {Object.entries(FORM_TYPES).filter(([c]) => isFormVisible(c)).map(([c, m]) => <option key={c} value={c}>{m.label}</option>)}
        </select>
        <span className="text-2xs text-gray-400 hidden sm:block tabular-nums whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Spinner size={16} /></div>}

      {!isLoading && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Tipo</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Sitio</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden md:table-cell">Orden</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden md:table-cell">Inspector</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500 hidden lg:table-cell">Inicio</th>
                <th className="text-left px-3 py-2 text-2xs font-medium text-gray-500">Estado</th>
                <th className="text-center px-2 py-2 text-2xs font-medium text-gray-500 w-14 hidden sm:table-cell">Score</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const m = getFormMeta(sub.form_code)
                const site = extractSiteInfo(sub)
                const who = extractSubmittedBy(sub)
                const inspMeta = extractMeta(sub)
                const fin = sub.finalized || isFinalized(sub)
                const score = getScore(sub)

                // Start date/time from meta
                const startedAt = inspMeta.startedAt || ''
                let startDate = '', startTime = ''
                if (startedAt) {
                  const parts = startedAt.split(' ')
                  startDate = parts[0] || ''
                  startTime = parts[1] || ''
                }
                if (!startDate && sub.created_at) {
                  const d = new Date(sub.created_at)
                  startDate = d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
                  startTime = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                }

                // Order reference
                const visitId = sub.site_visit_id
                const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

                return (
                  <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors group" onClick={() => navigate(`/submissions/${sub.id}`)}>
                    <td className="px-3 py-2.5 text-sm text-gray-900 font-medium">{m.shortLabel}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-gray-700">{site.nombreSitio}</div>
                      {site.idSitio && <div className="text-2xs text-gray-400">ID: {site.idSitio}</div>}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {hasOrder
                        ? <Link to={`/orders/${visitId}`} onClick={e => e.stopPropagation()} className="text-2xs text-accent hover:underline font-medium">{orderMap[visitId] || '--'}</Link>
                        : <span className="text-2xs text-gray-300">--</span>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden md:table-cell">{who?.name || '--'}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <div className="text-sm text-gray-600">{startDate}</div>
                      {startTime && <div className="text-2xs text-gray-400">{startTime}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      {fin ? <span className="text-2xs font-medium text-success">Completado</span>
                           : <span className="text-2xs font-medium text-warning">Borrador</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <MiniScoreRing score={score} />
                    </td>
                    <td className="pr-3"><ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">{search || filterFormCode !== 'all' ? 'Sin resultados. Ajusta los filtros.' : 'Sin formularios aun.'}</div>
      )}
    </div>
  )
}
