/**
 * EquipmentV2Detail.jsx
 * Vista especializada para inventario-v2 / equipment-v2
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Package, Building2, Radio, MapPin } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcArea(alto, ancho) {
  const a = parseFloat(alto), b = parseFloat(ancho)
  return Number.isFinite(a) && Number.isFinite(b) ? (a * b).toFixed(4) : '—'
}
const v = (x) => (x !== undefined && x !== null && x !== '') ? String(x) : '—'

// ── Collapsible section ────────────────────────────────────────────────────────
// variant: 'default' | 'red' | 'slate'
function Section({ icon: Icon, title, badge, variant = 'default', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const headerStyle = variant === 'red'
    ? { background: 'var(--section-hdr-red-bg)', color: 'var(--section-hdr-red-text)' }
    : variant === 'slate'
    ? { background: 'var(--section-hdr-slate-bg)', color: 'var(--section-hdr-slate-text)' }
    : { background: 'var(--section-hdr-bg)', color: 'var(--section-hdr-text)' }
  return (
    <div className="rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={headerStyle}>
        {Icon && <Icon size={15} className="flex-shrink-0" style={{ opacity: 0.7 }} />}
        <span className="font-semibold text-[13px] flex-1">{title}</span>
        {badge && <span className="text-[10px] font-medium mr-1" style={{ opacity: 0.5 }}>{badge}</span>}
        {open
          ? <ChevronDown size={14} className="flex-shrink-0" style={{ opacity: 0.4 }} />
          : <ChevronRight size={14} className="flex-shrink-0" style={{ opacity: 0.4 }} />}
      </button>
      {open && <div className="p-4" style={{ background: 'var(--bg-card)' }}>{children}</div>}
    </div>
  )
}

// ── Site info ─────────────────────────────────────────────────────────────────
function SiteInfoGrid({ info }) {
  if (!info) return null
  const fields = [
    ['ID Sitio',        info.idSitio],
    ['Nombre Sitio',    info.nombreSitio],
    ['Tipo de Visita',  info.tipoVisita || info.tipoSitio],
    ['Proveedor',       info.proveedor],
    ['Fecha Inicio',    info.fechaInicio || info.fecha],
    ['Fecha Término',   info.fechaTermino],
    ['Altura Torre',    info.alturaTorre || info.altura],
    ['Tipo Sitio',      info.tipoSitio],
    ['Tipo Estructura', info.tipoEstructura || info.tipoTorre],
    ['Dirección',       info.direccion],
    ['Latitud',         info.latitud || info.coordenadas],
    ['Longitud',        info.longitud],
  ].filter(([, val]) => val)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
      {fields.map(([label, value]) => (
        <div key={label}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
          <div className="text-[13px] text-slate-800 font-medium">{v(value)}</div>
        </div>
      ))}
    </div>
  )
}

// ── Torre / Carrier inventory table ───────────────────────────────────────────
function InventoryTable({ items }) {
  const empty = !items || items.length === 0

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="min-w-[820px] w-full text-[12px]">
        <thead>
          <tr className="bg-red-600 text-white">
            <th className="px-3 py-2.5 text-left font-semibold" rowSpan={2}>Altura (m)</th>
            <th className="px-3 py-2.5 text-left font-semibold" rowSpan={2}>Orientación</th>
            <th className="px-3 py-2.5 text-left font-semibold" rowSpan={2}>Tipo de Antena y/o Equipo</th>
            <th className="px-3 py-2.5 text-center font-semibold" rowSpan={2}>Cantidad</th>
            <th className="px-3 py-2.5 text-center font-semibold border-l border-red-500" colSpan={3}>
              Dimensiones en metros
            </th>
            <th className="px-3 py-2.5 text-center font-semibold" rowSpan={2}>Área M²</th>
            <th className="px-3 py-2.5 text-left font-semibold" rowSpan={2}>Carrier</th>
            <th className="px-3 py-2.5 text-left font-semibold" rowSpan={2}>Comentario</th>
          </tr>
          <tr className="bg-red-700 text-white border-t border-red-500">
            <th className="px-3 py-1.5 text-center font-semibold border-l border-red-500">Alto</th>
            <th className="px-3 py-1.5 text-center font-semibold">Ancho</th>
            <th className="px-3 py-1.5 text-center font-semibold">Profundidad</th>
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={10} className="px-4 py-6 text-center text-slate-400 text-[12px] italic">
                Sin equipos registrados
              </td>
            </tr>
          ) : items.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-3 py-2.5 font-semibold text-slate-700">{v(row.alturaMts)}</td>
              <td className="px-3 py-2.5 text-slate-600">{v(row.orientacion)}</td>
              <td className="px-3 py-2.5 text-slate-700">{v(row.tipoEquipo)}</td>
              <td className="px-3 py-2.5 text-center text-slate-600">{v(row.cantidad)}</td>
              <td className="px-3 py-2.5 text-center text-slate-600">{v(row.alto)}</td>
              <td className="px-3 py-2.5 text-center text-slate-600">{v(row.ancho)}</td>
              <td className="px-3 py-2.5 text-center text-slate-600">{v(row.profundidad)}</td>
              <td className="px-3 py-2.5 text-center font-mono text-slate-500 text-[11px]">
                {calcArea(row.alto, row.ancho)}
              </td>
              <td className="px-3 py-2.5 text-slate-600">{v(row.carrier)}</td>
              <td className="px-3 py-2.5 text-slate-500 max-w-[140px] truncate">{v(row.comentario)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Photo grid ────────────────────────────────────────────────────────────────
function PhotoGrid({ photos }) {
  const items = photos.filter(([, url]) => url)
  if (!items.length) return null
  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Fotos</div>
      <div className="grid grid-cols-3 gap-3">
        {photos.map(([label, url], i) => (
          <div key={i} className="space-y-1">
            <div className="text-[11px] text-slate-500 font-medium truncate">{label}</div>
            <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              {url
                ? <img src={url} alt={label} className="w-full h-full object-cover" />
                : <span className="text-[11px] text-slate-300">Sin foto</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Floor client card ──────────────────────────────────────────────────────────
function FloorClientCard({ cliente, index }) {
  const isAncla = cliente.tipoCliente === 'ancla'
  const label   = isAncla ? 'Cliente Ancla' : 'Cliente Colo'
  const color   = isAncla ? 'bg-slate-700' : 'bg-slate-600'

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'var(--section-hdr-slate-bg)', color: 'var(--section-hdr-slate-text)' }}>
        <Building2 size={13} style={{ opacity: 0.6 }} />
        <span className="text-[12px] font-bold">{label}</span>
        {cliente.nombreCliente && (
          <span className="text-[12px] ml-1" style={{ opacity: 0.6 }}>— {cliente.nombreCliente}</span>
        )}
        <span className="ml-auto text-[10px]" style={{ opacity: 0.3 }}>#{index + 1}</span>
      </div>

      <div className="p-4 space-y-3" style={{ background: 'var(--bg-card)' }}>
        {/* Info */}
        <div className="grid grid-cols-3 gap-4 text-[12px]">
          {[
            ['Área Arrendada', cliente.areaArrendada],
            ['Área en Uso',    cliente.areaEnUso],
            ['Placa Equipos',  cliente.placaEquipos],
          ].filter(([, val]) => val).map(([lbl, val]) => (
            <div key={lbl}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{lbl}</div>
              <div className="text-slate-700 font-medium">{v(val)}</div>
            </div>
          ))}
        </div>

        {/* Gabinetes */}
        {cliente.gabinetes && cliente.gabinetes.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {['Gabinete', 'Largo', 'Ancho', 'Alto', 'Foto #'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cliente.gabinetes.map((g, gi) => (
                  <tr key={gi} className={gi % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-3 py-2 font-medium text-slate-700">{v(g.gabinete)}</td>
                    <td className="px-3 py-2 text-slate-600">{v(g.largo)}</td>
                    <td className="px-3 py-2 text-slate-600">{v(g.ancho)}</td>
                    <td className="px-3 py-2 text-slate-600">{v(g.alto)}</td>
                    <td className="px-3 py-2 text-slate-500">{v(g.fotoRef)}</td>
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
function CarrierCard({ carrier, index, assetPhotoMap }) {
  const name = carrier.nombre || `Carrier ${index + 1}`
  const foto1 = assetPhotoMap?.[`carrier:${index}:foto1`] || carrier.foto1
  const foto2 = assetPhotoMap?.[`carrier:${index}:foto2`] || carrier.foto2
  const foto3 = assetPhotoMap?.[`carrier:${index}:foto3`] || carrier.foto3

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'var(--section-hdr-slate-bg)', color: 'var(--section-hdr-slate-text)' }}>
        <Radio size={13} style={{ opacity: 0.6 }} />
        <span className="font-bold text-[13px]">{name}</span>
        <span className="ml-auto text-[10px]" style={{ opacity: 0.3 }}>Carrier #{index + 1}</span>
      </div>
      <div className="p-4 space-y-4" style={{ background: 'var(--bg-card)' }}>
        <InventoryTable items={carrier.items} />
        <PhotoGrid photos={[
          [`Foto 1 — ${name}`, foto1],
          [`Foto 2 — ${name}`, foto2],
          [`Foto 3 — ${name}`, foto3],
        ]} />
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function EquipmentV2Detail({ submission, assets }) {
  const raw      = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const siteInfo = raw.siteInfo  || {}
  const torre    = raw.torre     || {}
  const piso     = raw.piso      || {}
  const fotos    = raw.fotos     || {}
  const carriers = raw.carriers  || []

  // Build asset photo map from the DB assets (keyed by asset_type)
  const assetPhotoMap = {}
  if (assets) {
    assets.forEach(a => {
      const key = a.asset_type || a.type || a.meta?.field || ''
      const url = a.public_url || a.storage_url || a.url
      if (key && url) assetPhotoMap[key] = url
    })
  }

  const fotoDistribucion = assetPhotoMap['equipmentV2:fotoDistribucionTorre'] || fotos.fotoDistribucionTorre
  const fotoTorre        = assetPhotoMap['equipmentV2:fotoTorreCompleta']     || fotos.fotoTorreCompleta
  const fotoCroquis      = assetPhotoMap['equipmentV2:fotoCroquisEdificio']   || fotos.fotoCroquisEdificio
  const fotoPlano        = assetPhotoMap['equipmentV2:fotoPlanoPlanta']       || fotos.fotoPlanoPlanta

  return (
    <div className="space-y-3">

      {/* Datos del Sitio */}
      <Section icon={MapPin} title="Datos del Sitio" variant="default">
        <SiteInfoGrid info={siteInfo} />
      </Section>

      {/* Torre */}
      <Section icon={Package} title="Inventario de Equipos en Torre" variant="red">
        <div className="space-y-4">
          <InventoryTable items={torre.items} />
          <PhotoGrid photos={[
            ['Distribución en torre', fotoDistribucion],
            ['Torre completa',        fotoTorre],
            ['Croquis del edificio',  fotoCroquis],
          ]} />
        </div>
      </Section>

      {/* Piso */}
      {(piso.clientes?.length > 0 || fotoPlano) && (
        <Section icon={Building2} title="Inventario de Equipos en Piso" variant="default">
          <div className="space-y-3">
            {(piso.clientes || []).map((c, i) => (
              <FloorClientCard key={i} cliente={c} index={i} />
            ))}

            {fotoPlano && (
              <div className="mt-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Plano de planta y equipos
                </div>
                <img src={fotoPlano} alt="Plano de planta"
                  className="max-w-full rounded-xl border border-slate-200 shadow-sm" />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Carriers */}
      {carriers.length > 0 && (
        <Section icon={Radio} title={`Carriers`} badge={`${carriers.length} carrier${carriers.length !== 1 ? 's' : ''}`} variant="slate">
          <div className="space-y-3">
            {carriers.map((c, i) => (
              <CarrierCard key={i} carrier={c} index={i} assetPhotoMap={assetPhotoMap} />
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}
