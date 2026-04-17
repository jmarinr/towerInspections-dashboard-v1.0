/**
 * useDamageReport.js  v2
 * – Join con site_visits para orderId, orderLabel, orderStartDate
 * – Filtro de cuatrimestre
 * – KPIs sobre cuatrimestre seleccionado
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { maintenanceFormConfig } from '../data/maintenanceFormConfig'
import { safetySectionFields } from '../data/safetyClimbingDeviceConfig'
import {
  getQuarterOptions, getCurrentQuarterOption, isInQuarter,
} from '../utils/quarterUtils'

const PM_CODES        = ['preventive-maintenance', 'mantenimiento']
const GROUNDING_CODES = ['grounding-system-test',  'puesta-tierra']
const SAFETY_CODES    = ['safety-system',           'sistema-ascenso']
const ALL_CODES       = [...PM_CODES, ...GROUNDING_CODES, ...SAFETY_CODES]

const MAINT_ITEM_MAP = (() => {
  const map = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'checklist' && step.items) {
      for (const item of step.items) map[item.id] = item.name
    }
  }
  return map
})()

const SAFETY_STATUS_FIELDS = (() => {
  const fields = []
  for (const [sectionId, sectionFields] of Object.entries(safetySectionFields)) {
    for (const f of sectionFields) {
      if (f.type === 'status') fields.push({ sectionId, fieldId: f.id, label: f.label })
    }
  }
  return fields
})()

const GROUNDING_MEASUREMENTS = [
  { id: 'rPataTorre',    label: 'Pata de la Torre' },
  { id: 'rCerramiento',  label: 'Cerramiento' },
  { id: 'rPorton',       label: 'Portón' },
  { id: 'rPararrayos',   label: 'Pararrayos' },
  { id: 'rBarraSPT',     label: 'Barra SPT' },
  { id: 'rEscalerilla1', label: 'Escalerilla #1' },
  { id: 'rEscalerilla2', label: 'Escalerilla #2' },
]

function resolveData(submission) {
  const p = submission.payload || {}
  return p?.payload?.data || p?.data || p || {}
}

function normStatus(v) {
  if (!v) return ''
  const s = String(v).toLowerCase()
  if (s.includes('regular')) return 'regular'
  if (s.includes('malo'))    return 'malo'
  if (s.includes('bueno'))   return 'bueno'
  return s
}

function extractDamages(submission) {
  const data     = resolveData(submission)
  const idSitio  = data.siteInfo?.idSitio || data.formData?.idSitio || ''
  const fc       = submission.form_code || ''
  const subId    = submission.id

  const sv             = submission.site_visits
  const orderId        = sv?.id           || submission.site_visit_id || null
  const orderLabel     = sv?.order_number || null
  const orderStartDate = sv?.started_at   || submission.created_at   || null

  const damages = []

  if (PM_CODES.some(c => fc === c || fc.includes(c))) {
    Object.entries(data.checklistData || {}).forEach(([itemId, entry]) => {
      const raw = normStatus(entry?.status)
      if (raw !== 'regular' && raw !== 'malo') return
      damages.push({
        damageKey: `${fc}_${subId}_${itemId}`, submissionId: subId,
        formCode: 'preventive-maintenance', formLabel: 'Preventive Maintenance Inspection',
        idSitio, orderId, orderLabel, orderStartDate,
        description: MAINT_ITEM_MAP[itemId] || `Ítem ${itemId}`,
        category: raw === 'malo' ? 'Malo' : 'Regular',
        status: 'pendiente', auditComment: '',
        date: orderStartDate,
      })
    })
    return damages
  }

  if (GROUNDING_CODES.some(c => fc === c || fc.includes(c))) {
    const med = data.medicion || {}
    GROUNDING_MEASUREMENTS.forEach(m => {
      const val = parseFloat(med[m.id])
      if (!Number.isFinite(val) || val === 0) return
      const raw = val <= 5 ? 'bueno' : val <= 10 ? 'regular' : 'malo'
      if (raw === 'bueno') return
      damages.push({
        damageKey: `${fc}_${subId}_${m.id}`, submissionId: subId,
        formCode: 'grounding-system-test', formLabel: 'Grounding System Test',
        idSitio, orderId, orderLabel, orderStartDate,
        description: `${m.label} — ${val} Ω`,
        category: raw === 'malo' ? 'Malo' : 'Regular',
        status: 'pendiente', auditComment: '',
        date: orderStartDate,
      })
    })
    return damages
  }

  if (SAFETY_CODES.some(c => fc === c || fc.includes(c))) {
    SAFETY_STATUS_FIELDS.forEach(({ sectionId, fieldId, label }) => {
      const raw = normStatus(data[sectionId]?.[fieldId])
      if (raw !== 'regular' && raw !== 'malo') return
      damages.push({
        damageKey: `${fc}_${subId}_${fieldId}`, submissionId: subId,
        formCode: 'safety-system', formLabel: 'Safety Climbing Device',
        idSitio, orderId, orderLabel, orderStartDate,
        description: label,
        category: raw === 'malo' ? 'Malo' : 'Regular',
        status: 'pendiente', auditComment: '',
        date: orderStartDate,
      })
    })
    return damages
  }

  return damages
}

export default function useDamageReport() {
  const [allItems,        setAllItems]        = useState([])
  const [isLoading,       setIsLoading]       = useState(true)
  const [error,           setError]           = useState(null)
  const [selectedQuarter, setSelectedQuarter] = useState(null)
  const [filters,         setFiltersState]    = useState({ site: '', category: '', status: '' })
  const [currentPage,     setCurrentPageState] = useState(1)
  const [pageSize,        setPageSizeState]   = useState(25)
  const debounceRef = useRef({})

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      supabase
        .from('submissions')
        .select('id, form_code, site_visit_id, payload, created_at, site_visits(id, order_number, started_at)')
        .in('form_code', ALL_CODES)
        .eq('finalized', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('report_damage_tracking')
        .select('submission_id, damage_key, status, audit_comment'),
    ]).then(([{ data: subs, error: subErr }, { data: tracking }]) => {
      if (cancelled) return
      if (subErr) { setError(subErr.message); setIsLoading(false); return }

      const trackMap = {}
      for (const t of (tracking || [])) {
        trackMap[`${t.submission_id}::${t.damage_key}`] = { status: t.status, auditComment: t.audit_comment || '' }
      }

      const flat = (subs || []).flatMap(sub => {
        return extractDamages(sub).map(item => {
          const tr = trackMap[`${item.submissionId}::${item.damageKey}`]
          return tr ? { ...item, status: tr.status, auditComment: tr.auditComment } : item
        })
      })

      setAllItems(flat)
      setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // ── Quarter options ────────────────────────────────────────────────────────
  const quarterOptions = useMemo(() =>
    getQuarterOptions(allItems.map(i => i.orderStartDate).filter(Boolean)),
    [allItems]
  )

  useEffect(() => {
    if (quarterOptions.length > 0 && !selectedQuarter) {
      setSelectedQuarter(getCurrentQuarterOption(quarterOptions))
    }
  }, [quarterOptions])

  const quarterFilteredItems = useMemo(() =>
    selectedQuarter
      ? allItems.filter(i => isInQuarter(i.orderStartDate, selectedQuarter))
      : allItems,
    [allItems, selectedQuarter]
  )

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalDamages  = quarterFilteredItems.length
  const totalPending  = useMemo(() => quarterFilteredItems.filter(i => i.status === 'pendiente').length, [quarterFilteredItems])
  const totalRepaired = useMemo(() => quarterFilteredItems.filter(i => i.status === 'reparado').length,  [quarterFilteredItems])
  const totalQuoted   = useMemo(() => quarterFilteredItems.filter(i => i.status === 'cotizado').length,  [quarterFilteredItems])
  const totalRegular  = useMemo(() => quarterFilteredItems.filter(i => i.category === 'Regular').length, [quarterFilteredItems])
  const totalMalo     = useMemo(() => quarterFilteredItems.filter(i => i.category === 'Malo').length,    [quarterFilteredItems])

  const filterOptions = useMemo(() => ({
    sites:      [...new Set(quarterFilteredItems.map(i => i.idSitio).filter(Boolean))].sort(),
    categories: [...new Set(quarterFilteredItems.map(i => i.category).filter(Boolean))].sort(),
    statuses:   ['pendiente', 'cotizado', 'reparado'],
  }), [quarterFilteredItems])

  const filteredItems = useMemo(() =>
    quarterFilteredItems.filter(item => {
      if (filters.site     && item.idSitio  !== filters.site)     return false
      if (filters.category && item.category !== filters.category) return false
      if (filters.status   && item.status   !== filters.status)   return false
      return true
    }),
    [quarterFilteredItems, filters]
  )

  const totalFiltered = filteredItems.length

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  const setFilter     = useCallback((key, val) => { setFiltersState(p => ({ ...p, [key]: val })); setCurrentPageState(1) }, [])
  const setCurrentPage = useCallback(p => setCurrentPageState(p), [])
  const setPageSize   = useCallback(size => { setPageSizeState(size); setCurrentPageState(1) }, [])
  const handleSetQuarter = useCallback(opt => { setSelectedQuarter(opt); setCurrentPageState(1) }, [])

  // ── Mutaciones (status + comment) ─────────────────────────────────────────
  const updateStatus = useCallback((damageKey, submissionId, newStatus) => {
    setAllItems(prev =>
      prev.map(item =>
        item.damageKey === damageKey && item.submissionId === submissionId
          ? { ...item, status: newStatus } : item
      )
    )
    const userId = useAuthStore.getState().user?.id
    supabase.from('report_damage_tracking').upsert(
      { submission_id: submissionId, damage_key: damageKey, status: newStatus,
        updated_at: new Date().toISOString(), updated_by: userId || null },
      { onConflict: 'submission_id,damage_key' }
    ).then(({ error: err }) => {
      if (err) {
        console.error('[updateStatus]', err.message)
        setAllItems(prev =>
          prev.map(item =>
            item.damageKey === damageKey && item.submissionId === submissionId
              ? { ...item, status: 'pendiente' } : item
          )
        )
      }
    })
  }, [])

  const updateComment = useCallback((damageKey, submissionId, comment) => {
    setAllItems(prev =>
      prev.map(item =>
        item.damageKey === damageKey && item.submissionId === submissionId
          ? { ...item, auditComment: comment } : item
      )
    )
    const dkey = `${submissionId}::${damageKey}`
    if (debounceRef.current[dkey]) clearTimeout(debounceRef.current[dkey])
    const prevComment = allItems.find(i => i.damageKey === damageKey && i.submissionId === submissionId)?.auditComment ?? ''
    debounceRef.current[dkey] = setTimeout(async () => {
      const userId = useAuthStore.getState().user?.id
      const { error: err } = await supabase.from('report_damage_tracking').upsert(
        { submission_id: submissionId, damage_key: damageKey, audit_comment: comment,
          status: allItems.find(i => i.damageKey === damageKey)?.status || 'pendiente',
          updated_at: new Date().toISOString(), updated_by: userId || null },
        { onConflict: 'submission_id,damage_key' }
      )
      if (err) {
        console.error('[updateComment]', err.message)
        setAllItems(prev =>
          prev.map(item =>
            item.damageKey === damageKey && item.submissionId === submissionId
              ? { ...item, auditComment: prevComment } : item
          )
        )
      }
    }, 500)
  }, [allItems])

  // ── Export Excel ───────────────────────────────────────────────────────────
  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = quarterFilteredItems.map(item => ({
        'ID Sitio':             item.idSitio       ?? '',
        'Visita':               item.orderLabel     ?? '',
        'Cuatrimestre':         selectedQuarter?.label ?? '',
        'Formulario Origen':    item.formLabel      ?? '',
        'Descripción del Daño': item.description    ?? '',
        'Categoría':            item.category       ?? '',
        'Estado':               item.status         ?? '',
        'Comentario Auditoría': item.auditComment   ?? '',
        'Fecha':                item.date           ?? '',
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 36 },
        { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 14 },
      ]
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Daños')
      writeFile(wb, `reporte_danos_${selectedQuarter?.value || 'all'}_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch (e) { console.error('[exportToExcel damage]', e) }
  }, [quarterFilteredItems, selectedQuarter])

  return {
    allItems, filteredItems, paginatedItems,
    totalDamages, totalPending, totalRepaired, totalQuoted, totalRegular, totalMalo,
    quarterOptions, selectedQuarter, setSelectedQuarter: handleSetQuarter,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    updateStatus, updateComment,
    exportToExcel,
    isLoading, error,
  }
}
