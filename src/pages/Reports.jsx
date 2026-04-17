/**
 * Reports.jsx
 * – Badge Beta junto al título
 * – Botón Descargar Excel en el header (misma fila que selector de reporte)
 * – Un solo hook instanciado aquí; se pasa como hookData al componente activo
 */

import { useState } from 'react'
import { ChevronDown, FileText, Download } from 'lucide-react'
import useEquipmentInventoryReport from '../hooks/useEquipmentInventoryReport'
import EquipmentInventoryReport from './reports/EquipmentInventoryReport'

// Registro de reportes — para agregar uno nuevo: añadir entrada y crear componente + hook
const REPORTS = [
  {
    id:          'equipment-inventory',
    label:       'Inventario de Equipos',
    description: 'Todos los equipos registrados por sitio · Torre y Carriers incluidos',
    component:   EquipmentInventoryReport,
    useHook:     useEquipmentInventoryReport,
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

export default function Reports() {
  const [activeId, setActiveId] = useState(REPORTS[0].id)
  const [dropOpen, setDropOpen] = useState(false)

  const active          = REPORTS.find(r => r.id === activeId) || REPORTS[0]
  const ActiveComponent = active.component

  // Un solo fetch para toda la sección — se pasa como prop al componente activo
  const hookData = active.useHook()
  const { exportToExcel, isLoading } = hookData

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

        {/* Título + descripción */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[22px] font-bold th-text-p leading-tight">{active.label}</h1>
            <BetaBadge />
          </div>
          <p className="text-[13px] th-text-m">{active.description}</p>
        </div>

        {/* Selector de reporte + botón Excel */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Selector */}
          <div className="relative">
            <button
              onClick={() => setDropOpen(o => !o)}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px]
                font-semibold th-text-p th-bg-card transition-all hover:border-sky-400"
              style={{ borderColor: 'var(--border)' }}>
              <FileText size={14} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              {active.label}
              <ChevronDown size={13} strokeWidth={2} style={{
                color: 'var(--text-muted)',
                transform: dropOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform .15s',
              }} />
            </button>

            {dropOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
                <div className="absolute right-0 mt-2 z-20 min-w-[200px] rounded-xl border th-bg-card th-shadow overflow-hidden"
                  style={{ borderColor: 'var(--border)' }}>
                  {REPORTS.map(r => (
                    <button key={r.id}
                      onClick={() => { setActiveId(r.id); setDropOpen(false) }}
                      className="w-full text-left px-4 py-3 text-[13px] transition-colors"
                      style={{
                        color:      r.id === activeId ? 'var(--accent)' : 'var(--text-primary)',
                        fontWeight: r.id === activeId ? 600 : 400,
                        background: r.id === activeId ? 'var(--accent-light)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (r.id !== activeId) e.currentTarget.style.background = 'var(--bg-base)' }}
                      onMouseLeave={e => { if (r.id !== activeId) e.currentTarget.style.background = 'transparent' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Botón Excel */}
          <button
            onClick={exportToExcel}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold
              text-white transition-all hover:opacity-90 active:scale-[.98]
              disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#0284C7', boxShadow: '0 2px 8px rgba(2,132,199,0.22)' }}>
            <Download size={14} strokeWidth={2} />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* Reporte activo — recibe el hookData ya instanciado */}
      <ActiveComponent hookData={hookData} />
    </div>
  )
}
