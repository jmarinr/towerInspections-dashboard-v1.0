/**
 * useTowerInventory.js
 * Lista de sitios únicos con sus equipos y semáforo de estado.
 * Fuente: form_code = 'equipment-v2' / 'inventario-v2'.
 * Un sitio = la submission más reciente de ese siteId.
 */
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRegionsCatalog } from '../lib/regionsCatalog'

const EQUIPMENT_CODES = ['equipment-v2', 'inventario-v2']

function extractRaw(sub) {
  try {
    let p = sub.payload
    if (!p) return {}
    if (typeof p === 'string') p = JSON.parse(p)
    // El payload real puede venir envuelto en payload.payload.data o payload.data
    return p?.payload?.data || p?.data || p || {}
  } catch { return {} }
}

// Semáforo: cruzado con allItems del mismo hook (damage viene de payload)
function deriveSiteStatus(raw) {
  const allItems = [
    ...(raw.torre?.items || []),
    ...((raw.carriers || []).flatMap(c => c.items || [])),
  ]
  const hasMalo     = allItems.some(i => i.condicion === 'Malo' || i.estado === 'Malo')
  const hasRegular  = allItems.some(i => i.condicion === 'Regular' || i.estado === 'Regular')
  if (hasMalo)    return 'critical'
  if (hasRegular) return 'maintenance'
  return 'operative'
}

const STATUS_COLORS = {
  operative:   '#22c55e',
  maintenance: '#f59e0b',
  critical:    '#ef4444',
}

const STATUS_LABELS = {
  operative:   'Operativo',
  maintenance: 'Mantenimiento',
  critical:    'Crítico',
}

export { STATUS_COLORS, STATUS_LABELS }

export default function useTowerInventory() {
  const _regionCatalog = useRegionsCatalog((s) => s.list)
  const [sites,     setSites]     = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)

  // Filtros
  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterRegion,  setFilterRegion]  = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('submissions')
      .select('id, payload, created_at, site_visit_id, site_visits(id, order_number, region_id, started_at, site_id, site_name)')
      .is('deleted_at', null)             // excluir submissions eliminadas
      .in('form_code', EQUIPMENT_CODES)
      .eq('finalized', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }

        // Dedup por siteId — quedarse con la más reciente
        const bysite = {}
        for (const sub of (data || [])) {
          const raw    = extractRaw(sub)
          const info   = raw.siteInfo || {}
          const siteId = info.idSitio || sub.site_visits?.site_id || null
          if (!siteId) continue
          if (!bysite[siteId]) {
            bysite[siteId] = { sub, raw, info }
          }
        }

        const normalized = Object.entries(bysite).map(([siteId, { sub, raw, info }]) => {
          const sv = sub.site_visits || {}
          return {
            siteId,
            siteName:      info.nombreSitio      || sv.site_name    || siteId,
            heightM:       info.alturaMts         || info.altura     || null,
            structureType: info.tipoEstructura    || null,
            siteType:      info.tipoSitio         || null,
            lat:           parseFloat(info.latitud  || info.lat  || 0) || null,
            lng:           parseFloat(info.longitud || info.lng  || 0) || null,
            region:        sv.region_id || null,
            status:        deriveSiteStatus(raw),
            towerItems:    (raw.torre?.items || []).length,
            floorCarriers: (raw.carriers || []).length,
            lastVisitDate: sv.started_at || sub.created_at,
            submissionId:  sub.id,
          }
        })

        if (!cancelled) {
          setSites(normalized)
          setIsLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) { setError(e?.message || 'Error al cargar torres'); setIsLoading(false) }
      })

    return () => { cancelled = true }
  }, [])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filteredSites = useMemo(() => {
    return sites.filter(s => {
      if (filterStatus && s.status !== filterStatus) return false
      if (filterRegion && s.region !== filterRegion) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!s.siteName?.toLowerCase().includes(q) && !s.siteId?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [sites, filterStatus, filterRegion, searchQuery])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalSites          = filteredSites.length
  const totalTowerEquipment = filteredSites.reduce((a, s) => a + s.towerItems, 0)
  const totalFloorCarriers  = filteredSites.reduce((a, s) => a + s.floorCarriers, 0)
  const criticalSites       = filteredSites.filter(s => s.status === 'critical').length

  const regionOptions = useMemo(() => {
    const present = new Set(sites.map(s => s.region).filter(Boolean))
    return _regionCatalog.filter(r => present.has(r.id)).map(r => ({ id: r.id, name: r.name }))
  }, [sites, _regionCatalog])

  return {
    sites,
    filteredSites,
    totalSites,
    totalTowerEquipment,
    totalFloorCarriers,
    criticalSites,
    searchQuery,  setSearchQuery,
    filterRegion, setFilterRegion,
    filterStatus, setFilterStatus,
    regionOptions,
    isLoading,
    error,
  }
}
