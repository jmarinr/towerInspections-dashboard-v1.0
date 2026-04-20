/**
 * useEquipmentInventoryReport.js  v3
 * – Join con site_visits para orderId, orderLabel, orderStartDate
 * – Filtro de cuatrimestre (primer filtro, acota dataset base)
 * – KPIs calculados sobre el cuatrimestre seleccionado
 * – orientacionCara / orientacionGrados según fuente (torre/carrier)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  getQuarterOptions, getCurrentQuarterOption,
  isInQuarter,
} from '../utils/quarterUtils'
import { extractRegion } from '../utils/regionUtils'

const EQUIPMENT_V2_CODES = ['equipment-v2', 'inventario-v2']

function extractRaw(submission) {
  const p = submission.payload || {}
  return p?.payload?.data || p?.data || p || {}
}

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

function mapItem(item, idSitio, siteVisitId, overrideCarrier, source, orderId, orderLabel, orderStartDate) {
  const isMW  = item.tipoEquipo === 'MW'
  const alto  = item.alto  ?? null
  const ancho = item.ancho ?? null

  return {
    idSitio,
    siteVisitId,
    orderId,
    orderLabel,
    orderStartDate,
    region: extractRegion(orderLabel),
    alturaMts:         item.alturaMts         ?? null,
    // Torre → cara (Cara 1, Pierna A…) · Carrier → grados (0°, 45°…)
    orientacionCara:   source === 'torre'   ? (item.orientacion || null) : null,
    orientacionGrados: source === 'carrier' ? (item.orientacion || null) : null,
    tipoEquipo:        item.tipoEquipo       || null,
    cantidad:          item.cantidad         ?? null,
    alto:              isMW ? null : alto,
    diametro:          isMW ? alto : null,
    ancho:             isMW ? null : ancho,
    profundidad:       isMW ? null : (item.profundidad ?? null),
    area:              calcArea(alto, ancho, item.tipoEquipo),
    carrier:           overrideCarrier ?? item.carrier ?? null,
    comentario:        item.comentario ?? null,
  }
}

function flattenItems(submission) {
  const raw     = extractRaw(submission)
  const info    = raw.siteInfo || {}
  const idSitio = info.idSitio || null

  const sv             = submission.site_visits
  const orderId        = sv?.id           || submission.site_visit_id || null
  const orderLabel     = sv?.order_number || null
  const orderStartDate = sv?.started_at   || submission.created_at   || null

  const rows = []

  ;(raw.torre?.items || []).forEach(item =>
    rows.push(mapItem(item, idSitio, submission.site_visit_id, undefined, 'torre', orderId, orderLabel, orderStartDate))
  )

  ;(raw.carriers || []).forEach(carrier => {
    const name = carrier.nombre || null
    ;(carrier.items || []).forEach(item =>
      rows.push(mapItem(item, idSitio, submission.site_visit_id, name, 'carrier', orderId, orderLabel, orderStartDate))
    )
  })

  return rows
}

export default function useEquipmentInventoryReport() {
  const [allItems,        setAllItems]        = useState([])
  const [isLoading,       setIsLoading]       = useState(true)
  const [error,           setError]           = useState(null)
  const [selectedQuarter, setSelectedQuarter] = useState(null)
  const [filters,         setFiltersState]    = useState({ site: '', carrier: '', type: '', height: '' })
  const [currentPage,     setCurrentPageState] = useState(1)
  const [pageSize,        setPageSizeState]   = useState(25)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('submissions')
      .select('id, site_visit_id, payload, site_visits(id, order_number, started_at)')
      .in('form_code', EQUIPMENT_V2_CODES)
      .eq('finalized', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }
        const flat = (data || []).flatMap(flattenItems)
        setAllItems(flat)
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // ── Quarter options — derivadas del dataset completo ──────────────────────
  const quarterOptions = useMemo(() =>
    getQuarterOptions(allItems.map(i => i.orderStartDate).filter(Boolean)),
    [allItems]
  )

  // ── Default al cuatrimestre en curso cuando llegan los datos ──────────────
  useEffect(() => {
    if (quarterOptions.length > 0 && !selectedQuarter) {
      setSelectedQuarter(getCurrentQuarterOption(quarterOptions))
    }
  }, [quarterOptions])

  // ── Dataset acotado por cuatrimestre ──────────────────────────────────────
  const quarterFilteredItems = useMemo(() =>
    selectedQuarter
      ? allItems.filter(i => isInQuarter(i.orderStartDate, selectedQuarter))
      : allItems,
    [allItems, selectedQuarter]
  )

  // ── Filter options — derivadas del cuatrimestre activo ────────────────────
  const filterOptions = useMemo(() => ({
    sites:    [...new Set(quarterFilteredItems.map(i => i.idSitio).filter(Boolean))].sort(),
    carriers: [...new Set(quarterFilteredItems.map(i => i.carrier).filter(Boolean))].sort(),
    types:    [...new Set(quarterFilteredItems.map(i => i.tipoEquipo).filter(Boolean))].sort(),
    heights:  [...new Set(quarterFilteredItems.map(i => i.alturaMts).filter(v => v != null))]
                .sort((a, b) => a - b).map(String),
    regions:  [...new Set(quarterFilteredItems.map(i => i.region).filter(Boolean))].sort(),
  }), [quarterFilteredItems])

  // ── Filtrado en memoria ────────────────────────────────────────────────────
  const filteredItems = useMemo(() =>
    quarterFilteredItems.filter(item => {
      if (filters.site    && item.idSitio   !== filters.site)    return false
      if (filters.carrier && item.carrier   !== filters.carrier) return false
      if (filters.type    && item.tipoEquipo !== filters.type)   return false
      if (filters.height  && String(item.alturaMts) !== filters.height) return false
      if (filters.region  && item.region !== filters.region) return false
      return true
    }),
    [quarterFilteredItems, filters]
  )

  // ── KPIs — reactivos a los filtros activos ────────────────────────────────
  const totalEquipment = filteredItems.length
  const totalTowers    = useMemo(() => new Set(filteredItems.map(i => i.idSitio).filter(Boolean)).size,    [filteredItems])
  const antennaTypes   = useMemo(() => new Set(filteredItems.map(i => i.tipoEquipo).filter(Boolean)).size, [filteredItems])
  const activeCarriers = useMemo(() => new Set(filteredItems.map(i => i.carrier).filter(Boolean)).size,    [filteredItems])

  const totalFiltered = filteredItems.length

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  // ── Setters ────────────────────────────────────────────────────────────────
  const setFilter = useCallback((key, val) => {
    setFiltersState(p => ({ ...p, [key]: val }))
    setCurrentPageState(1)
  }, [])
  const setCurrentPage    = useCallback(p => setCurrentPageState(p), [])
  const setPageSize       = useCallback(size => { setPageSizeState(size); setCurrentPageState(1) }, [])
  const handleSetQuarter  = useCallback(opt => { setSelectedQuarter(opt); setCurrentPageState(1) }, [])

  // ── Export Excel ───────────────────────────────────────────────────────────
  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = quarterFilteredItems.map(item => ({
        'ID Sitio':          item.idSitio           ?? '',
        'Visita':            item.orderLabel         ?? '',
        'Cuatrimestre':      selectedQuarter?.label  ?? '',
        'Altura (m)':        item.alturaMts          ?? '',
        'Orient. (Cara)':    item.orientacionCara    ?? '',
        'Orient. (°)':       item.orientacionGrados  ?? '',
        'Tipo Antena':       item.tipoEquipo         ?? '',
        'Cantidad':          item.cantidad           ?? '',
        'Alto':              item.alto               ?? '',
        'Diámetro':          item.diametro           ?? '',
        'Ancho':             item.ancho              ?? '',
        'Profundidad':       item.profundidad        ?? '',
        'Área M²':           item.area               ?? '',
        'Carrier':           item.carrier            ?? '',
        'Comentarios':       item.comentario         ?? '',
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 10 },
        { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 8 },
        { wch: 8 },  { wch: 10 }, { wch: 8 },  { wch: 10 },
        { wch: 10 }, { wch: 16 }, { wch: 30 },
      ]
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Inventario')
      writeFile(wb, `inventario_equipos_${selectedQuarter?.value || 'all'}_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch (e) { console.error('[exportToExcel equipment]', e) }
  }, [quarterFilteredItems, selectedQuarter])

  return {
    allItems, filteredItems, paginatedItems,
    totalEquipment, totalTowers, antennaTypes, activeCarriers,
    quarterOptions, selectedQuarter, setSelectedQuarter: handleSetQuarter,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    exportToExcel,
    isLoading, error,
  }
}
