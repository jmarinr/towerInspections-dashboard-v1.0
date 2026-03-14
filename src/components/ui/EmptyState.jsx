export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-light)', border: '1px solid var(--border)' }}>
        <Icon size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <div className="font-semibold th-text-p text-sm">{title}</div>
      {description && <div className="text-[12px] th-text-m mt-1 max-w-xs">{description}</div>}
    </div>
  )
}
