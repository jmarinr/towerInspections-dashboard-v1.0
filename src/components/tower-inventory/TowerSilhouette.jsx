/**
 * TowerSilhouette.jsx
 * Siluetas SVG por tipo de estructura de torre.
 * Diseñadas para un viewBox de 80x400 (ancho x alto del diagrama).
 */

const cx = 40 // centro horizontal

export default function TowerSilhouette({ structureType, height = 400, color = '#cbd5e1' }) {
  const type = (structureType || '').toLowerCase()

  if (type.includes('autosoportada') || type.includes('auto')) {
    return <AutosoportadaSilhouette height={height} color={color} />
  }
  if (type.includes('monopolo') || type.includes('mono')) {
    return <MonopoloSilhouette height={height} color={color} />
  }
  if (type.includes('arriostrada') || type.includes('arriostr')) {
    return <ArrioстradaSilhouette height={height} color={color} />
  }
  return <MonopoloSilhouette height={height} color={color} />
}

// ── Autosoportada — triángulo con líneas de refuerzo ─────────────────────────
function AutosoportadaSilhouette({ height, color }) {
  const top = 30
  const bot = height - 20
  const halfBase = 18 // mitad de la base

  // Líneas horizontales de refuerzo
  const levels = 6
  const refuerzo = Array.from({ length: levels }, (_, i) => {
    const y = top + (i + 1) * (bot - top) / (levels + 1)
    const halfW = halfBase * ((y - top) / (bot - top))
    return { y, x1: cx - halfW, x2: cx + halfW }
  })

  return (
    <g stroke={color} strokeWidth="1" fill="none" opacity="0.7">
      {/* Lados del triángulo */}
      <line x1={cx} y1={top} x2={cx - halfBase} y2={bot} />
      <line x1={cx} y1={top} x2={cx + halfBase} y2={bot} />
      {/* Base */}
      <line x1={cx - halfBase - 4} y1={bot} x2={cx + halfBase + 4} y2={bot} />
      {/* Líneas de refuerzo */}
      {refuerzo.map((r, i) => (
        <line key={i} x1={r.x1} y1={r.y} x2={r.x2} y2={r.y} />
      ))}
      {/* Patas de la base */}
      <line x1={cx - halfBase} y1={bot} x2={cx - halfBase - 4} y2={bot + 8} />
      <line x1={cx + halfBase} y1={bot} x2={cx + halfBase + 4} y2={bot + 8} />
    </g>
  )
}

// ── Monopolo — línea vertical ─────────────────────────────────────────────────
function MonopoloSilhouette({ height, color }) {
  const top = 30
  const bot = height - 20
  return (
    <g stroke={color} fill="none" opacity="0.7">
      {/* Fuste — más grueso en la base */}
      <line x1={cx} y1={top} x2={cx} y2={bot} strokeWidth="3" />
      {/* Base */}
      <ellipse cx={cx} cy={bot + 4} rx={8} ry={4} strokeWidth="1" opacity="0.5" />
    </g>
  )
}

// ── Arriostrada — dos lados con cables tensores ──────────────────────────────
function ArrioстradaSilhouette({ height, color }) {
  const top = 30
  const bot = height - 20
  const hw  = 5  // half width fuste

  return (
    <g stroke={color} fill="none" opacity="0.7">
      {/* Fuste */}
      <line x1={cx - hw} y1={top} x2={cx - hw} y2={bot} strokeWidth="1" />
      <line x1={cx + hw} y1={top} x2={cx + hw} y2={bot} strokeWidth="1" />
      {/* Cables tensores punteados */}
      <line x1={cx} y1={top + 20} x2={cx - 30} y2={bot} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
      <line x1={cx} y1={top + 20} x2={cx + 30} y2={bot} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
      {/* Base */}
      <line x1={cx - 12} y1={bot} x2={cx + 12} y2={bot} strokeWidth="1.5" />
      <line x1={cx - 12} y1={bot} x2={cx - 16} y2={bot + 8} strokeWidth="1" />
      <line x1={cx + 12} y1={bot} x2={cx + 16} y2={bot + 8} strokeWidth="1" />
    </g>
  )
}
