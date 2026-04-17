/**
 * useProductivityReport.js
 * Reporte de Productividad por Orden.
 * – Duración de orden: site_visits.closed_at − started_at
 * – Duración de formulario: payload.data.meta.finishedAt − startedAt
 * – Benchmarks históricos calculados sobre TODOS los submissions finalizados
 * – Inspector: site_visits.inspector_name / inspector_username (único por visita)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { normalizeFormCode, getFormMeta } from '../data/formTypes'
import {
  getQuarterOptions, getCurrentQuarterOption, isInQuarter, getQuarterKey,
} from '../utils/quarterUtils'

// ── Umbrales ajustables — cambiar cuando se definan estándares oficiales ──────
export const SEMAFORO_THRESHOLDS = { YELLOW: 0.20, RED: 0.50 }
export const MIN_BENCHMARK_SAMPLES = 3

// ── Helpers de tiempo ──────────────────────────────────────────────────────────
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function getOrderDuration(visit) {
  if (!visit.started_at || !visit.closed_at) return null
  const ms = new Date(visit.closed_at) - new Date(visit.started_at)
  return ms > 0 ? Math.round(ms / 60000) : null
}

// Extrae timing desde el payload JSON del submission
function resolveFormTiming(submission) {
  const outer = submission.payload || {}
  const inner = outer.payload || outer
  const data  = inner.data    || inner
  const meta  = data.meta     || {}

  const submittedBy = inner.submitted_by || data.submitted_by || null

  return {
    startedAt:   meta.startedAt  || null,
    finishedAt:  meta.finishedAt || inner.submitted_at || null,
    submittedBy: submittedBy ? {
      name:     submittedBy.name     || submittedBy.username || null,
      username: submittedBy.username || null,
    } : null,
  }
}

function getFormDuration(timing) {
  if (!timing?.startedAt || !timing?.finishedAt) return null
  const ms = new Date(timing.finishedAt) - new Date(timing.startedAt)
  return ms > 0 ? Math.round(ms / 60000) : null
}

function getSemaforo(actualMinutes, benchmark) {
  if (!actualMinutes || !benchmark) return null
  if (benchmark.sampleCount < MIN_BENCHMARK_SAMPLES) return null
  const ratio = (actualMinutes - benchmark.avgMinutes) / benchmark.avgMinutes
  if (ratio <= SEMAFORO_THRESHOLDS.YELLOW) return 'green'
  if (ratio <= SEMAFORO_THRESHOLDS.RED)    return 'yellow'
  return 'red'
}

function makeInspector(name, username) {
  const display  = name || username || '—'
  const initials = display
    .split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
  return { name: display, initials }
}

function formatTime(isoStr) {
  if (!isoStr) return null
  return new Date(isoStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ── Calcula benchmarks sobre todos los submissions ─────────────────────────────
function calculateBenchmarks(submissions) {
  const groups = {}
  submissions.forEach(sub => {
    const timing = resolveFormTiming(sub)
    const dur    = getFormDuration(timing)
    if (!dur || dur <= 0) return
    const key = normalizeFormCode(sub.form_code) || sub.form_code
    if (!groups[key]) groups[key] = []
    groups[key].push(dur)
  })
  const benchmarks = {}
  Object.entries(groups).forEach(([code, durations]) => {
    benchmarks[code] = {
      avgMinutes:  Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      sampleCount: durations.length,
    }
  })
  return benchmarks
}

// ── Normaliza una visita + sus submissions en el modelo del reporte ────────────
function normalizeOrder(visit, subs, benchmarks) {
  const inspector = makeInspector(visit.inspector_name, visit.inspector_username)
  const duration  = getOrderDuration(visit)

  const forms = subs.map(sub => {
    const timing    = resolveFormTiming(sub)
    const dur       = getFormDuration(timing)
    const canonical = normalizeFormCode(sub.form_code) || sub.form_code
    const benchmark = benchmarks[canonical] || null
    const meta      = getFormMeta(canonical)

    const subInspector = timing.submittedBy
      ? makeInspector(timing.submittedBy.name, timing.submittedBy.username)
      : inspector

    return {
      submissionId: sub.id,
      formCode:     canonical,
      formLabel:    meta.label || canonical,
      inspector:    subInspector,
      startTime:    formatTime(timing.startedAt),
      endTime:      formatTime(timing.finishedAt),
      duration:     dur,
      durationStr:  formatDuration(dur),
      benchmark,
      benchmarkStr: benchmark ? `~${formatDuration(benchmark.avgMinutes)}` : null,
      semaforo:     getSemaforo(dur, benchmark),
    }
  })

  const date = visit.started_at
    ? new Date(visit.started_at).toLocaleDateString('es',
        { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return {
    orderId:          visit.id,
    orderNumber:      visit.order_number,
    idSitio:          visit.site_id   || '',
    siteName:         visit.site_name || '',
    quarterKey:       visit.started_at ? getQuarterKey(visit.started_at) : null,
    date,
    orderStartedAt:   visit.started_at,
    inspector,
    orderDuration:    duration,
    orderDurationStr: formatDuration(duration),
    isInProgress:     !visit.closed_at,
    formCount:        forms.length,
    forms,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useProductivityReport() {
  const [allOrders,       setAllOrders]       = useState([])
  const [benchmarks,      setBenchmarks]      = useState({})
  const [isLoading,       setIsLoading]       = useState(true)
  const [error,           setError]           = useState(null)
  const [selectedQuarter, setSelectedQuarter] = useState(null)
  const [filters,         setFiltersState]    = useState({ inspector: '', site: '', formType: '' })
  const [currentPage,     setCurrentPageState] = useState(1)
  const [pageSize,        setPageSizeState]   = useState(10)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      supabase
        .from('site_visits')
        .select('id, order_number, site_id, site_name, started_at, closed_at, inspector_name, inspector_username, status')
        .order('started_at', { ascending: false }),
      supabase
        .from('submissions')
        .select('id, site_visit_id, form_code, payload')
        .eq('finalized', true),
    ]).then(([{ data: visits, error: vErr }, { data: subs, error: sErr }]) => {
      if (cancelled) return
      if (vErr || sErr) { setError((vErr || sErr).message); setIsLoading(false); return }

      // Agrupar submissions por site_visit_id
      const subsByVisit = {}
      for (const sub of (subs || [])) {
        if (!subsByVisit[sub.site_visit_id]) subsByVisit[sub.site_visit_id] = []
        subsByVisit[sub.site_visit_id].push(sub)
      }

      // Calcular benchmarks sobre TODOS los submissions
      const bm = calculateBenchmarks(subs || [])
      setBenchmarks(bm)

      // Normalizar órdenes
      const orders = (visits || [])
        .filter(v => v.started_at)
        .map(v => normalizeOrder(v, subsByVisit[v.id] || [], bm))

      setAllOrders(orders)
      setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // ── Quarter options ────────────────────────────────────────────────────────
  const quarterOptions = useMemo(() =>
    getQuarterOptions(allOrders.map(o => o.orderStartedAt).filter(Boolean)),
    [allOrders]
  )

  useEffect(() => {
    if (quarterOptions.length > 0 && !selectedQuarter)
      setSelectedQuarter(getCurrentQuarterOption(quarterOptions))
  }, [quarterOptions])

  const quarterFilteredOrders = useMemo(() =>
    selectedQuarter
      ? allOrders.filter(o => isInQuarter(o.orderStartedAt, selectedQuarter))
      : allOrders,
    [allOrders, selectedQuarter]
  )

  // ── KPIs — sobre el cuatrimestre ───────────────────────────────────────────
  const totalOrders = quarterFilteredOrders.length

  const avgOrderDuration = useMemo(() => {
    const durations = quarterFilteredOrders.map(o => o.orderDuration).filter(d => d > 0)
    if (!durations.length) return '—'
    return formatDuration(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length))
  }, [quarterFilteredOrders])

  const avgFormDuration = useMemo(() => {
    const durs = quarterFilteredOrders.flatMap(o => o.forms.map(f => f.duration).filter(d => d > 0))
    if (!durs.length) return '—'
    return formatDuration(Math.round(durs.reduce((a, b) => a + b, 0) / durs.length))
  }, [quarterFilteredOrders])

  const slowestFormType = useMemo(() => {
    const groups = {}
    quarterFilteredOrders.forEach(o =>
      o.forms.forEach(f => {
        if (!f.duration) return
        if (!groups[f.formCode]) groups[f.formCode] = { label: f.formLabel, durs: [] }
        groups[f.formCode].durs.push(f.duration)
      })
    )
    let slowest = null
    Object.values(groups).forEach(g => {
      const avg = g.durs.reduce((a, b) => a + b, 0) / g.durs.length
      if (!slowest || avg > slowest.avg) slowest = { label: g.label, avg, avgStr: formatDuration(Math.round(avg)) }
    })
    return slowest || { label: '—', avgStr: '—' }
  }, [quarterFilteredOrders])

  const topInspector = useMemo(() => {
    const counts = {}
    quarterFilteredOrders.forEach(o => {
      const key = o.inspector.name
      counts[key] = (counts[key] || 0) + 1
    })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? { name: top[0], orderCount: top[1] } : { name: '—', orderCount: 0 }
  }, [quarterFilteredOrders])

  // ── Filter options ─────────────────────────────────────────────────────────
  const filterOptions = useMemo(() => ({
    inspectors: [...new Set(quarterFilteredOrders.map(o => o.inspector.name).filter(Boolean))].sort(),
    sites:      [...new Set(quarterFilteredOrders.map(o => o.idSitio).filter(Boolean))].sort(),
    formTypes:  [...new Set(quarterFilteredOrders.flatMap(o => o.forms.map(f => f.formLabel)).filter(Boolean))].sort(),
  }), [quarterFilteredOrders])

  // ── Filtrado en memoria ────────────────────────────────────────────────────
  const filteredOrders = useMemo(() =>
    quarterFilteredOrders.filter(o => {
      if (filters.inspector && o.inspector.name !== filters.inspector)         return false
      if (filters.site      && o.idSitio          !== filters.site)            return false
      if (filters.formType  && !o.forms.some(f => f.formLabel === filters.formType)) return false
      return true
    }),
    [quarterFilteredOrders, filters]
  )

  const totalFiltered = filteredOrders.length

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredOrders.slice(start, start + pageSize)
  }, [filteredOrders, currentPage, pageSize])

  // ── Setters ────────────────────────────────────────────────────────────────
  const setFilter = useCallback((key, val) => {
    setFiltersState(p => ({ ...p, [key]: val }))
    setCurrentPageState(1)
  }, [])
  const setCurrentPage    = useCallback(p => setCurrentPageState(p), [])
  const setPageSize       = useCallback(size => { setPageSizeState(size); setCurrentPageState(1) }, [])
  const handleSetQuarter  = useCallback(opt  => { setSelectedQuarter(opt); setCurrentPageState(1) }, [])

  // ── Export Excel — una fila por formulario ─────────────────────────────────
  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = quarterFilteredOrders.flatMap(o =>
        o.forms.length > 0
          ? o.forms.map(f => ({
              'Orden':                    o.orderNumber,
              'Sitio':                    o.idSitio,
              'Cuatrimestre':             selectedQuarter?.label || '',
              'Fecha':                    o.date || '',
              'Inspector Orden':          o.inspector.name,
              'Duración Total Orden (min)': o.orderDuration ?? '',
              'Formulario':               f.formLabel,
              'Inspector Formulario':     f.inspector.name,
              'Hora Inicio':              f.startTime  || '',
              'Hora Fin':                 f.endTime    || '',
              'Duración Form. (min)':     f.duration   ?? '',
              'Duración Formateada':      f.durationStr,
              'Ref. Histórico (min)':     f.benchmark?.avgMinutes ?? '',
              'N Muestras Ref.':          f.benchmark?.sampleCount ?? '',
              'Semáforo':                 f.semaforo   || '',
            }))
          : [{
              'Orden': o.orderNumber, 'Sitio': o.idSitio,
              'Cuatrimestre': selectedQuarter?.label || '', 'Fecha': o.date || '',
              'Inspector Orden': o.inspector.name,
              'Duración Total Orden (min)': o.orderDuration ?? '',
              'Formulario': '', 'Inspector Formulario': '', 'Hora Inicio': '',
              'Hora Fin': '', 'Duración Form. (min)': '', 'Duración Formateada': '',
              'Ref. Histórico (min)': '', 'N Muestras Ref.': '', 'Semáforo': '',
            }]
      )
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
        { wch: 20 }, { wch: 22 }, { wch: 32 }, { wch: 20 },
        { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 16 },
        { wch: 18 }, { wch: 14 }, { wch: 10 },
      ]
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Productividad')
      writeFile(wb, `productividad_${selectedQuarter?.value || 'all'}_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch (e) { console.error('[exportToExcel productivity]', e) }
  }, [quarterFilteredOrders, selectedQuarter])

  return {
    allOrders, filteredOrders, paginatedOrders,
    totalOrders, avgOrderDuration, avgFormDuration, slowestFormType, topInspector,
    benchmarks,
    quarterOptions, selectedQuarter, setSelectedQuarter: handleSetQuarter,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    exportToExcel,
    isLoading, error,
  }
}
