/**
 * useSlaReport.js
 * Tiempo de vida de órdenes — abiertas envejecidas y distribución de duración de cerradas.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { extractRegion, regionLabel } from '../utils/regionUtils'
import { getQuarterOptions, getCurrentQuarterOption, isInQuarter, getQuarterKey } from '../utils/quarterUtils'

const SLA_WARN_DAYS  = 3   // abiertas >3 días → amarillo
const SLA_ALERT_DAYS = 7   // abiertas >7 días → rojo

export default function useSlaReport() {
  const [visits,      setVisits]      = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState(null)
  const [selectedQuarter, setSelectedQuarter] = useState(null)
  const [filterInspector, setFilterInspector] = useState('')
  const [filterStatus,    setFilterStatus]    = useState('')
  const [filterRegion,    setFilterRegion]    = useState('')
  const [currentPage,     setCurrentPage]     = useState(1)
  const [pageSize]        = useState(15)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const user    = useAuthStore.getState().user
    const orgCode = user?.role === 'supervisor' ? user?.company?.org_code : null
    let query = supabase
      .from('site_visits')
      .select('id, order_number, site_id, site_name, org_code, status, started_at, closed_at, inspector_username, inspector_name')
      .order('started_at', { ascending: false })
    if (orgCode) query = query.eq('org_code', orgCode)
    query.then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }
        setVisits(data || [])
        setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const quarterOptions = useMemo(() =>
    getQuarterOptions(visits.map(v => v.started_at).filter(Boolean)),
    [visits]
  )
  useEffect(() => {
    if (quarterOptions.length && !selectedQuarter)
      setSelectedQuarter(getCurrentQuarterOption(quarterOptions))
  }, [quarterOptions])

  const enriched = useMemo(() => visits.map(v => {
    const now         = Date.now()
    const startMs     = v.started_at ? new Date(v.started_at).getTime() : null
    const closeMs     = v.closed_at  ? new Date(v.closed_at).getTime()  : null
    const durationMin = (startMs && closeMs) ? Math.round((closeMs - startMs) / 60000) : null
    const ageHours    = startMs ? Math.round((now - startMs) / 3600000) : null
    const ageDays     = ageHours !== null ? Math.floor(ageHours / 24) : null

    let slaStatus = 'ok'
    if (v.status === 'open') {
      if (ageDays !== null && ageDays > SLA_ALERT_DAYS) slaStatus = 'alert'
      else if (ageDays !== null && ageDays > SLA_WARN_DAYS) slaStatus = 'warn'
      else slaStatus = 'ok'
    } else {
      slaStatus = 'closed'
    }

    return {
      ...v,
      durationMin,
      ageDays,
      ageHours,
      slaStatus,
      inspector:  v.inspector_name || v.inspector_username || '—',
      region:     extractRegion(v.order_number),
      quarterKey: v.started_at ? getQuarterKey(v.started_at) : null,
    }
  }), [visits])

  const quarterFiltered = useMemo(() =>
    selectedQuarter ? enriched.filter(v => isInQuarter(v.started_at, selectedQuarter)) : enriched,
    [enriched, selectedQuarter]
  )

  const inspectors = useMemo(() =>
    [...new Set(quarterFiltered.map(v => v.inspector).filter(v => v !== '—'))].sort(),
    [quarterFiltered]
  )
  const regions = useMemo(() =>
    [...new Set(quarterFiltered.map(v => v.region).filter(Boolean))].sort(),
    [quarterFiltered]
  )

  const filtered = useMemo(() =>
    quarterFiltered.filter(v => {
      if (filterInspector && v.inspector !== filterInspector) return false
      if (filterStatus === 'alert' && v.slaStatus !== 'alert') return false
      if (filterStatus === 'warn'  && v.slaStatus !== 'warn')  return false
      if (filterStatus === 'open'  && v.status    !== 'open')  return false
      if (filterStatus === 'closed'&& v.status    !== 'closed')return false
      if (filterRegion    && v.region    !== filterRegion)       return false
      return true
    }),
    [quarterFiltered, filterInspector, filterStatus, filterRegion]
  )

  const kpis = useMemo(() => {
    const open   = filtered.filter(v => v.status === 'open')
    const closed = filtered.filter(v => v.status === 'closed')
    const alert  = open.filter(v => v.slaStatus === 'alert').length
    const warn   = open.filter(v => v.slaStatus === 'warn').length
    const avgOpenDays   = open.length ? Math.round(open.reduce((a,b) => a + (b.ageDays || 0), 0) / open.length) : null
    const closedWithDur = closed.filter(v => v.durationMin && v.durationMin > 0)
    const avgClosedMin  = closedWithDur.length
      ? Math.round(closedWithDur.reduce((a,b) => a + b.durationMin, 0) / closedWithDur.length) : null
    const maxOpen = open.reduce((max, v) => (v.ageDays || 0) > (max?.ageDays || 0) ? v : max, null)
    return { open: open.length, closed: closed.length, alert, warn, avgOpenDays, avgClosedMin, maxOpen }
  }, [filtered])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Duration histogram buckets (for closed orders)
  const durationBuckets = useMemo(() => {
    const closed = filtered.filter(v => v.status === 'closed' && v.durationMin && v.durationMin > 0)
    const buckets = [
      { label: '<1h',    min: 0,    max: 60,   count: 0 },
      { label: '1-4h',   min: 60,   max: 240,  count: 0 },
      { label: '4-8h',   min: 240,  max: 480,  count: 0 },
      { label: '8-24h',  min: 480,  max: 1440, count: 0 },
      { label: '1-3d',   min: 1440, max: 4320, count: 0 },
      { label: '>3d',    min: 4320, max: Infinity, count: 0 },
    ]
    for (const v of closed) {
      const b = buckets.find(b => v.durationMin >= b.min && v.durationMin < b.max)
      if (b) b.count++
    }
    return buckets
  }, [quarterFiltered])

  const setFilter = useCallback((key, val) => {
    if (key === 'inspector') { setFilterInspector(val); setCurrentPage(1) }
    if (key === 'status')    { setFilterStatus(val);    setCurrentPage(1) }
    if (key === 'region')    { setFilterRegion(val);    setCurrentPage(1) }
  }, [])

  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = filtered.map(v => ({
        'Orden':         v.order_number,
        'Sitio':         v.site_id,
        'Nombre Sitio':  v.site_name,
        'Org':           v.org_code,
        'Estado':        v.status,
        'SLA Status':    v.slaStatus,
        'Inspector':     v.inspector,
        'Iniciada':      v.started_at ? new Date(v.started_at).toLocaleString('es') : '—',
        'Cerrada':       v.closed_at  ? new Date(v.closed_at).toLocaleString('es')  : '—',
        'Edad (días)':   v.ageDays ?? '—',
        'Duración (min)': v.durationMin ?? '—',
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = Array(11).fill({ wch: 18 })
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'SLA Órdenes')
      writeFile(wb, `sla_ordenes_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) { console.error(e) }
  }, [filtered])

  return {
    visits: filtered, paginated, kpis, inspectors, durationBuckets,
    quarterOptions, selectedQuarter, setSelectedQuarter: q => { setSelectedQuarter(q); setCurrentPage(1) },
    filterInspector, filterStatus, filterRegion, setFilter, regions,
    currentPage, setCurrentPage, pageSize,
    totalFiltered: filtered.length,
    exportToExcel,
    isLoading, error,
    SLA_WARN_DAYS, SLA_ALERT_DAYS,
  }
}
