export default function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-bold text-primary/60 mb-1.5">{label}</span>}
      <input
        className={`w-full rounded-2xl border border-primary/12 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-primary/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all ${className}`}
        {...props}
      />
    </label>
  )
}
