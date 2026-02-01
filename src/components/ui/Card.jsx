export default function Card({ className = '', children }) {
  return (
    <div className={`bg-white rounded-3xl shadow-soft border border-primary/10 ${className}`}>
      {children}
    </div>
  )
}
