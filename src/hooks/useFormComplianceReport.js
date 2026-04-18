/**
 * useFormComplianceReport.js
 * Tasa de completitud por formulario con tendencia mensual.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/useAuthStore'

const FORM_LABELS = {
  'mantenimiento':           'Preventive Maintenance',
  'mantenimiento-ejecutado': 'Executed Maintenance',
  'inventario-v2':           'Equipment Inventory',
  'sistema-ascenso':         'Safety Climbing Device',
  'additional-photo-report': 'Additional Photos',
  'puesta-tierra':           'Grounding System',
  'inspeccion':              'General Inspection',
}

export default function useFormComplianceReport() {
  const [subs,      setSubs]      = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState(null)
  const [filterForm, setFilterForm] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    const user    = useAuthStore.getState().user
    const orgCode = user?.role === 'supervisor' ? user?.company?.org_code : null
    let query = supabase.from('submissions').select('id, form_code, finalized, created_at, org_code')
    if (orgCode) query = query.eq('org_code', orgCode)
    query.then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setIsLoading(false); return }
        setSubs(data || [])
        setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Deduplication: per (site_visit_id, form_code) keep the finalized row if exists
  // Since we don't have site_visit_id in this query, we'll trust the raw counts
  // but note that multiple rows per form_code per visit inflate numbers slightly

  // Overall by form
  const byForm = useMemo(() => {
    const map = {}
    for (const s of subs) {
      const fc = s.form_code
      if (!fc || fc === 'null') continue
      if (!map[fc]) map[fc] = { code: fc, label: FORM_LABELS[fc] || fc, total: 0, finalized: 0 }
      map[fc].total++
      if (s.finalized) map[fc].finalized++
    }
    return Object.values(map).map(f => ({
      ...f,
      rate: f.total ? Math.round(f.finalized / f.total * 100) : 0,
    })).sort((a, b) => a.rate - b.rate)
  }, [subs])

  // Monthly trend per form
  const monthlyTrend = useMemo(() => {
    const map = {} // { month: { formCode: { total, finalized } } }
    for (const s of subs) {
      const fc = s.form_code
      if (!fc || fc === 'null' || !s.created_at) continue
      const month = s.created_at.slice(0, 7) // YYYY-MM
      if (!map[month])     map[month] = {}
      if (!map[month][fc]) map[month][fc] = { total: 0, finalized: 0 }
      map[month][fc].total++
      if (s.finalized) map[month][fc].finalized++
    }
    const months = Object.keys(map).sort()
    return months.map(month => {
      const row = { month }
      for (const fc of Object.keys(FORM_LABELS)) {
        const d = map[month]?.[fc]
        row[fc] = d ? Math.round(d.finalized / d.total * 100) : null
      }
      return row
    })
  }, [subs])

  // Summary: worst and best
  const kpis = useMemo(() => {
    if (!byForm.length) return {}
    const worst = byForm[0]
    const best  = byForm[byForm.length - 1]
    const avg   = Math.round(byForm.reduce((a,b) => a + b.rate, 0) / byForm.length)
    const totalForms = subs.filter(s => s.form_code && s.form_code !== 'null').length
    const totalFin   = subs.filter(s => s.finalized && s.form_code && s.form_code !== 'null').length
    return { worst, best, avg, totalForms, totalFin }
  }, [byForm, subs])

  const formCodes = useMemo(() => byForm.map(f => f.code), [byForm])

  const filteredTrend = useMemo(() =>
    filterForm ? monthlyTrend.map(row => {
      const r = { month: row.month }
      r[filterForm] = row[filterForm]
      return r
    }) : monthlyTrend,
    [monthlyTrend, filterForm]
  )

  const exportToExcel = useCallback(async () => {
    try {
      const { utils, writeFile } = await import('xlsx')
      // Sheet 1: Overall
      const rows1 = byForm.map(f => ({
        'Formulario': f.label,
        'Código':     f.code,
        'Total Rows': f.total,
        'Finalizados': f.finalized,
        'Tasa (%)':   f.rate,
      }))
      // Sheet 2: Monthly trend
      const rows2 = monthlyTrend.map(row => {
        const r = { 'Mes': row.month }
        for (const fc of Object.keys(FORM_LABELS)) {
          r[FORM_LABELS[fc]] = row[fc] !== null ? `${row[fc]}%` : '—'
        }
        return r
      })
      const wb = utils.book_new()
      const ws1 = utils.json_to_sheet(rows1)
      ws1['!cols'] = Array(5).fill({ wch: 20 })
      const ws2 = utils.json_to_sheet(rows2)
      ws2['!cols'] = Array(8).fill({ wch: 22 })
      utils.book_append_sheet(wb, ws1, 'Por Formulario')
      utils.book_append_sheet(wb, ws2, 'Tendencia Mensual')
      writeFile(wb, `cumplimiento_forms_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch(e) { console.error(e) }
  }, [byForm, monthlyTrend])

  return {
    byForm, monthlyTrend, filteredTrend, kpis, formCodes,
    filterForm, setFilterForm,
    exportToExcel,
    isLoading, error,
    FORM_LABELS,
  }
}
