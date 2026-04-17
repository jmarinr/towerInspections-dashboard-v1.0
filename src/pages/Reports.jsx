/**
 * Reports.jsx  v3
 * Pantalla de inicio: grid de tarjetas de colores para seleccionar reporte.
 * Al elegir uno → muestra el reporte con botón ← Reportes para volver al picker.
 * Ambos hooks siempre instanciados (regla de hooks: no condicional).
 */

import { useState } from 'react'
import { Download, Package, AlertTriangle, ArrowLeft } from 'lucide-react'
import useEquipmentInventoryReport from '../hooks/useEquipmentInventoryReport'
import useDamageReport             from '../hooks/useDamageReport'
import EquipmentInventoryReport    from './reports/EquipmentInventoryReport'
import DamageReport                from './reports/DamageReport'

const REPORTS = [
  {
    id:               'equipment-inventory',
    label:            'Equipment Inventory',
    description:      'All equipment recorded per site · Tower and Carriers · Excel export',
    descriptionShort: 'Equipment per site · Tower & Carriers',
    icon:             Package,
    color:            '#0284C7',
    colorLight:       '#e0f2fe',
    colorText:        '#075985',
    component:        EquipmentInventoryReport,
  },
  {
    id:               'damage-report',
    label:            'Damage Report',
    description:      'Regular and Malo items · Prev. Maintenance, Grounding, Safety Climbing · Status tracking',
    descriptionShort: 'Regular & Malo items · Status tracking',
    icon:             AlertTriangle,
    color:            '#dc2626',
    colorLight:       '#fee2e2',
    colorText:        '#991b1b',
    component:        DamageReport,
  },
]

function BetaBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
      style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      beta
    </span>
  )
}

// ── Picker: estilo Audara — tarjetas blancas con ícono cuadrado centrado ───────
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {REPORTS.map(r => {
          const Icon = r.icon
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="flex flex-col items-center text-center rounded-2xl p-6 th-shadow border transition-all"
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

              {/* Ícono — cuadrado redondeado de color, estilo iOS */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${r.color}dd, ${r.color})` }}>
                <Icon size={28} strokeWidth={1.8} color="#fff" />
              </div>

              <div className="font-bold text-[14px] th-text-p mb-1 leading-snug">{r.label}</div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {r.descriptionShort}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Contenedor principal ──────────────────────────────────────────────────────
export default function Reports() {
  const [activeId, setActiveId] = useState(null)

  // Ambos hooks siempre activos (regla de React: no conditional hooks)
  // Fetch en background mientras el usuario ve el picker → datos listos al abrir
  const equipmentHook = useEquipmentInventoryReport()
  const damageHook    = useDamageReport()

  const hookMap = {
    'equipment-inventory': equipmentHook,
    'damage-report':       damageHook,
  }

  // Picker
  if (!activeId) {
    return <ReportPicker onSelect={setActiveId} />
  }

  const active    = REPORTS.find(r => r.id === activeId)
  const hookData  = hookMap[activeId]
  const ActiveComponent = active.component
  const { exportToExcel, isLoading } = hookData

  return (
    <div className="space-y-5">

      {/* Header con botón de regreso */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={() => setActiveId(null)}
            className="inline-flex items-center gap-1.5 text-[13px] th-text-m hover:th-text-p transition-colors mb-2">
            <ArrowLeft size={14} strokeWidth={2} />
            Reportes
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: active.colorLight }}>
              <active.icon size={14} strokeWidth={1.8} style={{ color: active.color }} />
            </div>
            <h1 className="text-[22px] font-bold th-text-p leading-tight">{active.label}</h1>
            <BetaBadge />
          </div>
          <p className="text-[13px] th-text-m mt-1">{active.description}</p>
        </div>

        {/* Botón Excel */}
        <button
          onClick={exportToExcel}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold
            text-white transition-all hover:opacity-90 active:scale-[.98] flex-shrink-0 self-start
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#0284C7', boxShadow: '0 2px 8px rgba(2,132,199,0.22)' }}>
          <Download size={14} strokeWidth={2} />
          Descargar Excel
        </button>
      </div>

      {/* Reporte activo */}
      <ActiveComponent hookData={hookData} />
    </div>
  )
}
