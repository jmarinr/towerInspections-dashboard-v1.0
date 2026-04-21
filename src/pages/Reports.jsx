/**
 * Reports.jsx  v4
 * Picker con 10 reportes — 3 existentes + 7 nuevos con badge ✦ NUEVO
 */

import { useState } from 'react'
import { Download, Package, AlertTriangle, ArrowLeft, BarChart2, Lock,
         MapPin, Users, CheckSquare, Clock, Map, TrendingUp, History } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAdminStore } from '../store/useAdminStore'
import useEquipmentInventoryReport  from '../hooks/useEquipmentInventoryReport'
import useDamageReport              from '../hooks/useDamageReport'
import useProductivityReport        from '../hooks/useProductivityReport'
import useSitesCoverageReport       from '../hooks/useSitesCoverageReport'
import useInspectorQualityReport    from '../hooks/useInspectorQualityReport'
import useFormComplianceReport      from '../hooks/useFormComplianceReport'
import useHistorialSitiosReport     from '../hooks/useHistorialSitiosReport'
import useSlaReport                 from '../hooks/useSlaReport'
import useGeoMapReport              from '../hooks/useGeoMapReport'
import useGroupedDamageReport       from '../hooks/useGroupedDamageReport'
import useMonthlyTrendReport        from '../hooks/useMonthlyTrendReport'
import EquipmentInventoryReport     from './reports/EquipmentInventoryReport'
import DamageReport                 from './reports/DamageReport'
import ProductivityReport           from './reports/ProductivityReport'
import SitesCoverageReport          from './reports/SitesCoverageReport'
import InspectorQualityReport       from './reports/InspectorQualityReport'
import FormComplianceReport         from './reports/FormComplianceReport'
import HistorialSitiosReport        from './reports/HistorialSitiosReport'
import SlaReport                    from './reports/SlaReport'
import GeoMapReport                 from './reports/GeoMapReport'
import GroupedDamageReport          from './reports/GroupedDamageReport'
import MonthlyTrendReport           from './reports/MonthlyTrendReport'

const REPORTS = [
  {
    id: 'equipment-inventory', label: 'Equipment Inventory',
    description: 'All equipment recorded per site · Tower and Carriers · Excel export',
    descriptionShort: 'Equipment per site · Tower & Carriers',
    icon: Package, color: '#0284C7', colorLight: '#e0f2fe',
    component: EquipmentInventoryReport, isNew: false,
  },
  {
    id: 'damage-report', label: 'Damage Report',
    description: 'Regular and Malo items · Prev. Maintenance, Grounding, Safety Climbing · Status tracking',
    descriptionShort: 'Regular & Malo items · Status tracking',
    icon: AlertTriangle, color: '#dc2626', colorLight: '#fee2e2',
    component: DamageReport, isNew: false,
  },
  {
    id: 'productivity', label: 'Productivity Report',
    description: 'Form & order timing · Historical benchmarks · Traffic light per form',
    descriptionShort: 'Timing per order & form · Benchmarks',
    icon: BarChart2, color: '#6366f1', colorLight: '#eef2ff',
    component: ProductivityReport, isNew: false,
  },
  {
    id: 'sites-coverage', label: 'Cobertura de Sitios',
    description: 'Días desde la última visita por sitio · Alertas de vencimiento · 79 sitios únicos',
    descriptionShort: 'Días sin visita por sitio · Alertas',
    icon: MapPin, color: '#0891b2', colorLight: '#cffafe',
    component: SitesCoverageReport, isNew: true,
  },
  {
    id: 'inspector-quality', label: 'Calidad por Inspector',
    description: 'Score de calidad por inspector · Tasa de cierre · Completitud de formularios',
    descriptionShort: 'Score calidad · Tasa cierre · Forms',
    icon: Users, color: '#7c3aed', colorLight: '#ede9fe',
    component: InspectorQualityReport, isNew: true,
  },
  {
    id: 'form-compliance', label: 'Cumplimiento de Formularios',
    description: 'Tasa de completitud por formulario · Tendencia mensual · Identificar cuellos de botella',
    descriptionShort: 'Completitud por form · Tendencia',
    icon: CheckSquare, color: '#059669', colorLight: '#d1fae5',
    component: FormComplianceReport, isNew: true,
  },
  {
    id: 'historial-sitios', label: 'Historial por Sitio',
    description: 'Sitios con múltiples visitas · Progresión de completitud entre visitas · Mejoras y retrocesos',
    descriptionShort: 'Multi-visita · Progresión calidad',
    icon: History, color: '#d97706', colorLight: '#fef3c7',
    component: HistorialSitiosReport, isNew: true,
  },
  {
    id: 'sla-report', label: 'SLA de Cierre',
    description: 'Órdenes envejecidas · Distribución de duración · Alertas por inspector',
    descriptionShort: 'Órdenes abiertas · Duración · SLA',
    icon: Clock, color: '#e11d48', colorLight: '#ffe4e6',
    component: SlaReport, isNew: true,
  },
  {
    id: 'geo-map', label: 'Dispersión Geográfica',
    description: 'Scatter plot de coordenadas GPS · 82 sitios con ubicación · Cobertura por región',
    descriptionShort: 'GPS scatter · 82 sitios con coords',
    icon: Map, color: '#0f766e', colorLight: '#ccfbf1',
    component: GeoMapReport, isNew: true,
  },
  {
    id: 'monthly-trend', label: 'Tendencia Mensual',
    description: 'Órdenes y formularios por mes · Tasas de cierre y completitud · Por inspector',
    descriptionShort: 'Volumen mensual · Tasas · Inspectores',
    icon: TrendingUp, color: '#be123c', colorLight: '#ffe4e6',
    component: MonthlyTrendReport, isNew: true,
  },
  {
    id: 'grouped-damage', label: 'Daños Agrupados por Descripción',
    description: 'Agrupación por tipo de daño · Sitios afectados por grupo · Cotización y ruta de correctivo',
    descriptionShort: 'Daños agrupados · Sitios afectados · Cotización',
    icon: AlertTriangle, color: '#d97706', colorLight: '#fef3c7',
    component: GroupedDamageReport, isNew: true,
  },
]

function NewBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
      style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fde047' }}>
      ✦ Nuevo
    </span>
  )
}

function BetaBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
      style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      beta
    </span>
  )
}

// ── Picker ────────────────────────────────────────────────────────────────────
function ReportPicker({ onSelect }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-[22px] font-bold th-text-p leading-tight">Reportes</h1>
          <BetaBadge />
        </div>
        <p className="text-[13px] th-text-m">Selecciona un reporte para visualizar y exportar datos.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {REPORTS.map(r => {
          const Icon = r.icon
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="flex flex-col items-center text-center rounded-2xl p-5 th-shadow border transition-all relative"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.transform   = 'translateY(-3px)'
                e.currentTarget.style.boxShadow   = `0 8px 28px ${r.color}28`
                e.currentTarget.style.borderColor = `${r.color}44`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform   = 'none'
                e.currentTarget.style.boxShadow   = 'var(--shadow-card)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}>

              {r.isNew && (
                <div className="absolute top-3 right-3">
                  <NewBadge />
                </div>
              )}

              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${r.color}dd, ${r.color})` }}>
                <Icon size={24} strokeWidth={1.8} color="#fff" />
              </div>

              <div className="font-bold text-[13px] th-text-p mb-1 leading-snug">{r.label}</div>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {r.descriptionShort}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Wrapper de reporte con header ─────────────────────────────────────────────
function ReportWrapper({ reportDef, hook, onBack }) {
  const { component: Component, label, color, isNew } = reportDef
  const { exportToExcel, isLoading } = hook

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] font-semibold th-text-m hover:th-text-p transition-colors">
            <ArrowLeft size={15} /> Reportes
          </button>
          <span className="th-text-m">/</span>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold th-text-p">{label}</h1>
            {isNew && <NewBadge />}
          </div>
        </div>
        {exportToExcel && (
          <button onClick={exportToExcel} disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98] flex-shrink-0 disabled:opacity-50"
            style={{ background: '#0284C7', boxShadow: '0 2px 8px rgba(2,132,199,0.22)' }}>
            <Download size={14} strokeWidth={2} />
            Descargar Excel
          </button>
        )}
      </div>
      <Component hook={hook} />
    </div>
  )
}

// ── Contenedor principal ──────────────────────────────────────────────────────
export default function Reports() {
  const [activeId, setActiveId] = useState(null)
  const user       = useAuthStore(s => s.user)
  const permMatrix = useAdminStore(s => s.permMatrix)
  const hasPermission = (key) => {
    if (!user) return false
    if (user.role === 'admin') return true
    const mk = `${user.role}:${key}`
    return mk in permMatrix ? permMatrix[mk] === true : (user.canWrite || false)
  }

  // Todos los hooks siempre activos (Rules of Hooks)
  const equipmentHook    = useEquipmentInventoryReport()
  const damageHook       = useDamageReport()
  const productivityHook = useProductivityReport()
  const coverageHook     = useSitesCoverageReport()
  const qualityHook      = useInspectorQualityReport()
  const complianceHook   = useFormComplianceReport()
  const historialHook    = useHistorialSitiosReport()
  const slaHook          = useSlaReport()
  const geoHook          = useGeoMapReport()
  const groupedDamageHook  = useGroupedDamageReport()
  const trendHook          = useMonthlyTrendReport()

  const hookMap = {
    'equipment-inventory': equipmentHook,
    'damage-report':       damageHook,
    'productivity':        productivityHook,
    'sites-coverage':      coverageHook,
    'inspector-quality':   qualityHook,
    'form-compliance':     complianceHook,
    'historial-sitios':    historialHook,
    'sla-report':          slaHook,
    'geo-map':             geoHook,
    'monthly-trend':       trendHook,
    'grouped-damage':      groupedDamageHook,
  }

  // Guard de acceso
  if (!hasPermission('reports.view')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
          <Lock size={22} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-[14px] font-semibold th-text-p">Sin acceso a Reportes</p>
        <p className="text-[12px] th-text-m">Tu rol no tiene permiso para ver esta sección. Contacta a un administrador.</p>
      </div>
    )
  }

  // Picker
  if (!activeId) {
    return <ReportPicker onSelect={setActiveId} />
  }

  const reportDef = REPORTS.find(r => r.id === activeId)
  if (!reportDef) return <ReportPicker onSelect={setActiveId} />

  // Reporte activo — pasamos el hook por prop
  const activeHook = hookMap[activeId]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveId(null)}
            className="flex items-center gap-1.5 text-[13px] font-semibold th-text-m hover:th-text-p transition-colors">
            <ArrowLeft size={15} /> Reportes
          </button>
          <span className="th-text-m">/</span>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold th-text-p">{reportDef.label}</h1>
            {reportDef.isNew && <NewBadge />}
          </div>
        </div>
        {hasPermission('reports.export_excel') && activeHook?.exportToExcel && (
          <button onClick={activeHook.exportToExcel} disabled={activeHook.isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98] flex-shrink-0 self-start disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#0284C7', boxShadow: '0 2px 8px rgba(2,132,199,0.22)' }}>
            <Download size={14} strokeWidth={2} />
            Descargar Excel
          </button>
        )}
      </div>
      <reportDef.component {...(reportDef.isNew ? { hook: activeHook } : { hookData: activeHook })} />
    </div>
  )
}

