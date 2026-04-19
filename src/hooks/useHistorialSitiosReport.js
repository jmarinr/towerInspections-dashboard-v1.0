/**
 * useHistorialSitiosReport.js
 * Sitios con múltiples visitas — progresión de completitud entre visitas.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'

export default function useHistorialSitiosReport() {
  const [visits,    setVisits]    = useState([])
  const [subs,      setSubs]      = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [filterOrg, setFilterOrg] = useState('')
  const [filterMin, setFilterMin] = useState(2)  // visitas mínimas
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize]  = useState(10)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const user    = useAuthStore.getState().user
    const orgCode = user?.role === 'supervisor' ? user?.company?.org_code : null
    let vQuery = supabase.from('site_visits').select('id, site_id, site_name, org_code, status, started_at, closed_at, inspector_username, inspector_name').order('started_at', { ascending: true })
    let sQuery = supabase.from('submissions').select('id, site_visit_id, form_code, finalized')
    if (orgCode) { vQuery = vQuery.eq('org_code', orgCode); sQuery = sQuery.eq('org_code', orgCode) }
    Promise.all([vQuery, sQuery]).then(([{ data: v, error: ve }, { data: s, error: se }]) => {
      if (cancelled) return
      if (ve || se) { setError((ve || se).message); setIsLoading(false); return }
      setVisits(v || [])
      setSubs(s   || [])
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const sites = useMemo(() => {
    // Map subs by visit
    const subsByVisit = {}
    for (const s of subs) {
      if (!subsByVisit[s.site_visit_id]) subsByVisit[s.site_visit_id] = []
      subsByVisit[s.site_visit_id].push(s)
    }

    // Group visits by site_id
    const siteMap = {}
    for (const v of visits) {
      const key = v.site_id || v.id
      if (!siteMap[key]) siteMap[key] = { siteId: v.site_id, siteName: v.site_name, orgCode: v.org_code, visits: [] }
      const visitSubs = subsByVisit[v.id] || []
      const byCode = {}
      for (const s of visitSubs) {
        if (!byCode[s.form_code] || s.finalized) byCode[s.form_code] = s
      }
      const totalForms = Object.keys(byCode).length
      const finForms   = Object.values(byCode).filter(s => s.finalized).length
      siteMap[key].visits.push({
        visitId:     v.id,
        orderNumber: null,
        status:      v.status,
        startedAt:   v.started_at,
        closedAt:    v.closed_at,
        inspector:   v.inspector_name || v.inspector_username || '—',
        totalForms,
        finForms,
        rate:        totalForms ? Math.round(finForms / totalForms * 100) : 0,
      })
    }

    return Object.values(siteMap)
      .filter(s => s.visits.length >= 1)
      .map(s => {
        const vCount = s.visits.length
        const lastV  = s.visits[vCount - 1]
        const firstV = s.visits[0]
        const improvement = vCount >= 2
          ? lastV.rate - firstV.rate
          : null
        return { ...s, vCount, lastV, firstV, improvement }
      })
      .sort((a, b) => b.vCount - a.vCount)
  }, [visits, subs])

  const orgs = useMemo(() => [...new Set(sites.map(s => s.orgCode).filter(Boolean))].sort(), [sites])

  const filtered = useMemo(() =>
    sites.filter(s => {
      if (s.vCount < filterMin)                        return false
      if (filterOrg && s.orgCode !== filterOrg)        return false
      if (search) {
        const q = search.toLowerCase()
        return s.siteId?.toLowerCase().includes(q) || s.siteName?.toLowerCase().includes(q)
      }
      return true
    }),
    [sites, filterMin, filterOrg, search]
  )

  const kpis = useMemo(() => {
    const multiSite = filtered.filter(s => s.vCount >= 2)
    const improved  = multiSite.filter(s => s.improvement > 0).length
    const declined  = multiSite.filter(s => s.improvement < 0).length
    return {
      totalSites:  filtered.length,
      multiVisit:  multiSite.length,
      singleVisit: filtered.filter(s => s.vCount === 1).length,
      improved, declined, stable: multiSite.length - improved - declined,
    }
  }, [filtered])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const setFilter = useCallback((key, val) => {
    if (key === 'org')    { setFilterOrg(val);  setCurrentPage(1) }
    if (key === 'min')    { setFilterMin(val);   setCurrentPage(1) }
    if (key === 'search') { setSearch(val);      setCurrentPage(1) }
  }, [])

  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = []
      for (const s of filtered) {
        s.visits.forEach((v, idx) => {
          rows.push({
            'Sitio ID':    s.siteId,
            'Nombre':      s.siteName,
            'Org':         s.orgCode,
            'Visita #':    idx + 1,
            'Total Visitas': s.vCount,
            'Estado':      v.status,
            'Fecha':       v.startedAt ? new Date(v.startedAt).toLocaleDateString('es') : '—',
            'Inspector':   v.inspector,
            'Forms Total': v.totalForms,
            'Finalizados': v.finForms,
            'Completitud (%)': v.rate,
            'Mejora vs V1': idx === 0 ? '—' : `${v.rate - s.firstV.rate > 0 ? '+' : ''}${v.rate - s.firstV.rate}%`,
          })
        })
      }
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = Array(12).fill({ wch: 18 })
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Historial Sitios')
      writeFile(wb, `historial_sitios_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) { console.error(e) }
  }, [filtered])

  return {
    sites, filtered, paginated, kpis, orgs,
    filterOrg, filterMin, search, setFilter,
    currentPage, setCurrentPage, pageSize,
    totalFiltered: filtered.length,
    exportToExcel,
    isLoading, error,
  }
}
