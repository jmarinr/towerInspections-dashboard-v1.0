/**
 * useGroupedDamageReport.js
 * Consume useDamageReport internamente y agrupa por description + category.
 * Cero cambios a useDamageReport — patrón caja negra.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import useDamageReport from './useDamageReport'
import * as XLSX from 'xlsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGroupKey(description, category) {
  const slug = (description || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  const cat = (category || '').toLowerCase()
  return `${slug}_${cat}`
}

function groupDamages(allItems) {
  const map = {}
  allItems.forEach(item => {
    const key = makeGroupKey(item.description, item.category)
    if (!map[key]) {
      map[key] = {
        groupKey:    key,
        description: item.description,
        category:    item.category,
        groupComment: '',
        sites: [],
      }
    }
    map[key].sites.push({
      damageKey:    item.damageKey,
      submissionId: item.submissionId,
      idSitio:      item.idSitio,
      orderLabel:   item.orderLabel,
      orderId:      item.orderId,
      formLabel:    item.formLabel,
      formCode:     item.formCode,
      status:       item.status || 'pendiente',
      auditComment: item.auditComment || '',
      date:         item.date,
      region:       item.region,
    })
  })

  return Object.values(map).map(group => ({
    ...group,
    totalSites:    new Set(group.sites.map(s => s.idSitio).filter(Boolean)).size,
    totalItems:    group.sites.length,
    pendingCount:  group.sites.filter(s => s.status === 'pendiente').length,
    quotedCount:   group.sites.filter(s => s.status === 'cotizado').length,
    repairedCount: group.sites.filter(s => s.status === 'reparado').length,
    sitePage:      1,
    sitePageSize:  25,
  }))
  .sort((a, b) => b.totalSites - a.totalSites)
}

// ── Hook principal ────────────────────────────────────────────────────────────
export default function useGroupedDamageReport() {
  const user = useAuthStore(s => s.user)

  // Consume useDamageReport como caja negra
  const damageHook = useDamageReport()
  const {
    allItems,
    quarterOptions,
    selectedQuarter,
    setSelectedQuarter,
    isLoading: damageLoading,
    error: damageError,
  } = damageHook

  // ── Filtros propios del reporte agrupado ─────────────────────────────────
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterRegion,   setFilterRegion]   = useState('')

  // ── Paginación principal ──────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize,    setPageSize]    = useState(25)

  // ── Group comments (persistidos en Supabase) ──────────────────────────────
  const [groupComments, setGroupComments]   = useState({}) // groupKey → comment
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const groupDebounceRef = useRef({})
  const siteDebounceRef  = useRef({})

  // ── Site pages por grupo ──────────────────────────────────────────────────
  const [sitePages, setSitePagesState] = useState({}) // groupKey → page number

  // Cargar group_comments desde Supabase
  useEffect(() => {
    async function loadGroupComments() {
      try {
        const { data } = await supabase
          .from('report_damage_tracking')
          .select('group_key, group_comment')
          .not('group_key', 'is', null)
          .not('group_comment', 'is', null)
        const map = {}
        data?.forEach(t => { if (t.group_key) map[t.group_key] = t.group_comment })
        setGroupComments(map)
        setCommentsLoaded(true)
      } catch {
        setCommentsLoaded(true)
      }
    }
    loadGroupComments()
  }, [])

  // ── Agrupar allItems ──────────────────────────────────────────────────────
  const allGroups = useMemo(() => {
    const groups = groupDamages(allItems)
    // Merge group comments
    groups.forEach(g => {
      g.groupComment = groupComments[g.groupKey] || ''
    })
    return groups
  }, [allItems, groupComments])

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    return allGroups.filter(g => {
      if (filterCategory && g.category !== filterCategory) return false
      // Para status y region: el grupo aparece si AL MENOS UN sitio cumple
      if (filterStatus) {
        const hasSite = g.sites.some(s => s.status === filterStatus)
        if (!hasSite) return false
      }
      if (filterRegion) {
        const hasSite = g.sites.some(s => s.region === filterRegion)
        if (!hasSite) return false
      }
      return true
    })
  }, [allGroups, filterCategory, filterStatus, filterRegion])

  // ── KPIs sobre filteredGroups ─────────────────────────────────────────────
  const totalGroups      = filteredGroups.length
  const totalUniqueSites = useMemo(() => {
    const all = new Set()
    filteredGroups.forEach(g => g.sites.forEach(s => { if (s.idSitio) all.add(s.idSitio) }))
    return all.size
  }, [filteredGroups])
  const totalPending  = useMemo(() => filteredGroups.reduce((a, g) => a + g.pendingCount, 0),  [filteredGroups])
  const totalQuoted   = useMemo(() => filteredGroups.reduce((a, g) => a + g.quotedCount, 0),   [filteredGroups])
  const totalRepaired = useMemo(() => filteredGroups.reduce((a, g) => a + g.repairedCount, 0), [filteredGroups])

  // ── Paginación principal ──────────────────────────────────────────────────
  const totalFiltered  = filteredGroups.length
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredGroups.slice(start, start + pageSize)
  }, [filteredGroups, currentPage, pageSize])

  // ── Filter options ────────────────────────────────────────────────────────
  const filterOptions = useMemo(() => ({
    categories: [...new Set(allGroups.map(g => g.category).filter(Boolean))].sort(),
    statuses:   ['pendiente', 'cotizado', 'reparado'],
    regions:    [...new Set(allGroups.flatMap(g => g.sites.map(s => s.region)).filter(Boolean))].sort(),
  }), [allGroups])

  // ── setFilter unificado ───────────────────────────────────────────────────
  const setFilter = useCallback((key, val) => {
    if (key === 'category') { setFilterCategory(val); setCurrentPage(1) }
    if (key === 'status')   { setFilterStatus(val);   setCurrentPage(1) }
    if (key === 'region')   { setFilterRegion(val);   setCurrentPage(1) }
  }, [])

  // ── Paginación interna por grupo ──────────────────────────────────────────
  const setSitePage = useCallback((groupKey, page) => {
    setSitePagesState(prev => ({ ...prev, [groupKey]: page }))
  }, [])

  const getSitePage = useCallback((groupKey) => {
    return sitePages[groupKey] || 1
  }, [sitePages])

  // ── updateGroupComment (debounce 500ms, optimistic) ───────────────────────
  const updateGroupComment = useCallback((groupKey, comment) => {
    // Actualización optimista inmediata
    setGroupComments(prev => ({ ...prev, [groupKey]: comment }))

    // Debounce → upsert
    if (groupDebounceRef.current[groupKey]) {
      clearTimeout(groupDebounceRef.current[groupKey])
    }
    groupDebounceRef.current[groupKey] = setTimeout(async () => {
      const group = allGroups.find(g => g.groupKey === groupKey)
      const firstSite = group?.sites?.[0]
      if (!firstSite) return

      const { error } = await supabase
        .from('report_damage_tracking')
        .upsert({
          submission_id: firstSite.submissionId,
          damage_key:    firstSite.damageKey,
          group_key:     groupKey,
          group_comment: comment,
          updated_at:    new Date().toISOString(),
          updated_by:    user?.id,
        }, { onConflict: 'submission_id, damage_key' })

      if (error) {
        console.error('[updateGroupComment]', error.message)
        // Revertir en falla — recargar del servidor
        const { data } = await supabase
          .from('report_damage_tracking')
          .select('group_key, group_comment')
          .eq('group_key', groupKey)
          .not('group_comment', 'is', null)
          .limit(1)
        if (data?.[0]) {
          setGroupComments(prev => ({ ...prev, [groupKey]: data[0].group_comment }))
        }
      }
    }, 500)
  }, [allGroups, user])

  // ── updateSiteStatus (optimistic, inmediato) ──────────────────────────────
  const updateSiteStatus = useCallback((damageKey, submissionId, newStatus) => {
    // Actualización optimista en groupComments → requiere mutación de allItems via damageHook
    // Usamos directamente la función de useDamageReport
    damageHook.updateStatus?.(damageKey, submissionId, newStatus)
  }, [damageHook])

  // ── updateSiteComment (debounce 500ms) ────────────────────────────────────
  const updateSiteComment = useCallback((damageKey, submissionId, comment) => {
    damageHook.updateComment?.(damageKey, submissionId, comment)
  }, [damageHook])

  // ── exportToExcel ─────────────────────────────────────────────────────────
  const exportToExcel = useCallback(async () => {
    const quarterLabel = selectedQuarter?.label || 'Todos'
    const rows = []

    filteredGroups.forEach(group => {
      group.sites.forEach(site => {
        rows.push({
          'Descripción del Daño':  group.description,
          'Categoría':             group.category,
          'Total Sitios del Grupo': group.totalSites,
          'Comentario Cotización': group.groupComment || '',
          'ID Sitio':              site.idSitio || '',
          'Visita':                site.orderLabel || '',
          'Formulario':            site.formLabel || '',
          'Estado':                site.status || '',
          'Comentario Auditoría':  site.auditComment || '',
          'Fecha':                 site.date ? new Date(site.date).toLocaleDateString('es') : '',
          'Región':                site.region || '',
          'Cuatrimestre':          quarterLabel,
        })
      })
    })

    const ws  = XLSX.utils.json_to_sheet(rows)
    const wb  = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daños Agrupados')

    // Anchos de columna
    ws['!cols'] = [
      { wch: 40 }, { wch: 10 }, { wch: 18 }, { wch: 35 },
      { wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 12 },
      { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
    ]

    XLSX.writeFile(wb, `DanosAgrupados_${quarterLabel.replace(/\s/g, '_')}.xlsx`)
  }, [filteredGroups, selectedQuarter])

  // ── isLoading / error ─────────────────────────────────────────────────────
  const isLoading = damageLoading || !commentsLoaded
  const error     = damageError

  return {
    allGroups,
    filteredGroups,
    paginatedGroups,

    totalGroups,
    totalUniqueSites,
    totalPending,
    totalQuoted,
    totalRepaired,

    filterCategory,
    filterStatus,
    filterRegion,
    setFilter,
    filterOptions,

    quarterOptions,
    selectedQuarter,
    setSelectedQuarter,

    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalFiltered,

    setSitePage,
    getSitePage,

    updateGroupComment,
    updateSiteStatus,
    updateSiteComment,

    exportToExcel,
    isLoading,
    error,
  }
}
