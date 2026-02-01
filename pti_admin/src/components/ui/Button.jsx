export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/95 shadow-soft',
    accent: 'bg-accent text-primary hover:bg-accent/95 shadow-soft',
    ghost: 'bg-white/0 hover:bg-white/10 text-white',
    soft: 'bg-white text-primary hover:bg-white/90 shadow-soft',
    danger: 'bg-danger text-white hover:bg-danger/95 shadow-soft',
    outline: 'border border-primary/15 bg-white text-primary hover:bg-primary/5',
  }
  const sizes = {
    sm: 'h-10 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-5 text-[15px]',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
