export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-2xl border th-shadow ${className}`}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      {...props}
    >
      {children}
    </div>
  )
}
