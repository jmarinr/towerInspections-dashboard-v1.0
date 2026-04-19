/**
 * ReportInfo.jsx
 * Panel expandible con descripción, uso e interpretación de cada reporte.
 * Se coloca justo debajo de los KPIs para fácil acceso sin estorbar la vista.
 */
import { useState } from 'react'
import { Info, ChevronDown, ChevronUp } from 'lucide-react'

export default function ReportInfo({ title, description, howToUse, howToInterpret }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors"
        style={{ background: open ? 'var(--bg-base)' : 'var(--bg-card)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
        onMouseLeave={e => e.currentTarget.style.background = open ? 'var(--bg-base)' : 'var(--bg-card)'}>
        <Info size={13} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span className="text-[12px] font-semibold flex-1" style={{ color: 'var(--accent)' }}>
          Guía del reporte — {title}
        </span>
        {open
          ? <ChevronUp  size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </button>

      {/* Panel expandible */}
      {open && (
        <div className="px-5 py-4 space-y-4 text-[13px]"
          style={{ borderTop: '1px solid var(--border-light)' }}>

          {/* Descripción */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}>¿Qué muestra este reporte?</div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{description}</p>
          </div>

          {/* Cómo usarlo */}
          {howToUse && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Cómo utilizarlo</div>
              <ul className="space-y-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {howToUse.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: 'var(--accent)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cómo interpretar */}
          {howToInterpret && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-muted)' }}>Cómo interpretar los datos</div>
              <ul className="space-y-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {howToInterpret.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: '#f59e0b' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
