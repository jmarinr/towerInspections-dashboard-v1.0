/**
 * useGeoMapReport.js
 * Órdenes con coordenadas GPS — scatter plot lat/lng.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { extractRegion, regionLabel } from '../utils/regionUtils'

// Bounding box de Panamá — filtra puntos fuera del país (ej: Costa Rica)
const PANAMA_BOUNDS = { minLat: 7.1, maxLat: 9.9, minLng: -83.1, maxLng: -77.1 }
const inPanama = (lat, lng) =>
  lat >= PANAMA_BOUNDS.minLat && lat <= PANAMA_BOUNDS.maxLat &&
  lng >= PANAMA_BOUNDS.minLng && lng <= PANAMA_BOUNDS.maxLng

export default function useGeoMapReport() {
  const [visits,    setVisits]    = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)
  const [filterOrg, setFilterOrg] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterInspector, setFilterInspector] = useState('')
  const [filterRegion,    setFilterRegion]    = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const user    = useAuthStore.getState().user
    const orgCode = user?.role === 'supervisor' ? user?.company?.org_code : null
    let query = supabase
      .from('site_visits')
      .select('id, order_number, site_id, site_name, org_code, status, started_at, inspector_username, inspector_name, start_lat, start_lng')
      .not('start_lat', 'is', null)
      .order('started_at', { ascending: false })
    if (orgCode) query = query.eq('org_code', orgCode)
    query.then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }
        setVisits((data || []).filter(v => v.start_lat && v.start_lng))
        setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const enriched = useMemo(() => visits.map(v => ({
    ...v,
    lat:       parseFloat(v.start_lat),
    lng:       parseFloat(v.start_lng),
    inspector: v.inspector_name || v.inspector_username || '—',
    region:    extractRegion(v.order_number),
    dateLabel: v.started_at ? new Date(v.started_at).toLocaleDateString('es', { day:'numeric', month:'short' }) : '—',
  })).filter(v => !isNaN(v.lat) && !isNaN(v.lng) && inPanama(v.lat, v.lng)), [visits])

  const orgs       = useMemo(() => [...new Set(enriched.map(v => v.org_code).filter(Boolean))].sort(), [enriched])
  const inspectors = useMemo(() => [...new Set(enriched.map(v => v.inspector).filter(v => v !== '—'))].sort(), [enriched])
  const regions    = useMemo(() => [...new Set(enriched.map(v => v.region).filter(Boolean))].sort(), [enriched])

  const filtered = useMemo(() =>
    enriched.filter(v => {
      if (filterOrg       && v.org_code  !== filterOrg)       return false
      if (filterStatus    && v.status    !== filterStatus)     return false
      if (filterInspector && v.inspector !== filterInspector)  return false
      if (filterRegion    && v.region    !== filterRegion)      return false
      return true
    }),
    [enriched, filterOrg, filterStatus, filterInspector, filterRegion]
  )

  const kpis = useMemo(() => ({
    total:   filtered.length,
    closed:  filtered.filter(v => v.status === 'closed').length,
    open:    filtered.filter(v => v.status === 'open').length,
    orgs:    [...new Set(filtered.map(v => v.org_code))].filter(Boolean).length,
  }), [filtered])

  // Datos para ScatterChart recharts: {x: lng, y: lat, ...}
  const scatterData = useMemo(() =>
    filtered.map(v => ({
      x:           v.lng,
      y:           v.lat,
      siteId:      v.site_id,
      siteName:    v.site_name,
      inspector:   v.inspector,
      status:      v.status,
      orgCode:     v.org_code,
      dateLabel:   v.dateLabel,
      orderNumber: v.order_number,
    })),
    [filtered]
  )

  // Cluster by org for color coding
  const ORG_COLORS = { CG: '#38bdf8', HQ: '#818cf8', HK: '#34d399' }
  const getColor = (orgCode, status) => {
    if (status === 'closed') return ORG_COLORS[orgCode] || '#94a3b8'
    return '#fbbf24'  // open orders always yellow
  }

  const setFilter = useCallback((key, val) => {
    if (key === 'org')       setFilterOrg(val)
    if (key === 'status')    setFilterStatus(val)
    if (key === 'inspector') setFilterInspector(val)
    if (key === 'region')    setFilterRegion(val)
  }, [])

  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = filtered.map(v => ({
        'Orden':        v.order_number,
        'Sitio ID':     v.site_id,
        'Sitio Nombre': v.site_name,
        'Org':          v.org_code,
        'Estado':       v.status,
        'Inspector':    v.inspector,
        'Latitud':      v.lat,
        'Longitud':     v.lng,
        'Fecha':        v.dateLabel,
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = Array(9).fill({ wch: 18 })
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Dispersión GPS')
      writeFile(wb, `mapa_gps_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) { console.error(e) }
  }, [filtered])

  return {
    scatterData, filtered, kpis, orgs, inspectors,
    filterOrg, filterStatus, filterInspector, filterRegion, setFilter, regions,
    totalFiltered: filtered.length,
    exportToExcel,
    getColor, ORG_COLORS,
    isLoading, error,
  }
}
