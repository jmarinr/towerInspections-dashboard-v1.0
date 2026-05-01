/**
 * useTowerDetail.js
 * Carga los equipos de un sitio específico (torre + piso).
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import * as XLSX from 'xlsx'

const EQUIPMENT_CODES = ['equipment-v2', 'inventario-v2']

function extractRaw(sub) {
  try {
    const p = sub.payload
    if (!p) return {}
    if (typeof p === 'string') return JSON.parse(p)
    return p
  } catch { return {} }
}

function mapTowerItem(item) {
  return {
    heightM:     item.alturaMts    ?? null,
    orientation: item.orientacion  ?? null,
    degrees:     item.orientacionGrados ?? null,
    equipType:   item.tipoEquipo   ?? null,
    quantity:    item.cantidad     ?? null,
    high:        item.alto         ?? null,
    width:       item.ancho        ?? null,
    diameter:    item.diametro     ?? null,
    depth:       item.profundidad  ?? null,
    areaM2:      item.areaMts2     ?? null,
    carrier:     item.carrier      ?? null,
    comment:     item.comentario   ?? null,
  }
}

function mapCarrier(carrier) {
  return {
    carrierName: carrier.nombre      ?? null,
    clientType:  carrier.tipoCliente ?? null,
    areaInUse:   carrier.areaEnUso   ?? null,
    cabinets: (carrier.gabinetes || []).map(g => ({
      name:   g.nombre ?? null,
      length: g.largo  ?? null,
      width:  g.ancho  ?? null,
      height: g.alto   ?? null,
      photo:  g.fotoNumero ?? null,
    })),
    // También normalizar items de equipo del carrier
    items: (carrier.items || []).map(mapTowerItem),
  }
}

function deriveSiteStatus(raw) {
  const allItems = [
    ...(raw.torre?.items || []),
    ...((raw.carriers || []).flatMap(c => c.items || [])),
  ]
  const hasMalo    = allItems.some(i => i.condicion === 'Malo'    || i.estado === 'Malo')
  const hasRegular = allItems.some(i => i.condicion === 'Regular' || i.estado === 'Regular')
  if (hasMalo)    return 'critical'
  if (hasRegular) return 'maintenance'
  return 'operative'
}

export default function useTowerDetail(siteId) {
  const [siteInfo,      setSiteInfo]      = useState(null)
  const [towerEquipment, setTowerEquipment] = useState([])
  const [floorEquipment, setFloorEquipment] = useState([])
  const [lastVisit,     setLastVisit]     = useState(null)
  const [siteStatus,    setSiteStatus]    = useState('operative')
  const [isLoading,     setIsLoading]     = useState(true)
  const [error,         setError]         = useState(null)

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('submissions')
      .select('id, payload, created_at, site_visit_id, site_visits(id, order_number, started_at, site_id, site_name, inspector_name)')
      .in('form_code', EQUIPMENT_CODES)
      .eq('finalized', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }

        // Encontrar la submission más reciente de este sitio
        const sub = (data || []).find(s => {
          const raw  = extractRaw(s)
          const info = raw.siteInfo || {}
          const sid  = info.idSitio || s.site_visits?.site_id
          return sid === siteId
        })

        if (!sub) { setError('Sitio no encontrado'); setIsLoading(false); return }

        const raw  = extractRaw(sub)
        const info = raw.siteInfo || {}
        const sv   = sub.site_visits || {}

        setSiteInfo({
          siteId:        info.idSitio        || sv.site_id   || siteId,
          siteName:      info.nombreSitio    || sv.site_name || siteId,
          heightM:       info.alturaMts      || info.altura  || null,
          structureType: info.tipoEstructura || null,
          siteType:      info.tipoSitio      || null,
          lat:           parseFloat(info.latitud  || 0) || null,
          lng:           parseFloat(info.longitud || 0) || null,
          proveedor:     info.proveedor      || null,
        })

        setTowerEquipment((raw.torre?.items || []).map(mapTowerItem))
        setFloorEquipment((raw.carriers || []).map(mapCarrier))
        setSiteStatus(deriveSiteStatus(raw))
        setLastVisit({
          orderId:   sv.id,
          orderNum:  sv.order_number,
          date:      sv.started_at || sub.created_at,
          inspector: sv.inspector_name || null,
        })
        setIsLoading(false)
      })
      .catch(e => {
        if (!cancelled) { setError(e?.message || 'Error'); setIsLoading(false) }
      })

    return () => { cancelled = true }
  }, [siteId])

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportToExcel = useCallback(() => {
    if (!siteInfo || !towerEquipment.length) return
    const rows = towerEquipment.map(eq => ({
      'ID Sitio':      siteInfo.siteId,
      'Nombre Sitio':  siteInfo.siteName,
      'Altura Torre':  siteInfo.heightM,
      'Estructura':    siteInfo.structureType,
      'Eq. Altura':    eq.heightM,
      'Orientación':   eq.orientation,
      'Grados':        eq.degrees,
      'Tipo Antena':   eq.equipType,
      'Cantidad':      eq.quantity,
      'Alto':          eq.high,
      'Diám.':         eq.diameter,
      'Ancho':         eq.width,
      'Prof.':         eq.depth,
      'Área m²':       eq.areaM2,
      'Carrier':       eq.carrier,
      'Comentario':    eq.comment,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Torre')
    ws['!cols'] = Array(16).fill({ wch: 14 })
    XLSX.writeFile(wb, `Torre_${siteInfo.siteId}.xlsx`)
  }, [siteInfo, towerEquipment])

  return {
    siteInfo,
    towerEquipment,
    floorEquipment,
    lastVisit,
    siteStatus,
    exportToExcel,
    isLoading,
    error,
  }
}
