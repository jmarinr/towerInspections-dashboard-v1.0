import { X } from 'lucide-react'

export default function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6">
        <div className="w-full sm:max-w-3xl bg-white rounded-3xl shadow-soft border border-primary/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-primary/10">
            <div className="font-extrabold text-primary">{title}</div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl border border-primary/10 hover:bg-primary/5 flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
