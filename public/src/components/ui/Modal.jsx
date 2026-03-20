import { X } from 'lucide-react'

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl w-full max-w-lg max-h-[85dvh] overflow-y-auto"
        style={{ background: 'var(--bg-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-3 p-4 sticky top-0 rounded-t-2xl z-10"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-[15px] font-semibold th-text-p">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors th-text-m"
            style={{ background: 'var(--bg-base)' }}
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
