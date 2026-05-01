/**
 * TowerDiagram.jsx
 * Diagrama SVG interactivo de la torre con equipos posicionados
 * a escala real según su altura en metros.
 */
import { useState } from 'react'
import TowerSilhouette from './TowerSilhouette'

const DIAGRAM_W      = 280
const DIAGRAM_H      = 400
const DIAGRAM_TOP_Y  = 40
const DIAGRAM_BOT_Y  = 370
const CX             = 140  // centro horizontal

const EQUIPMENT_COLORS = {
  'RF':      '#0284C7',
  'RRU':     '#7c3aed',
  'MW':      '#f59e0b',
  'default': '#64748b',
}

function getColor(equipType) {
  if (!equipType) return EQUIPMENT_COLORS.default
  const t = equipType.toUpperCase()
  if (t.includes('MW'))  return EQUIPMENT_COLORS.MW
  if (t.includes('RRU')) return EQUIPMENT_COLORS.RRU
  if (t.includes('RF'))  return EQUIPMENT_COLORS.RF
  return EQUIPMENT_COLORS.default
}

function getY(heightM, towerHeight) {
  if (!heightM || !towerHeight) return DIAGRAM_BOT_Y - 20
  const clamp = Math.min(heightM, towerHeight)
  return DIAGRAM_BOT_Y - (clamp / towerHeight) * (DIAGRAM_BOT_Y - DIAGRAM_TOP_Y)
}

function getSide(degrees) {
  if (degrees == null) return 'right'
  const d = Number(degrees)
  if (d >= 0 && d < 180) return 'left'
  return 'right'
}

export default function TowerDiagram({ equipment = [], siteInfo, onEquipmentClick, activeIdx }) {
  const [tooltip, setTooltip] = useState(null)
  const towerHeight = siteInfo?.heightM || 40

  // Agrupar por altura + lado para evitar solapamientos
  const positioned = equipment.map((item, i) => {
    const y    = getY(item.heightM, towerHeight)
    const side = item.orientation ? getSide(item.degrees) : (i % 2 === 0 ? 'left' : 'right')
    const x    = side === 'left' ? CX - 32 : CX + 32
    const color = getColor(item.equipType)
    return { ...item, y, x, side, color, idx: i }
  })

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${DIAGRAM_W} ${DIAGRAM_H + 30}`}
        width="100%"
        style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>

        {/* Fondo y escala */}
        <rect x={0} y={0} width={DIAGRAM_W} height={DIAGRAM_H + 30} fill="none" />

        {/* Silueta de la torre */}
        <TowerSilhouette structureType={siteInfo?.structureType} height={DIAGRAM_H} color="var(--color-border-secondary)" />

        {/* Líneas de escala (cada 10m) */}
        {Array.from({ length: Math.ceil(towerHeight / 10) + 1 }, (_, i) => {
          const m = i * 10
          if (m > towerHeight) return null
          const y = getY(m, towerHeight)
          return (
            <g key={m}>
              <line x1={CX - 60} y1={y} x2={CX - 52} y2={y} stroke="var(--color-border-tertiary)" strokeWidth="0.8" />
              <text x={CX - 63} y={y + 3.5} textAnchor="end" fontSize="9" fill="var(--color-text-secondary)">{m}m</text>
            </g>
          )
        })}

        {/* Nodos de equipos */}
        {positioned.map(item => {
          const isActive = activeIdx === item.idx
          return (
            <g key={item.idx}
              style={{ cursor: 'pointer' }}
              onClick={() => onEquipmentClick?.(item.idx)}
              onMouseEnter={() => setTooltip(item)}
              onMouseLeave={() => setTooltip(null)}>

              {/* Línea horizontal desde torre al nodo */}
              <line
                x1={item.side === 'left' ? CX - 5 : CX + 5}
                y1={item.y}
                x2={item.x}
                y2={item.y}
                stroke={item.color}
                strokeWidth="0.8"
                opacity="0.5"
              />

              {/* Nodo */}
              <circle
                cx={item.x}
                cy={item.y}
                r={isActive ? 7 : 5.5}
                fill={item.color}
                stroke="var(--color-background-primary)"
                strokeWidth="1.5"
                opacity={isActive ? 1 : 0.85}
              />

              {/* Label del tipo */}
              <text
                x={item.side === 'left' ? item.x - 10 : item.x + 10}
                y={item.y + 3.5}
                textAnchor={item.side === 'left' ? 'end' : 'start'}
                fontSize="8.5"
                fill={item.color}
                fontWeight="500">
                {item.equipType || '?'}
              </text>
            </g>
          )
        })}

        {/* Tooltip inline */}
        {tooltip && (() => {
          const tx = tooltip.side === 'left' ? CX + 8 : CX - 8 - 100
          const ty = Math.max(DIAGRAM_TOP_Y + 10, tooltip.y - 30)
          return (
            <g>
              <rect x={tx} y={ty} width={100} height={48} rx={5}
                fill="var(--color-background-primary)"
                stroke="var(--color-border-secondary)"
                strokeWidth="0.8"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
              <text x={tx + 7} y={ty + 13} fontSize="9" fontWeight="600" fill={tooltip.color}>
                {tooltip.equipType || 'Equipo'}
              </text>
              <text x={tx + 7} y={ty + 24} fontSize="8.5" fill="var(--color-text-secondary)">
                {tooltip.heightM != null ? `${tooltip.heightM}m` : '—'} · {tooltip.carrier || '—'}
              </text>
              <text x={tx + 7} y={ty + 35} fontSize="8.5" fill="var(--color-text-secondary)">
                {tooltip.degrees != null ? `${tooltip.degrees}°` : ''} {tooltip.orientation || ''}
              </text>
              {tooltip.areaM2 != null && (
                <text x={tx + 7} y={ty + 45} fontSize="8" fill="var(--color-text-secondary)">
                  {tooltip.areaM2} m²
                </text>
              )}
            </g>
          )
        })()}

        {/* Leyenda */}
        {[['RF','#0284C7'],['RRU','#7c3aed'],['MW','#f59e0b']].map(([label, color], i) => (
          <g key={label} transform={`translate(${8 + i * 52}, ${DIAGRAM_H + 14})`}>
            <circle cx={6} cy={6} r={4} fill={color} opacity="0.85" />
            <text x={13} y={10} fontSize="9" fill="var(--color-text-secondary)">{label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
