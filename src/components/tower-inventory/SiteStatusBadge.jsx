import { STATUS_COLORS, STATUS_LABELS } from '../../hooks/useTowerInventory'

export default function SiteStatusBadge({ status, size = 'sm' }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.operative
  const label = STATUS_LABELS[status] || status

  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  const fs  = size === 'sm' ? 'text-[10px]' : 'text-[11px]'

  return (
    <span className={`inline-flex items-center gap-1.5 ${pad} ${fs} font-semibold rounded-full`}
      style={{
        background: `${color}18`,
        color,
        border: `0.5px solid ${color}44`,
      }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}
