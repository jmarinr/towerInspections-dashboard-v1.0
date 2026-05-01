/**
 * TowerEquipmentTable.jsx
 * Tabla de equipos instalados en torre.
 * Fila resaltada al hacer clic en el nodo del diagrama.
 * Acciones de editar/eliminar deshabilitadas (Fase 2).
 */
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

const EQUIPMENT_COLORS = {
  'RF':      '#0284C7',
  'RRU':     '#7c3aed',
  'MW':      '#f59e0b',
  'default': '#64748b',
}

function getColor(type) {
  if (!type) return EQUIPMENT_COLORS.default
  const t = type.toUpperCase()
  if (t.includes('MW'))  return EQUIPMENT_COLORS.MW
  if (t.includes('RRU')) return EQUIPMENT_COLORS.RRU
  if (t.includes('RF'))  return EQUIPMENT_COLORS.RF
  return EQUIPMENT_COLORS.default
}

const PAGE_SIZE = 20

export default function TowerEquipmentTable({ equipment = [], activeIdx, onRowClick }) {
  const [page, setPage] = useState(1)
  const paginated  = equipment.length > PAGE_SIZE
    ? equipment.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : equipment
  const totalPages = Math.ceil(equipment.length / PAGE_SIZE)

  if (!equipment.length) {
    return (
      <div className="text-center py-8 text-[13px] th-text-m">
        Sin equipos registrados en torre para este sitio.
      </div>
    )
  }

  const Val = ({ v }) => v != null && v !== ''
    ? <span>{v}</span>
    : <span className="th-text-m">—</span>

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border th-border">
        <table className="w-full text-[12px]" style={{ minWidth: 700, background: 'var(--bg-card)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
              {['Altura','Orientación','Tipo antena','Cant.','Alto','Diám.','Ancho','Prof.','Área m²','Carrier','Comentario',''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold th-text-m uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, i) => {
              const globalIdx = (page - 1) * PAGE_SIZE + i
              const isActive  = activeIdx === globalIdx
              const color     = getColor(item.equipType)
              return (
                <tr key={globalIdx}
                  onClick={() => onRowClick?.(globalIdx)}
                  style={{
                    borderTop: '0.5px solid var(--border-light)',
                    background: isActive ? 'var(--row-hover-bg)' : '',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--row-hover-bg)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}>

                  <td className="px-3 py-2.5 font-mono font-semibold whitespace-nowrap"
                    style={{ color: '#0284C7' }}>
                    {item.heightM != null ? `${item.heightM} m` : '—'}
                  </td>
                  <td className="px-3 py-2.5 th-text-s whitespace-nowrap">
                    {item.degrees != null ? `${item.degrees}°` : ''}
                    {item.orientation && <span className="th-text-m ml-1 text-[11px]">{item.orientation}</span>}
                    {!item.degrees && !item.orientation && <span className="th-text-m">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: `${color}18`, color }}>
                      {item.equipType || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 th-text-p"><Val v={item.quantity} /></td>
                  <td className="px-3 py-2.5 th-text-s text-[11px]"><Val v={item.high} /></td>
                  <td className="px-3 py-2.5 th-text-s text-[11px]"><Val v={item.diameter} /></td>
                  <td className="px-3 py-2.5 th-text-s text-[11px]"><Val v={item.width} /></td>
                  <td className="px-3 py-2.5 th-text-s text-[11px]"><Val v={item.depth} /></td>
                  <td className="px-3 py-2.5 font-semibold th-text-p"><Val v={item.areaM2} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {item.carrier
                      ? <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: 'var(--bg-base)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}>
                          {item.carrier}
                        </span>
                      : <span className="th-text-m">—</span>}
                  </td>
                  <td className="px-3 py-2.5 th-text-m text-[11px] max-w-[120px] truncate">
                    {item.comment || '—'}
                  </td>
                  {/* Acciones Fase 2 — deshabilitadas */}
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button disabled title="Disponible en Fase 2"
                        className="p-1 rounded opacity-30 cursor-not-allowed">
                        <Pencil size={11} />
                      </button>
                      <button disabled title="Disponible en Fase 2"
                        className="p-1 rounded opacity-30 cursor-not-allowed">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {equipment.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3 text-[12px] th-text-m">
          <span>Mostrando {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, equipment.length)} de {equipment.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p-1)} disabled={page === 1}
              className="px-3 py-1 rounded-lg border th-border th-bg-card disabled:opacity-40">← Anterior</button>
            <button onClick={() => setPage(p => p+1)} disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border th-border th-bg-card disabled:opacity-40">Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  )
}
