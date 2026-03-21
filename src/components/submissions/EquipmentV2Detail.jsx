/**
 * EquipmentV2Detail.jsx  —  Inventario de Equipos v2
 * Redesign v3.3.61 — "Precision Field Report"
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Package, Building2, Radio, MapPin, Grid3x3, Camera } from 'lucide-react'

const v   = (x) => (x !== undefined && x !== null && x !== '') ? String(x) : null
const vd  = (x) => v(x) ?? '—'

// ── Collapsible panel ─────────────────────────────────────────────────────────
function Panel({ icon: Icon, title, badge, accent = '#0284C7', ghostNum, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', borderLeft: `3px solid ${accent}` }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left relative overflow-hidden"
        style={{ borderBottom: open ? '1px solid var(--border-light)' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {ghostNum && (
          <span className="absolute right-12 text-[52px] font-black leading-none select-none pointer-events-none"
            style={{ color: accent, opacity: 0.06, top: '-6px' }}>{ghostNum}</span>
        )}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}18`, color: accent }}>
          {Icon && <Icon size={13} strokeWidth={2} />}
        </div>
        <span className="font-semibold text-[13px] flex-1" style={{ color: 'var(--text-primary)' }}>{title}</span>
        {badge && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mr-1"
            style={{ background: `${accent}14`, color: accent }}>{badge}</span>
        )}
        {open
          ? <ChevronDown size={13} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronRight size={13} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  )
}

// ── Site info grid ────────────────────────────────────────────────────────────
function SiteInfoGrid({ info }) {
  if (!info) return null
  const mono = ['Latitud','Longitud','Altura (m)','Fecha Inicio','Fecha Término']

  // Parsear coordenadas si vienen como string "lat, lng"
  let lat = v(info.latitud)
  let lng = v(info.longitud)
  if (!lat && info.coordenadas) {
    const parts = String(info.coordenadas).split(',').map(p => p.trim())
    if (parts.length >= 2) { lat = parts[0]; lng = parts[1] }
    else lat = info.coordenadas
  }

  const fields = [
    ['N° Orden',        v(info.numeroOrden)],
    ['ID Sitio',        v(info.idSitio)],
    ['Nombre Sitio',    v(info.nombreSitio)],
    ['Tipo de Visita',  v(info.tipoVisita)],
    ['Proveedor',       v(info.proveedor)],
    ['Fecha Inicio',    v(info.fechaInicio || info.fecha)],
    ['Fecha Término',   v(info.fechaTermino)],
    ['Altura (m)',      v(info.alturaMts || info.alturaTorre || info.altura)],
    ['Tipo Sitio',      v(info.tipoSitio)],
    ['Tipo Estructura', v(info.tipoEstructura || info.tipoTorre)],
    ['Dirección',       v(info.direccion)],
    ['Latitud',         lat],
    ['Longitud',        lng],
  ].filter(([, val]) => val)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
      {fields.map(([label, value]) => (
        <div key={label}>
          <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          <div className={`text-[13px] font-medium ${mono.includes(label) ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Inventory table ───────────────────────────────────────────────────────────
function InventoryTable({ items, accent = '#DC2626' }) {
  const empty = !items || items.length === 0

  // Fix 5: cálculo de área correcto según tipo de equipo
  const calcArea = (alto, ancho, tipoEquipo) => {
    if (tipoEquipo === 'MW') {
      const d = parseFloat(alto)
      if (Number.isFinite(d) && d > 0) return (Math.PI * Math.pow(d / 2, 2)).toFixed(4)
      return '—'
    }
    const a = parseFloat(alto), b = parseFloat(ancho)
    return Number.isFinite(a) && Number.isFinite(b) ? (a * b).toFixed(4) : '—'
  }

  const TH = ({ children, center }) => (
    <th className={`px-3 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.07em] whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}
      style={{ color: 'var(--text-muted)', borderBottom: `2px solid ${accent}`, background: 'var(--bg-base)' }}>
      {children}
    </th>
  )
  const dash = <span style={{ color: 'var(--text-muted)' }}>—</span>

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
      <table className="min-w-[900px] w-full text-[12px] border-collapse">
        <thead>
          <tr>
            {/* Fix 2: columnas correctas igual que el inspector */}
            <TH>Altura (m)</TH><TH>Orientación</TH><TH>Tipo Antena / Equipo</TH>
            <TH center>Cant.</TH><TH center>Alto</TH><TH center>Diám.</TH>
            <TH center>Ancho</TH><TH center>Prof.</TH>
            <TH center>Área M²</TH><TH>Carrier</TH><TH>Comentario</TH>
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr><td colSpan={11} className="px-4 py-8 text-center text-[12px] italic" style={{ color: 'var(--text-muted)' }}>Sin equipos registrados</td></tr>
          ) : items.map((row, i) => {
            const isMW = row.tipoEquipo === 'MW'
            return (
              <tr key={i} style={{ background: i%2===0 ? 'var(--bg-card)' : 'var(--bg-base)', borderTop: '1px solid var(--border-light)' }}>
                <td className="px-3 py-2.5 font-mono font-bold text-[12px]" style={{ color: accent }}>{vd(row.alturaMts)}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{vd(row.orientacion)}</td>
                <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{vd(row.tipoEquipo)}</td>
                <td className="px-3 py-2.5 text-center font-mono" style={{ color: 'var(--text-secondary)' }}>{vd(row.cantidad)}</td>
                {/* Fix 3: Alto solo para no-MW */}
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {isMW ? dash : vd(row.alto)}
                </td>
                {/* Fix 3: Diám. solo para MW (usa campo alto) */}
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {isMW ? vd(row.alto) : dash}
                </td>
                {/* Ancho solo para no-MW */}
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {isMW ? dash : vd(row.ancho)}
                </td>
                {/* Prof. solo para no-MW */}
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {isMW ? dash : vd(row.profundidad)}
                </td>
                {/* Fix 5: área con cálculo correcto */}
                <td className="px-3 py-2.5 text-center font-mono text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {calcArea(row.alto, row.ancho, row.tipoEquipo)}
                </td>
                <td className="px-3 py-2.5">
                  {v(row.carrier) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{ background: `${accent}12`, color: accent }}>{row.carrier}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[11px] max-w-[120px] truncate" style={{ color: 'var(--text-muted)' }}>{vd(row.comentario)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Photo grid ────────────────────────────────────────────────────────────────
function PhotoGrid({ photos }) {
  const real = photos.filter(([, url]) => url)
  if (!real.length) return null
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Camera size={11} style={{ color: 'var(--text-muted)' }} />
        <span className="text-[9.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Registro fotográfico</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {photos.map(([label, url], i) => (
          <div key={i} className="space-y-1.5">
            <div className="text-[10px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="aspect-video rounded-xl overflow-hidden flex items-center justify-center"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
              {url
                ? <img src={url} alt={label} className="w-full h-full object-cover" />
                : <Grid3x3 size={16} style={{ color: 'var(--border)' }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span className="text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

// ── Floor client card ─────────────────────────────────────────────────────────
function FloorClientCard({ cliente, index }) {
  const isAncla = cliente.tipoCliente === 'ancla'
  const accent  = isAncla ? '#0EA5E9' : '#7C3AED'
  const label   = isAncla ? 'Cliente Ancla' : 'Cliente Colo'

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-light)' }}>
        <span className="text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
          style={{ background: `${accent}14`, color: accent }}>{label}</span>
        {cliente.nombreCliente && (
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{cliente.nombreCliente}</span>
        )}
        <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>#{index+1}</span>
      </div>
      <div className="px-4 py-3 space-y-3" style={{ background: 'var(--bg-card)' }}>
        <div className="flex gap-6">
          {[['Área Arrendada', cliente.areaArrendada], ['Área en Uso', cliente.areaEnUso], ['Placa Equipos', cliente.placaEquipos]]
            .filter(([, val]) => v(val)).map(([lbl, val]) => (
              <div key={lbl}>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.07em] mb-0.5" style={{ color: 'var(--text-muted)' }}>{lbl}</div>
                <div className="text-[13px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{val}</div>
              </div>
          ))}
        </div>
        {cliente.gabinetes && cliente.gabinetes.length > 0 && (
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  {['Gabinete','Largo','Ancho','Alto','Foto #'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9.5px] font-bold uppercase tracking-[0.07em]"
                      style={{ color: 'var(--text-muted)', borderBottom: `2px solid ${accent}`, background: 'var(--bg-base)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cliente.gabinetes.map((g, gi) => (
                  <tr key={gi} style={{ background: gi%2===0 ? 'var(--bg-card)' : 'var(--bg-base)', borderTop: '1px solid var(--border-light)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{vd(g.gabinete)}</td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>{vd(g.largo)}</td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>{vd(g.ancho)}</td>
                    <td className="px-3 py-2 font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>{vd(g.alto)}</td>
                    <td className="px-3 py-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>{vd(g.fotoRef)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Carrier card ──────────────────────────────────────────────────────────────
const CA = '#7C3AED'
function CarrierCard({ carrier, index, assetPhotoMap }) {
  const name = carrier.nombre || `Carrier ${index + 1}`
  const f1 = assetPhotoMap?.[`carrier:${index}:foto1`] || carrier.foto1
  const f2 = assetPhotoMap?.[`carrier:${index}:foto2`] || carrier.foto2
  const f3 = assetPhotoMap?.[`carrier:${index}:foto3`] || carrier.foto3
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${CA}` }}>
      <div className="flex items-center gap-3 px-4 py-2.5"
        style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-light)' }}>
        <Radio size={12} style={{ color: CA }} />
        <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{name}</span>
        <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Carrier #{index+1}</span>
      </div>
      <div className="p-4 space-y-4" style={{ background: 'var(--bg-card)' }}>
        <InventoryTable items={carrier.items} accent={CA} />
        <PhotoGrid photos={[[`Foto 1 — ${name}`, f1], [`Foto 2 — ${name}`, f2], [`Foto 3 — ${name}`, f3]]} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EquipmentV2Detail({ submission, assets }) {
  const raw      = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const siteInfo = raw.siteInfo  || {}
  const torre    = raw.torre     || {}
  const piso     = raw.piso      || {}
  const fotos    = raw.fotos     || {}
  const carriers = raw.carriers  || []

  const assetPhotoMap = {}
  if (assets) assets.forEach(a => {
    const key = a.asset_type || a.type || a.meta?.field || ''
    const url = a.public_url || a.storage_url || a.url
    if (key && url) assetPhotoMap[key] = url
  })

  const fD = assetPhotoMap['equipmentV2:fotoDistribucionTorre'] || fotos.fotoDistribucionTorre
  const fT = assetPhotoMap['equipmentV2:fotoTorreCompleta']     || fotos.fotoTorreCompleta
  const fC = assetPhotoMap['equipmentV2:fotoCroquisEdificio']   || fotos.fotoCroquisEdificio
  const fP = assetPhotoMap['equipmentV2:fotoPlanoPlanta']       || fotos.fotoPlanoPlanta

  return (
    <div className="space-y-3">

      <Panel icon={MapPin} title="Datos del Sitio" accent="#0284C7" ghostNum="01">
        <SiteInfoGrid info={siteInfo} />
      </Panel>

      <Panel icon={Package} title="Inventario de Equipos en Torre" accent="#DC2626" ghostNum="02">
        <div className="space-y-4">
          <InventoryTable items={torre.items} accent="#DC2626" />
          {(fD || fT || fC) && (
            <>
              <Divider label="Registro fotográfico" />
              <PhotoGrid photos={[['Distribución en torre', fD], ['Torre completa', fT], ['Croquis del edificio', fC]]} />
            </>
          )}
        </div>
      </Panel>

      {(piso.clientes?.length > 0 || fP) && (
        <Panel icon={Building2} title="Inventario de Equipos en Piso" accent="#0EA5E9" ghostNum="03">
          <div className="space-y-3">
            {(piso.clientes || []).map((c, i) => <FloorClientCard key={i} cliente={c} index={i} />)}
            {fP && (
              <>
                <Divider label="Plano de planta y equipos" />
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <img src={fP} alt="Plano de planta" className="w-full object-contain" style={{ maxHeight: 480 }} />
                </div>
              </>
            )}
          </div>
        </Panel>
      )}

      {carriers.length > 0 && (
        <Panel icon={Radio} title="Carriers" badge={`${carriers.length} carrier${carriers.length!==1?'s':''}`} accent="#7C3AED" ghostNum="04">
          <div className="space-y-3">
            {carriers.map((c, i) => <CarrierCard key={i} carrier={c} index={i} assetPhotoMap={assetPhotoMap} />)}
          </div>
        </Panel>
      )}

    </div>
  )
}
