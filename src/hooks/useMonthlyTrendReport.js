/**
 * useMonthlyTrendReport.js
 * Órdenes + formularios agrupados por mes — tendencia de volumen y completitud.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { extractRegion, regionLabel } from '../utils/regionUtils'

function toMonth(isoStr) {
  if (!isoStr) return null
  return isoStr.slice(0, 7)
}

function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${names[parseInt(m)-1]} ${y}`
}

export default function useMonthlyTrendReport() {
  const [visits,    setVisits]    = useState([])
  const [subs,      setSubs]      = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)
  const [filterOrg,    setFilterOrg]    = useState('')
  const [filterRegion, setFilterRegion] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const user    = useAuthStore.getState().user
    const orgCode = user?.role === 'supervisor' ? user?.company?.org_code : null
    let vQuery = supabase.from('site_visits').select('id, org_code, status, started_at, closed_at, inspector_username, order_number')
    let sQuery = supabase.from('submissions').select('id, site_visit_id, form_code, finalized, created_at, org_code')
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

  const orgs     = useMemo(() => [...new Set(visits.map(v => v.org_code).filter(Boolean))].sort(), [visits])
  const regions  = useMemo(() => [...new Set(visits.map(v => extractRegion(v.order_number)).filter(Boolean))].sort(), [visits])

  const filteredVisits = useMemo(() =>
    visits.filter(v => {
      if (filterOrg    && v.org_code !== filterOrg)              return false
      if (filterRegion && extractRegion(v.order_number) !== filterRegion) return false
      return true
    }),
    [visits, filterOrg, filterRegion]
  )
  const filteredSubs = useMemo(() =>
    filterOrg ? subs.filter(s => s.org_code === filterOrg) : subs,
    [subs, filterOrg]
  )

  const monthly = useMemo(() => {
    const map = {}
    for (const v of filteredVisits) {
      const m = toMonth(v.started_at)
      if (!m) continue
      if (!map[m]) map[m] = { month: m, orders: 0, closed: 0, inspectors: new Set(), openAtEnd: 0 }
      map[m].orders++
      if (v.status === 'closed') map[m].closed++
      if (v.inspector_username) map[m].inspectors.add(v.inspector_username)
    }
    for (const s of filteredSubs) {
      const m = toMonth(s.created_at)
      if (!m) continue
      if (!map[m]) map[m] = { month: m, orders: 0, closed: 0, inspectors: new Set(), totalForms: 0, finForms: 0 }
      if (!map[m].totalForms) map[m].totalForms = 0
      if (!map[m].finForms)   map[m].finForms   = 0
      if (s.form_code && s.form_code !== 'null') {
        map[m].totalForms++
        if (s.finalized) map[m].finForms++
      }
    }
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month)).map(m => ({
      ...m,
      label:          fmtMonth(m.month),
      closureRate:    m.orders ? Math.round(m.closed / m.orders * 100) : 0,
      formRate:       m.totalForms ? Math.round(m.finForms / m.totalForms * 100) : 0,
      inspectorCount: m.inspectors?.size || 0,
    }))
  }, [filteredVisits, filteredSubs])

  const kpis = useMemo(() => {
    if (!monthly.length) return {}
    const last  = monthly[monthly.length - 1]
    const prev  = monthly.length >= 2 ? monthly[monthly.length - 2] : null
    const growth = prev ? Math.round((last.orders - prev.orders) / (prev.orders || 1) * 100) : null
    const totalOrders = monthly.reduce((a, m) => a + m.orders, 0)
    const totalClosed = monthly.reduce((a, m) => a + m.closed, 0)
    const peakMonth   = [...monthly].sort((a, b) => b.orders - a.orders)[0]
    return { last, prev, growth, totalOrders, totalClosed, peakMonth }
  }, [monthly])

  // Per-inspector monthly (top 4)
  const inspectorMonthly = useMemo(() => {
    const topInspectors = Object.entries(
      filteredVisits.reduce((acc, v) => {
        if (v.inspector_username) acc[v.inspector_username] = (acc[v.inspector_username] || 0) + 1
        return acc
      }, {})
    ).sort((a,b) => b[1]-a[1]).slice(0,4).map(([k]) => k)

    return monthly.map(m => {
      const row = { month: m.month, label: m.label }
      for (const insp of topInspectors) {
        const shortName = insp.split('@')[0].split('.').map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ')
        row[shortName] = filteredVisits.filter(v =>
          toMonth(v.started_at) === m.month && v.inspector_username === insp
        ).length
      }
      return row
    })
  }, [monthly, filteredVisits])

  const inspectorKeys = useMemo(() => {
    if (!inspectorMonthly.length) return []
    return Object.keys(inspectorMonthly[0]).filter(k => k !== 'month' && k !== 'label')
  }, [inspectorMonthly])

  const setFilter = useCallback((key, val) => {
    if (key === 'org')    setFilterOrg(val)
    if (key === 'region') setFilterRegion(val)
  }, [])

  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = monthly.map(m => ({
        'Mes':                  m.label,
        'Órdenes':              m.orders,
        'Cerradas':             m.closed,
        'Tasa Cierre (%)':      m.closureRate,
        'Formularios':          m.totalForms || 0,
        'Forms Finalizados':    m.finForms   || 0,
        'Tasa Forms (%)':       m.formRate,
        'Inspectores Activos':  m.inspectorCount,
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = Array(8).fill({ wch: 20 })
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Tendencia Mensual')
      writeFile(wb, `tendencia_mensual_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) { console.error(e) }
  }, [monthly])

  return {
    monthly, inspectorMonthly, inspectorKeys, kpis, orgs,
    filterOrg, filterRegion, setFilter, regions,
    exportToExcel,
    isLoading, error,
  }
}
