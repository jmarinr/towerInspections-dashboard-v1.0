export default function Select({ label, className = '', children, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-xs font-bold text-primary/70 mb-2">{label}</div>}
      <select
        className="w-full h-12 px-4 rounded-2xl border border-primary/15 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
