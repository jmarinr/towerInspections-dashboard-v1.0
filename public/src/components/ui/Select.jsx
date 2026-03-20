export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border px-3 py-2 text-sm transition-all outline-none th-text-p th-bg-input ${className}`}
      style={{ borderColor: 'var(--border)' }}
      onFocus={e  => { e.target.style.borderColor = '#0284C7'; e.target.style.boxShadow = '0 0 0 3px rgba(2,132,199,0.18)' }}
      onBlur={e   => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
      {...props}
    >
      {children}
    </select>
  )
}
