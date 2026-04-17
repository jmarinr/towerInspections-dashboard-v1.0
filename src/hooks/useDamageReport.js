/**
 * useDamageReport.js
 *
 * Centraliza toda la lógica del Reporte de Daños por Sitio.
 * Fuentes: Preventive Maintenance, Grounding System Test, Safety Climbing Device.
 * (Executed Maintenance excluido — no tiene items Bueno/Regular/Malo)
 *
 * Tracking (status + audit_comment) persiste en report_damage_tracking via upsert.
 * Actualización optimista + rollback en caso de error.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'
import { maintenanceFormConfig } from '../data/maintenanceFormConfig'
import { safetySectionFields } from '../data/safetyClimbingDeviceConfig'

// ── Form code sets ────────────────────────────────────────────────────────────
const PM_CODES       = ['preventive-maintenance', 'mantenimiento']
const GROUNDING_CODES = ['grounding-system-test', 'puesta-tierra']
const SAFETY_CODES   = ['safety-system', 'sistema-ascenso']
const ALL_CODES      = [...PM_CODES, ...GROUNDING_CODES, ...SAFETY_CODES]

// ── Lookup map: maintenance checklist itemId → name ───────────────────────────
const MAINT_ITEM_MAP = (() => {
  const map = {}
  for (const step of maintenanceFormConfig.steps) {
    if (step.type === 'checklist' && step.items) {
      for (const item of step.items) {
        map[item.id] = item.name
      }
    }
  }
  return map
})()

// ── Lookup: safety fields of type 'status' ────────────────────────────────────
const SAFETY_STATUS_FIELDS = (() => {
  const fields = []
  for (const [sectionId, sectionFields] of Object.entries(safetySectionFields)) {
    for (const f of sectionFields) {
      if (f.type === 'status') {
        fields.push({ sectionId, fieldId: f.id, label: f.label })
      }
    }
  }
  return fields
})()

// ── Grounding measurement points ──────────────────────────────────────────────
const GROUNDING_MEASUREMENTS = [
  { id: 'rPataTorre',    label: 'Pata de la Torre' },
  { id: 'rCerramiento',  label: 'Cerramiento' },
  { id: 'rPorton',       label: 'Portón' },
  { id: 'rPararrayos',   label: 'Pararrayos' },
  { id: 'rBarraSPT',     label: 'Barra SPT' },
  { id: 'rEscalerilla1', label: 'Escalerilla #1' },
  { id: 'rEscalerilla2', label: 'Escalerilla #2' },
]

// ── Payload resolver ──────────────────────────────────────────────────────────
function resolveData(submission) {
  const p = submission.payload || {}
  return p?.payload?.data || p?.data || p || {}
}

function normStatus(v) {
  if (!v) return ''
  const s = String(v).toLowerCase()
  if (s.includes('regular')) return 'regular'
  if (s.includes('malo')    ) return 'malo'
  if (s.includes('bueno')   ) return 'bueno'
  return s
}

// ── Flatten damage items from a submission ────────────────────────────────────
function extractDamages(submission) {
  const data     = resolveData(submission)
  const idSitio  = data.siteInfo?.idSitio || data.formData?.idSitio || ''
  const date     = data.meta?.date || submission.created_at || ''
  const fc       = submission.form_code || ''
  const subId    = submission.id
  const damages  = []

  // ── Preventive Maintenance Inspection ─────────────────────────────────────
  if (PM_CODES.some(c => fc === c || fc.includes(c))) {
    const cl = data.checklistData || {}
    Object.entries(cl).forEach(([itemId, entry], i) => {
      const raw = normStatus(entry?.status)
      if (raw !== 'regular' && raw !== 'malo') return
      damages.push({
        damageKey:   `${fc}_${subId}_${itemId}`,
        submissionId: subId,
        formCode:    'preventive-maintenance',
        formLabel:   'Preventive Maintenance Inspection',
        idSitio,
        description: MAINT_ITEM_MAP[itemId] || `Ítem ${itemId}`,
        category:    raw === 'malo' ? 'Malo' : 'Regular',
        status:      'pendiente',
        auditComment: '',
        date,
      })
    })
    return damages
  }

  // ── Grounding System Test ─────────────────────────────────────────────────
  if (GROUNDING_CODES.some(c => fc === c || fc.includes(c))) {
    const med = data.medicion || {}
    GROUNDING_MEASUREMENTS.forEach(m => {
      const val = parseFloat(med[m.id])
      if (!Number.isFinite(val) || val === 0) return
      const raw = val <= 5 ? 'bueno' : val <= 10 ? 'regular' : 'malo'
      if (raw === 'bueno') return
      damages.push({
        damageKey:    `${fc}_${subId}_${m.id}`,
        submissionId: subId,
        formCode:     'grounding-system-test',
        formLabel:    'Grounding System Test',
        idSitio,
        description:  `${m.label} — ${val} Ω`,
        category:     raw === 'malo' ? 'Malo' : 'Regular',
        status:       'pendiente',
        auditComment: '',
        date,
      })
    })
    return damages
  }

  // ── Safety Climbing Device ────────────────────────────────────────────────
  if (SAFETY_CODES.some(c => fc === c || fc.includes(c))) {
    SAFETY_STATUS_FIELDS.forEach(({ sectionId, fieldId, label }) => {
      const raw = normStatus(data[sectionId]?.[fieldId])
      if (raw !== 'regular' && raw !== 'malo') return
      damages.push({
        damageKey:    `${fc}_${subId}_${fieldId}`,
        submissionId: subId,
        formCode:     'safety-system',
        formLabel:    'Safety Climbing Device',
        idSitio,
        description:  label,
        category:     raw === 'malo' ? 'Malo' : 'Regular',
        status:       'pendiente',
        auditComment: '',
        date,
      })
    })
    return damages
  }

  return damages
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useDamageReport() {
  const [allItems,   setAllItems]   = useState([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState(null)

  const [filters,     setFiltersState]     = useState({ site: '', category: '', status: '' })
  const [currentPage, setCurrentPageState] = useState(1)
  const [pageSize,    setPageSizeState]    = useState(25)

  const debounceRef = useRef({})

  // ── Fetch submissions + tracking ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      supabase
        .from('submissions')
        .select('id, form_code, payload, created_at')
        .in('form_code', ALL_CODES)
        .eq('finalized', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('report_damage_tracking')
        .select('submission_id, damage_key, status, audit_comment'),
    ]).then(([{ data: subs, error: subErr }, { data: tracking }]) => {
      if (cancelled) return
      if (subErr) { setError(subErr.message); setIsLoading(false); return }

      // Build tracking map: { damageKey: { status, auditComment } }
      const trackMap = {}
      for (const t of (tracking || [])) {
        const key = `${t.submission_id}::${t.damage_key}`
        trackMap[key] = { status: t.status, auditComment: t.audit_comment || '' }
      }

      // Extract and enrich with tracking
      const flat = (subs || []).flatMap(sub => {
        const items = extractDamages(sub)
        return items.map(item => {
          const tkey = `${item.submissionId}::${item.damageKey}`
          const tr   = trackMap[tkey]
          return tr ? { ...item, status: tr.status, auditComment: tr.auditComment } : item
        })
      })

      setAllItems(flat)
      setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // ── KPIs — siempre dataset completo ────────────────────────────────────────
  const totalDamages  = allItems.length
  const totalPending  = useMemo(() => allItems.filter(i => i.status === 'pendiente').length, [allItems])
  const totalRepaired = useMemo(() => allItems.filter(i => i.status === 'reparado').length,  [allItems])
  const totalQuoted   = useMemo(() => allItems.filter(i => i.status === 'cotizado').length,  [allItems])
  const totalRegular  = useMemo(() => allItems.filter(i => i.category === 'Regular').length, [allItems])
  const totalMalo     = useMemo(() => allItems.filter(i => i.category === 'Malo').length,    [allItems])

  // ── Filter options — dinámicas ──────────────────────────────────────────────
  const filterOptions = useMemo(() => ({
    sites:      [...new Set(allItems.map(i => i.idSitio).filter(Boolean))].sort(),
    categories: [...new Set(allItems.map(i => i.category).filter(Boolean))].sort(),
    statuses:   ['pendiente', 'cotizado', 'reparado'],
  }), [allItems])

  // ── Filtrado en memoria ────────────────────────────────────────────────────
  const filteredItems = useMemo(() => allItems.filter(item => {
    if (filters.site     && item.idSitio   !== filters.site)     return false
    if (filters.category && item.category  !== filters.category) return false
    if (filters.status   && item.status    !== filters.status)   return false
    return true
  }), [allItems, filters])

  const totalFiltered = filteredItems.length

  // ── Paginación en memoria ──────────────────────────────────────────────────
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  // ── Setters ────────────────────────────────────────────────────────────────
  const setFilter      = useCallback((key, val) => { setFiltersState(p => ({ ...p, [key]: val })); setCurrentPageState(1) }, [])
  const setCurrentPage = useCallback(p => setCurrentPageState(p), [])
  const setPageSize    = useCallback(size => { setPageSizeState(size); setCurrentPageState(1) }, [])

  // ── updateStatus — optimistic + upsert ─────────────────────────────────────
  const updateStatus = useCallback((damageKey, submissionId, newStatus) => {
    // Optimistic update
    setAllItems(prev =>
      prev.map(item =>
        item.damageKey === damageKey && item.submissionId === submissionId
          ? { ...item, status: newStatus }
          : item
      )
    )

    const userId = useAuthStore.getState().user?.id

    supabase.from('report_damage_tracking').upsert(
      { submission_id: submissionId, damage_key: damageKey, status: newStatus,
        updated_at: new Date().toISOString(), updated_by: userId || null },
      { onConflict: 'submission_id,damage_key' }
    ).then(({ error: err }) => {
      if (err) {
        // Rollback: revert to 'pendiente' on failure
        console.error('[updateStatus] upsert failed:', err.message)
        setAllItems(prev =>
          prev.map(item =>
            item.damageKey === damageKey && item.submissionId === submissionId
              ? { ...item, status: 'pendiente' }
              : item
          )
        )
      }
    })
  }, [])

  // ── updateComment — optimistic + debounced upsert (500ms) ─────────────────
  const updateComment = useCallback((damageKey, submissionId, comment) => {
    // Optimistic update inmediato en UI
    setAllItems(prev =>
      prev.map(item =>
        item.damageKey === damageKey && item.submissionId === submissionId
          ? { ...item, auditComment: comment }
          : item
      )
    )

    // Cancelar debounce anterior para esta key
    const dkey = `${submissionId}::${damageKey}`
    if (debounceRef.current[dkey]) clearTimeout(debounceRef.current[dkey])

    // Snapshot del valor previo para rollback
    const prevComment = allItems.find(
      i => i.damageKey === damageKey && i.submissionId === submissionId
    )?.auditComment ?? ''

    debounceRef.current[dkey] = setTimeout(async () => {
      const userId = useAuthStore.getState().user?.id
      const { error: err } = await supabase
        .from('report_damage_tracking')
        .upsert(
          { submission_id: submissionId, damage_key: damageKey, audit_comment: comment,
            status: allItems.find(i => i.damageKey === damageKey)?.status || 'pendiente',
            updated_at: new Date().toISOString(), updated_by: userId || null },
          { onConflict: 'submission_id,damage_key' }
        )

      if (err) {
        console.error('[updateComment] upsert failed:', err.message)
        // Rollback al valor previo
        setAllItems(prev =>
          prev.map(item =>
            item.damageKey === damageKey && item.submissionId === submissionId
              ? { ...item, auditComment: prevComment }
              : item
          )
        )
      }
    }, 500)
  }, [allItems])

  // ── Export Excel — siempre allItems completo ───────────────────────────────
  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      const rows = allItems.map(item => ({
        'ID Sitio':            item.idSitio      ?? '',
        'Formulario Origen':   item.formLabel     ?? '',
        'Descripción del Daño': item.description  ?? '',
        'Categoría':           item.category      ?? '',
        'Estado':              item.status        ?? '',
        'Comentario Auditoría': item.auditComment ?? '',
        'Fecha':               item.date          ?? '',
      }))
      const ws = utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 14 }, { wch: 36 }, { wch: 40 },
        { wch: 10 }, { wch: 12 }, { wch: 40 }, { wch: 14 },
      ]
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Daños')
      writeFile(wb, `reporte_danos_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      console.error('[exportToExcel damage]', e)
    }
  }, [allItems])

  return {
    allItems, filteredItems, paginatedItems,
    totalDamages, totalPending, totalRepaired, totalQuoted, totalRegular, totalMalo,
    filters, setFilter, filterOptions,
    currentPage, setCurrentPage, pageSize, setPageSize, totalFiltered,
    updateStatus, updateComment,
    exportToExcel,
    isLoading, error,
  }
}
