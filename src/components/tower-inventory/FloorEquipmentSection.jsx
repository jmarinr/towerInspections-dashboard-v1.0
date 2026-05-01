/**
 * FloorEquipmentSection.jsx
 * Sección de equipos en piso agrupados por carrier.
 */

export default function FloorEquipmentSection({ floorEquipment = [] }) {
  if (!floorEquipment.length) {
    return (
      <div className="text-center py-6 text-[13px] th-text-m">
        Sin equipos en piso registrados para este sitio.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {floorEquipment.map((carrier, ci) => (
        <div key={ci} className="rounded-xl border th-border overflow-hidden"
          style={{ background: 'var(--bg-card)' }}>
          {/* Header del carrier */}
          <div className="flex items-center gap-3 px-4 py-3 border-b th-border-l"
            style={{ background: 'var(--bg-base)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[11px]"
              style={{ background: 'var(--stat-accent-bg)', color: 'var(--stat-accent-text)' }}>
              {(carrier.carrierName || '?').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-[13px] font-semibold th-text-p">
                {carrier.carrierName || 'Sin nombre'}
              </div>
              {carrier.clientType && (
                <div className="text-[11px] th-text-m">{carrier.clientType}</div>
              )}
            </div>
            {carrier.areaInUse != null && (
              <div className="ml-auto text-[12px] th-text-m">
                Área en uso: <span className="font-semibold th-text-p">{carrier.areaInUse} m²</span>
              </div>
            )}
          </div>

          {/* Tabla de gabinetes */}
          {carrier.cabinets?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {['Gabinete','Largo (m)','Ancho (m)','Alto (m)','Foto #'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold th-text-m uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {carrier.cabinets.map((cab, gi) => (
                    <tr key={gi} style={{ borderTop: '0.5px solid var(--border-light)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td className="px-4 py-2.5 font-medium th-text-p">{cab.name || `Gab. ${gi+1}`}</td>
                      <td className="px-4 py-2.5 font-mono th-text-s">{cab.length ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono th-text-s">{cab.width  ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono th-text-s">{cab.height ?? '—'}</td>
                      <td className="px-4 py-2.5 th-text-m">{cab.photo ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Items de equipo del carrier (si los tiene) */}
          {carrier.items?.length > 0 && carrier.cabinets?.length === 0 && (
            <div className="px-4 py-3 text-[12px] th-text-m">
              {carrier.items.length} equipo{carrier.items.length !== 1 ? 's' : ''} registrado{carrier.items.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
