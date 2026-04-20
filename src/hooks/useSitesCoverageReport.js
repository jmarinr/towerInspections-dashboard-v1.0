/**
 * useSitesCoverageReport.js
 * Agrupa site_visits por site_id y calcula días desde la última actividad.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { extractRegion, regionLabel } from '../utils/regionUtils'

const THRESHOLD_WARN    = 14  // días sin visita → amarillo
const THRESHOLD_ALERT   = 21  // días sin visita → rojo

function daysSince(isoStr) {
  if (!isoStr) return null
  const ms = Date.now() - new Date(isoStr).getTime()
  return Math.floor(ms / 86400000)
}

function statusFromDays(days) {
  if (days === null) return 'unknown'
  if (days <= THRESHOLD_WARN)  return 'ok'
  if (days <= THRESHOLD_ALERT) return 'warn'
  return 'alert'
}

export default function useSitesCoverageReport() {
  const [rawVisits,  setRawVisits]  = useState([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState(null)
  const [filterOrg,  setFilterOrg]  = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [search,     setSearch]     = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize]   = useState(15)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    const user    = useAuthStore.getState().user
    const orgCode = user?.role === 'supervisor' ? user?.company?.org_code : null
    let query = supabase
      .from('site_visits')
      .select('id, site_id, site_name, org_code, status, started_at, closed_at, inspector_username, inspector_name, order_number')
      .order('started_at', { ascending: false })
    if (orgCode) query = query.eq('org_code', orgCode)
    query.then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }
        setRawVisits(data || [])
        setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Agrupar por site_id → tomar la más reciente
  const sites = useMemo(() => {
    const map = {}
    for (const v of rawVisits) {
      const key = v.site_id || v.id
      if (!map[key]) {
        map[key] = {
          siteId:      v.site_id,
          siteName:    v.site_name,
          orgCode:     v.org_code,
          visits:      0,
          closedVisits: 0,
          lastActivity: null,
          lastInspector: null,
          hasOpenVisit: false,
        lastOrderNumber: null,
        }
      }
      const s = map[key]
      s.visits++
      if (v.status === 'closed') {
        s.closedVisits++
        const dt = v.closed_at || v.started_at
        if (!s.lastActivity || dt > s.lastActivity) {
          s.lastActivity   = dt
          s.lastInspector  = v.inspector_name || v.inspector_username
          s.lastOrderNumber = v.order_number
        }
      } else {
        s.hasOpenVisit = true
        if (!s.lastActivity || v.started_at > s.lastActivity) {
          s.lastActivity  = v.started_at
          s.lastInspector = v.inspector_name || v.inspector_username
        }
      }
    }
    return Object.values(map).map(s => {
      const days   = daysSince(s.lastActivity)
      const status = s.hasOpenVisit ? 'in_progress' : statusFromDays(days)
      return { ...s, days, status, region: extractRegion(s.lastOrderNumber) }
    })
  }, [rawVisits])

  // Filtros
  const orgs    = useMemo(() => [...new Set(sites.map(s => s.orgCode).filter(Boolean))].sort(), [sites])
  const regions = useMemo(() => [...new Set(sites.map(s => s.region).filter(Boolean))].sort(), [sites])

  const filtered = useMemo(() => {
    return sites
      .filter(s => {
        if (filterOrg    && s.orgCode !== filterOrg)          return false
        if (filterStatus && s.status  !== filterStatus)       return false
        if (filterRegion && s.region  !== filterRegion)       return false
        if (search) {
          const q = search.toLowerCase()
          return s.siteId?.toLowerCase().includes(q) || s.siteName?.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => (b.days ?? -1) - (a.days ?? -1))
  }, [sites, filterOrg, filterStatus, search])

  // KPIs — calculan sobre filtered para reaccionar a los filtros activos
  const kpis = useMemo(() => {
    const total   = filtered.length
    const inProg  = filtered.filter(s => s.status === 'in_progress').length
    const ok      = filtered.filter(s => s.status === 'ok').length
    const warn    = filtered.filter(s => s.status === 'warn').length
    const alert   = filtered.filter(s => s.status === 'alert').length
    const avgDays = filtered.filter(s => s.days !== null).reduce((a, b) => a + b.days, 0) / (filtered.filter(s => s.days !== null).length || 1)
    return { total, inProg, ok, warn, alert, avgDays: Math.round(avgDays) }
  }, [filtered])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const setFilter = useCallback((key, val) => {
    if (key === 'org')    { setFilterOrg(val);    setCurrentPage(1) }
    if (key === 'status') { setFilterStatus(val); setCurrentPage(1) }
    if (key === 'region') { setFilterRegion(val);  setCurrentPage(1) }
    if (key === 'search') { setSearch(val);        setCurrentPage(1) }
  }, [])

  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = filtered.map(s => ({
        'Sitio ID':          s.siteId,
        'Nombre Sitio':      s.siteName,
        'Organización':      s.orgCode,
        'Visitas Totales':   s.visits,
        'Visitas Cerradas':  s.closedVisits,
        'Última Actividad':  s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('es') : '—',
        'Días sin actividad': s.days ?? '—',
        'Estado':            s.status,
        'Último Inspector':  s.lastInspector || '—',
        'Orden Abierta':     s.hasOpenVisit ? 'Sí' : 'No',
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = Array(10).fill({ wch: 18 })
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Cobertura Sitios')
      writeFile(wb, `cobertura_sitios_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) { console.error(e) }
  }, [filtered])

  return {
    sites, filtered, paginated, kpis, orgs,
    filterOrg, filterStatus, filterRegion, search, setFilter,
    regions,
    currentPage, setCurrentPage, pageSize,
    totalFiltered: filtered.length,
    exportToExcel,
    isLoading, error,
    THRESHOLD_WARN, THRESHOLD_ALERT,
  }
}
