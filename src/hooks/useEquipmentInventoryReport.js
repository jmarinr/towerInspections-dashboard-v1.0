/**
 * useEquipmentInventoryReport.js
 * v2 — incluye torre.items Y carriers[].items, diámetro MW, área m², site_visit_id
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

const EQUIPMENT_V2_CODES = ['equipment-v2', 'inventario-v2']

function extractRaw(submission) {
  const p = submission.payload || {}
  return p?.payload?.data || p?.data || p || {}
}

// Área según tipo: MW = π*(d/2)², otros = alto×ancho
function calcArea(alto, ancho, tipoEquipo) {
  if (tipoEquipo === 'MW') {
    const d = parseFloat(alto)
    return Number.isFinite(d) && d > 0
      ? parseFloat((Math.PI * Math.pow(d / 2, 2)).toFixed(4))
      : null
  }
  const a = parseFloat(alto), b = parseFloat(ancho)
  return Number.isFinite(a) && Number.isFinite(b) ? parseFloat((a * b).toFixed(4)) : null
}

// Mapea un item de torre/carrier a una fila normalizada del reporte
function mapItem(item, idSitio, siteVisitId, overrideCarrier) {
  const isMW     = item.tipoEquipo === 'MW'
  const alto     = item.alto ?? null
  const ancho    = item.ancho ?? null

  return {
    idSitio,
    siteVisitId,
    alturaMts:   item.alturaMts   ?? null,
    orientacion: item.orientacion || null,
    tipoEquipo:  item.tipoEquipo  || null,
    cantidad:    item.cantidad    ?? null,
    // Para MW: alto = diámetro, para otros: alto = altura
    alto:        isMW ? null : alto,
    diametro:    isMW ? alto : null,
    ancho:       isMW ? null : ancho,
    profundidad: isMW ? null : (item.profundidad ?? null),
    area:        calcArea(alto, ancho, item.tipoEquipo),
    carrier:     overrideCarrier ?? item.carrier ?? null,
    comentario:  item.comentario  || null,
  }
}

// Aplana torre.items + carriers[].items de un submission
function flattenItems(submission) {
  const raw         = extractRaw(submission)
  const info        = raw.siteInfo || {}
  const idSitio     = info.idSitio     || null
  const siteVisitId = submission.site_visit_id || null
  const rows        = []

  // ── Torre items ────────────────────────────────────────────────────────────
  const torreItems = raw.torre?.items || []
  torreItems.forEach(item => rows.push(mapItem(item, idSitio, siteVisitId)))

  // ── Carriers items (sección separada del formulario) ──────────────────────
  const carriers = raw.carriers || []
  carriers.forEach(carrier => {
    const carrierName  = carrier.nombre || null
    const carrierItems = carrier.items  || []
    carrierItems.forEach(item =>
      rows.push(mapItem(item, idSitio, siteVisitId, carrierName))
    )
  })

  return rows
}

export default function useEquipmentInventoryReport() {
  const [allItems,  setAllItems]  = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)

  const [filters,     setFiltersState]     = useState({ site: '', carrier: '', type: '', height: '' })
  const [currentPage, setCurrentPageState] = useState(1)
  const [pageSize,    setPageSizeState]    = useState(25)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('submissions')
      .select('id, site_visit_id, payload')   // site_visit_id para links
      .in('form_code', EQUIPMENT_V2_CODES)
      .eq('finalized', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }
        setAllItems((data || []).flatMap(flattenItems))
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // ── KPIs — siempre sobre dataset completo ──────────────────────────────────
  const totalEquipment = allItems.length
  const totalTowers    = useMemo(() => new Set(allItems.map(i => i.idSitio).filter(Boolean)).size,    [allItems])
  const antennaTypes   = useMemo(() => new Set(allItems.map(i => i.tipoEquipo).filter(Boolean)).size, [allItems])
  const activeCarriers = useMemo(() => new Set(allItems.map(i => i.carrier).filter(Boolean)).size,    [allItems])

  // ── Opciones de filtro — dinámicas ─────────────────────────────────────────
  const filterOptions = useMemo(() => ({
    sites:    [...new Set(allItems.map(i => i.idSitio).filter(Boolean))].sort(),
    carriers: [...new Set(allItems.map(i => i.carrier).filter(Boolean))].sort(),
    types:    [...new Set(allItems.map(i => i.tipoEquipo).filter(Boolean))].sort(),
    heights:  [...new Set(allItems.map(i => i.alturaMts).filter(v => v != null))]
                .sort((a, b) => a - b)
                .map(String),
  }), [allItems])

  // ── Filtrado en memoria ────────────────────────────────────────────────────
  const filteredItems = useMemo(() => allItems.filter(item => {
    if (filters.site    && item.idSitio   !== filters.site)           return false
    if (filters.carrier && item.carrier   !== filters.carrier)        return false
    if (filters.type    && item.tipoEquipo !== filters.type)          return false
    if (filters.height  && String(item.alturaMts) !== filters.height) return false
    return true
  }), [allItems, filters])

  const totalFiltered = filteredItems.length

  // ── Paginación en memoria ──────────────────────────────────────────────────
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  // ── Setters con reset de página ────────────────────────────────────────────
  const setFilter      = useCallback((key, val) => { setFiltersState(p => ({ ...p, [key]: val })); setCurrentPageState(1) }, [])
  const setCurrentPage = useCallback(page => setCurrentPageState(page), [])
  const setPageSize    = useCallback(size => { setPageSizeState(size); setCurrentPageState(1) }, [])

  // ── Exportar Excel — siempre dataset completo ──────────────────────────────
  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = allItems.map(item => ({
        'ID Sitio':     item.idSitio     ?? '',
        'Altura (m)':   item.alturaMts   ?? '',
        'Orientación':  item.orientacion ?? '',
        'Tipo Antena':  item.tipoEquipo  ?? '',
        'Cantidad':     item.cantidad    ?? '',
        'Alto':         item.alto        ?? '',
        'Diámetro':     item.diametro    ?? '',
        'Ancho':        item.ancho       ?? '',
        'Profundidad':  item.profundidad ?? '',
        'Área M²':      item.area        ?? '',
        'Carrier':      item.carrier     ?? '',
        'Comentarios':  item.comentario  ?? '',
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
        { wch: 8 },  { wch: 8 },  { wch: 10 }, { wch: 8 },
        { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 30 },
      ]
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Inventario')
      writeFile(wb, `inventario_equipos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      console.error('[exportToExcel]', e)
    }
  }, [allItems])

  return {
    allItems, filteredItems, paginatedItems,
    totalEquipment, totalTowers, antennaTypes, activeCarriers,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    exportToExcel,
    isLoading, error,
  }
}
