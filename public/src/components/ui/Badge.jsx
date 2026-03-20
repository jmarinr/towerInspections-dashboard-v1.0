// Mapa de tone → colores semánticos del design system
const tones = {
  neutral:  { bg: 'var(--bg-base)',    color: 'var(--text-secondary)' },
  success:  { bg: '#f0fdf4',           color: '#166534' },
  warning:  { bg: '#fffbeb',           color: '#92400e' },
  danger:   { bg: '#fef2f2',           color: '#991b1b' },
  teal:     { bg: '#e0f2fe',           color: '#0369a1' },
  info:     { bg: '#eff6ff',           color: '#1d4ed8' },
  blue:     { bg: '#eff6ff',           color: '#1d4ed8' },
  purple:   { bg: '#f5f3ff',           color: '#6d28d9' },
  emerald:  { bg: '#f0fdf4',           color: '#065f46' },
  indigo:   { bg: '#eef2ff',           color: '#4338ca' },
  orange:   { bg: '#fff7ed',           color: '#c2410c' },
}

export default function Badge({ tone = 'neutral', className = '', style = {}, children }) {
  const colors = tones[tone] || tones.neutral
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: colors.bg, color: colors.color, ...style }}
    >
      {children}
    </span>
  )
}
