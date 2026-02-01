export default function Input({ label, hint, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-xs font-bold text-primary/70 mb-2">{label}</div>}
      <input
        className="w-full h-12 px-4 rounded-2xl border border-primary/15 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
        {...props}
      />
      {hint && <div className="text-[11px] text-primary/60 mt-2">{hint}</div>}
    </label>
  )
}
