const base = 'inline-flex items-center justify-center gap-2 font-semibold text-sm rounded-lg transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none'

const variants = {
  primary: 'text-white px-4 py-2',
  accent:  'text-white px-4 py-2',
  outline: 'border px-4 py-2',
  ghost:   'px-3 py-2',
  danger:  'text-white px-4 py-2',
}

const styles = {
  primary: { background: '#0d2137', color: '#fff' },
  accent:  { background: '#00b4a0', color: '#fff' },
  outline: { border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'var(--bg-card)' },
  ghost:   { color: 'var(--text-secondary)', background: 'transparent' },
  danger:  { background: '#ef4444', color: '#fff' },
}

export default function Button({ variant = 'accent', className = '', style = {}, children, ...props }) {
  return (
    <button
      className={`${base} ${variants[variant] || variants.accent} ${className}`}
      style={{ ...styles[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
