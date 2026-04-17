/**
 * Reports.jsx
 *
 * Contenedor principal de la sección Reportes.
 * Incluye el selector de reporte en el header, preparado para crecer
 * con múltiples reportes sin cambiar la estructura base.
 */

import { useState } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import EquipmentInventoryReport from './reports/EquipmentInventoryReport'

// Registro de reportes disponibles.
// Para agregar uno nuevo: añadir entrada aquí y crear el componente.
const REPORTS = [
  {
    id:          'equipment-inventory',
    label:       'Inventario de Equipos',
    description: 'Todos los equipos registrados por sitio · Exportación completa disponible en Excel',
    component:   EquipmentInventoryReport,
  },
  // Futuras entradas:
  // { id: 'damage-report',   label: 'Reporte de Daños',   description: '...', component: DamageReport },
  // { id: 'inspection-kpis', label: 'KPIs de Inspección', description: '...', component: InspectionKPIs },
]

export default function Reports() {
  const [activeId,  setActiveId]  = useState(REPORTS[0].id)
  const [dropOpen,  setDropOpen]  = useState(false)

  const active = REPORTS.find(r => r.id === activeId) || REPORTS[0]
  const ActiveComponent = active.component

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold th-text-p leading-tight">
            {active.label}
          </h1>
          <p className="text-[13px] th-text-m mt-1">{active.description}</p>
        </div>

        {/* Selector de reporte */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setDropOpen(o => !o)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px]
              font-semibold th-text-p th-bg-card transition-all hover:border-sky-400"
            style={{ borderColor: 'var(--border)' }}>
            <FileText size={14} strokeWidth={2} style={{ color: 'var(--accent)' }} />
            {active.label}
            <ChevronDown size={13} strokeWidth={2}
              style={{ color: 'var(--text-muted)', transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>

          {dropOpen && (
            <>
              {/* Overlay para cerrar al hacer click fuera */}
              <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />

              <div className="absolute right-0 mt-2 z-20 min-w-[220px] rounded-xl border th-bg-card th-shadow overflow-hidden"
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
      </div>

      {/* Reporte activo */}
      <ActiveComponent />

    </div>
  )
}
