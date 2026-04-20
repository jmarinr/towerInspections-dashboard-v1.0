/**
 * useInspectorQualityReport.js
 * Combina site_visits + submissions para calcular métricas de calidad por inspector.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { extractRegion, regionLabel } from '../utils/regionUtils'

const REQUIRED_FORMS = ['mantenimiento','mantenimiento-ejecutado','inventario-v2','sistema-ascenso','additional-photo-report','puesta-tierra']

export default function useInspectorQualityReport() {
  const [visits,    setVisits]    = useState([])
  const [subs,      setSubs]      = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)
  const [filterOrg, setFilterOrg] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize]  = useState(10)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const user    = useAuthStore.getState().user
    const orgCode = user?.role === 'supervisor' ? user?.company?.org_code : null
    let vQuery = supabase.from('site_visits').select('id, inspector_username, inspector_name, org_code, status, started_at, closed_at')
    let sQuery = supabase.from('submissions').select('id, site_visit_id, form_code, finalized, org_code')
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

  const inspectors = useMemo(() => {
    // Map submissions by visit
    const subsByVisit = {}
    for (const s of subs) {
      if (!subsByVisit[s.site_visit_id]) subsByVisit[s.site_visit_id] = []
      subsByVisit[s.site_visit_id].push(s)
    }

    // Aggregate by inspector
    const map = {}
    for (const v of visits) {
      const key = v.inspector_username || v.inspector_name || 'desconocido'
      if (!map[key]) map[key] = {
        username: v.inspector_username,
        name:     v.inspector_name || v.inspector_username || '—',
        orgCode:  v.org_code,
        orders:   0, closed: 0,
        totalForms: 0, finalizedForms: 0,
        ordersWithAllForms: 0,
        avgDaysOpen: [],
      }
      const ins = map[key]
      ins.orders++
      if (v.status === 'closed') ins.closed++
      const vReg = extractRegion(v.order_number)
      if (vReg && !ins.regions) ins.regions = new Set()
      if (vReg) ins.regions.add(vReg)

      // Days open (for open orders)
      if (v.status === 'open' && v.started_at) {
        const days = Math.floor((Date.now() - new Date(v.started_at)) / 86400000)
        ins.avgDaysOpen.push(days)
      }

      // Form completeness per visit
      const visitSubs = subsByVisit[v.id] || []
      // Deduplicate by form_code — keep finalized if any
      const byCode = {}
      for (const sub of visitSubs) {
        if (!byCode[sub.form_code] || sub.finalized) byCode[sub.form_code] = sub
      }
      const codes   = Object.keys(byCode)
      const finCnt  = Object.values(byCode).filter(s => s.finalized).length
      ins.totalForms     += codes.length
      ins.finalizedForms += finCnt

      const hasAllRequired = REQUIRED_FORMS.every(fc =>
        byCode[fc] && byCode[fc].finalized
      )
      if (hasAllRequired) ins.ordersWithAllForms++
    }

    return Object.values(map).map(ins => {
      const closureRate    = ins.orders ? Math.round(ins.closed / ins.orders * 100) : 0
      const formRate       = ins.totalForms ? Math.round(ins.finalizedForms / ins.totalForms * 100) : 0
      const completionRate = ins.orders ? Math.round(ins.ordersWithAllForms / ins.orders * 100) : 0
      const qualityScore   = Math.round((closureRate * 0.4) + (formRate * 0.4) + (completionRate * 0.2))
      const avgDaysOpenVal = ins.avgDaysOpen.length
        ? Math.round(ins.avgDaysOpen.reduce((a,b)=>a+b,0) / ins.avgDaysOpen.length) : null
      return {
        ...ins,
        closureRate, formRate, completionRate, qualityScore, avgDaysOpenVal,
        openOrders: ins.orders - ins.closed,
      }
    }).sort((a, b) => b.qualityScore - a.qualityScore)
  }, [visits, subs])

  const orgs     = useMemo(() => [...new Set(inspectors.map(i => i.orgCode).filter(Boolean))].sort(), [inspectors])
  const [filterRegion, setFilterRegion] = useState('')
  const regions  = useMemo(() => {
    const all = new Set()
    inspectors.forEach(i => i.regions?.forEach(r => all.add(r)))
    return [...all].sort()
  }, [inspectors])

  const filtered = useMemo(() =>
    inspectors.filter(i => {
      if (filterOrg    && i.orgCode !== filterOrg)              return false
      if (filterRegion && !(i.regions?.has(filterRegion)))      return false
      return true
    }),
    [inspectors, filterOrg, filterRegion]
  )

  const kpis = useMemo(() => {
    const real = filtered.filter(i => !i.username?.includes('henkancx') && i.orders > 0)
    if (!real.length) return { avg: 0, top: null, bottom: null, avgClosure: 0 }
    const avg = Math.round(real.reduce((a,b) => a + b.qualityScore, 0) / real.length)
    const avgClosure = Math.round(real.reduce((a,b) => a + b.closureRate, 0) / real.length)
    return {
      avg, avgClosure,
      top:    real[0],
      bottom: real[real.length - 1],
    }
  }, [filtered])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const setFilter = useCallback((key, val) => {
    if (key === 'org')    { setFilterOrg(val);    setCurrentPage(1) }
    if (key === 'region') { setFilterRegion(val); setCurrentPage(1) }
  }, [])

  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = filtered.map(i => ({
        'Inspector':              i.name,
        'Usuario':                i.username,
        'Organización':           i.orgCode,
        'Órdenes Totales':        i.orders,
        'Órdenes Cerradas':       i.closed,
        'Órdenes Abiertas':       i.openOrders,
        'Tasa Cierre (%)':        i.closureRate,
        'Formularios Totales':    i.totalForms,
        'Formularios Finalizados': i.finalizedForms,
        'Tasa Forms (%)':         i.formRate,
        'Órdenes Completas (%)':  i.completionRate,
        'Score Calidad':          i.qualityScore,
        'Días Prom. Orden Abierta': i.avgDaysOpenVal ?? '—',
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = Array(13).fill({ wch: 20 })
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Calidad Inspectores')
      writeFile(wb, `calidad_inspectores_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) { console.error(e) }
  }, [filtered])

  return {
    inspectors, filtered, paginated, kpis, orgs,
    filterOrg, filterRegion, setFilter, regions,
    currentPage, setCurrentPage, pageSize,
    totalFiltered: filtered.length,
    exportToExcel,
    isLoading, error,
  }
}
