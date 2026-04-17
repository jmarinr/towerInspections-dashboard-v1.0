/**
 * useEquipmentInventoryReport.js
 *
 * Centraliza toda la lógica de datos para el Reporte General de Inventario
 * de Equipos. Toda la lógica de negocio vive aquí; el componente visual
 * es puramente presentacional.
 *
 * Estrategia de performance:
 *  - SELECT id, payload  (evita traer updated_at, app_version, device_id, etc.)
 *  - Filtering y paginación en memoria (dataset suele ser pequeño)
 *  - KPIs siempre calculados sobre allItems, no sobre filteredItems
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'

// Ambos form_codes que representan equipment-v2
const EQUIPMENT_V2_CODES = ['equipment-v2', 'inventario-v2']

// Extrae el objeto de datos raíz del payload doblemente envuelto
function extractRaw(submission) {
  const p = submission.payload || {}
  return p?.payload?.data || p?.data || p || {}
}

// Aplana torre.items de un submission, inyectando siteInfo en cada fila
function flattenItems(submission) {
  const raw     = extractRaw(submission)
  const info    = raw.siteInfo || {}
  const items   = raw.torre?.items || []

  return items.map(item => ({
    idSitio:           info.idSitio          || null,
    alturaMts:         info.alturaMts        ?? null,
    orientacion:       item.orientacion      || null,
    orientacionGrados: item.orientacionGrados ?? null,
    tipoEquipo:        item.tipoEquipo       || null,
    cantidad:          item.cantidad         ?? null,
    alto:              item.alto             ?? null,
    ancho:             item.ancho            ?? null,
    diametro:          item.diametro         ?? null,
    carrier:           item.carrier          || null,
    comentario:        item.comentario       || null,
  }))
}

export default function useEquipmentInventoryReport() {
  const [allItems,   setAllItems]   = useState([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState(null)

  const [filters,      setFiltersState]      = useState({ site: '', carrier: '', type: '', height: '' })
  const [currentPage,  setCurrentPageState]  = useState(1)
  const [pageSize,     setPageSizeState]     = useState(25)

  // ── Carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('submissions')
      .select('id, payload')                    // select parcial: evita columnas innecesarias
      .in('form_code', EQUIPMENT_V2_CODES)
      .eq('finalized', true)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setIsLoading(false)
          return
        }
        const flat = (data || []).flatMap(flattenItems)
        setAllItems(flat)
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // ── KPIs — siempre del dataset completo ──────────────────────────────────────
  const totalEquipment = allItems.length
  const totalTowers    = useMemo(() => new Set(allItems.map(i => i.idSitio).filter(Boolean)).size,    [allItems])
  const antennaTypes   = useMemo(() => new Set(allItems.map(i => i.tipoEquipo).filter(Boolean)).size, [allItems])
  const activeCarriers = useMemo(() => new Set(allItems.map(i => i.carrier).filter(Boolean)).size,    [allItems])

  // ── Opciones de filtro — derivadas dinámicamente del dataset ─────────────────
  const filterOptions = useMemo(() => ({
    sites:    [...new Set(allItems.map(i => i.idSitio).filter(Boolean))].sort(),
    carriers: [...new Set(allItems.map(i => i.carrier).filter(Boolean))].sort(),
    types:    [...new Set(allItems.map(i => i.tipoEquipo).filter(Boolean))].sort(),
    heights:  [...new Set(allItems.map(i => i.alturaMts).filter(v => v != null))]
                .sort((a, b) => a - b)
                .map(String),
  }), [allItems])

  // ── Dataset filtrado ─────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (filters.site    && item.idSitio            !== filters.site)    return false
      if (filters.carrier && item.carrier            !== filters.carrier) return false
      if (filters.type    && item.tipoEquipo         !== filters.type)    return false
      if (filters.height  && String(item.alturaMts)  !== filters.height)  return false
      return true
    })
  }, [allItems, filters])

  const totalFiltered = filteredItems.length

  // ── Paginación en memoria ────────────────────────────────────────────────────
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  // ── Setters que resetean la página ───────────────────────────────────────────
  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => ({ ...prev, [key]: value }))
    setCurrentPageState(1)
  }, [])

  const setCurrentPage = useCallback((page) => setCurrentPageState(page), [])

  const setPageSize = useCallback((size) => {
    setPageSizeState(size)
    setCurrentPageState(1)
  }, [])

  // ── Exportar Excel — siempre el dataset completo ─────────────────────────────
  const exportToExcel = useCallback(async () => {
    try {
      const xlsx = await import('xlsx')
      const { utils, writeFile } = xlsx

      const rows = allItems.map(item => ({
        'ID Sitio':      item.idSitio           ?? '',
        'Altura (m)':    item.alturaMts          ?? '',
        'Orientación':   item.orientacion        ?? '',
        'Orient. (°)':   item.orientacionGrados  ?? '',
        'Tipo Antena':   item.tipoEquipo         ?? '',
        'Cantidad':      item.cantidad           ?? '',
        'Alto':          item.alto               ?? '',
        'Ancho':         item.ancho              ?? '',
        'Diámetro':      item.diametro           ?? '',
        'Carrier':       item.carrier            ?? '',
        'Comentarios':   item.comentario         ?? '',
      }))

      const ws = utils.json_to_sheet(rows)
      // Ajuste de ancho de columnas
      ws['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
        { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 16 }, { wch: 30 },
      ]
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Inventario')
      writeFile(wb, `inventario_equipos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      console.error('[exportToExcel]', e)
    }
  }, [allItems])

  return {
    // Data
    allItems,
    filteredItems,
    paginatedItems,
    // KPIs
    totalEquipment,
    totalTowers,
    antennaTypes,
    activeCarriers,
    // Filtros
    filters,
    setFilter,
    filterOptions,
    // Paginación
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalFiltered,
    // Exportar
    exportToExcel,
    // Estado
    isLoading,
    error,
  }
}
