export default function Badge({ tone = 'neutral', className = '', children }) {
  const tones = {
    neutral: 'bg-primary/8 text-primary',
    accent: 'bg-accent/20 text-primary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/15 text-danger',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
