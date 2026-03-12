/**
 * EquipmentV2Detail.jsx
 * Vista especializada para submissions de tipo inventario-v2 / equipment-v2
 * Renderiza las secciones Torre, Piso y Carriers con tablas visuales.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Package, Building2, Radio } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcArea(alto, ancho) {
  const a = parseFloat(alto), b = parseFloat(ancho)
  return Number.isFinite(a) && Number.isFinite(b) ? (a * b).toFixed(4) : '—'
}

function val(v) {
  return v !== undefined && v !== null && v !== '' ? String(v) : '—'
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color = 'bg-gray-800', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${color} text-white`}
      >
        {Icon && <Icon size={16} />}
        <span className="font-bold text-sm flex-1">{title}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}

// ── Site info grid ─────────────────────────────────────────────────────────────
function SiteInfoGrid({ info }) {
  if (!info) return null
  const fields = [
    ['ID Sitio',       info.idSitio],
    ['Nombre Sitio',   info.nombreSitio],
    ['Proveedor',      info.proveedor],
    ['Tipo de Visita', info.tipoVisita || info.tipoSitio],
    ['Fecha Inicio',   info.fechaInicio || info.fecha],
    ['Fecha Termino',  info.fechaTermino],
    ['Dirección',      info.direccion],
    ['Altura Torre',   info.alturaTorre || info.altura],
    ['Tipo Sitio',     info.tipoSitio],
    ['Tipo Estructura',info.tipoEstructura || info.tipoTorre],
    ['Latitud',        info.latitud || info.coordenadas],
    ['Longitud',       info.longitud],
  ].filter(([, v]) => v)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
      {fields.map(([label, value]) => (
        <div key={label}>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="text-sm text-gray-900 font-medium">{val(value)}</div>
        </div>
      ))}
    </div>
  )
}

// ── Torre table ────────────────────────────────────────────────────────────────
function TorreTable({ items }) {
  if (!items || items.length === 0)
    return <p className="text-sm text-gray-400 italic">Sin filas registradas.</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-[900px] w-full text-xs">
        <thead>
          <tr className="bg-red-600 text-white">
            <th className="px-2 py-2 text-center" rowSpan={2}>Altura (m)</th>
            <th className="px-2 py-2 text-center" rowSpan={2}>Orientación</th>
            <th className="px-2 py-2 text-center" rowSpan={2}>Tipo de Antena y/o Equipo</th>
            <th className="px-2 py-2 text-center" rowSpan={2}>Número de Antenas y/o Equipo</th>
            <th className="px-2 py-2 text-center" colSpan={3}>Dimensiones en metros</th>
            <th className="px-2 py-2 text-center" rowSpan={2}>Área M2</th>
            <th className="px-2 py-2 text-center" rowSpan={2}>Carrier</th>
            <th className="px-2 py-2 text-center" rowSpan={2}>Comentario</th>
          </tr>
          <tr className="bg-red-600 text-white border-t border-red-500">
            <th className="px-2 py-1 text-center">Alto</th>
            <th className="px-2 py-1 text-center">Ancho</th>
            <th className="px-2 py-1 text-center">Profundidad</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-2 py-2 text-center font-medium">{val(row.alturaMts)}</td>
              <td className="px-2 py-2 text-center">{val(row.orientacion)}</td>
              <td className="px-2 py-2">{val(row.tipoEquipo)}</td>
              <td className="px-2 py-2 text-center">{val(row.cantidad)}</td>
              <td className="px-2 py-2 text-center">{val(row.alto)}</td>
              <td className="px-2 py-2 text-center">{val(row.ancho)}</td>
              <td className="px-2 py-2 text-center">{val(row.profundidad)}</td>
              <td className="px-2 py-2 text-center font-mono text-gray-700">{calcArea(row.alto, row.ancho)}</td>
              <td className="px-2 py-2">{val(row.carrier)}</td>
              <td className="px-2 py-2 text-gray-600">{val(row.comentario)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Floor client card ──────────────────────────────────────────────────────────
function FloorClientCard({ cliente, index }) {
  const tipo = cliente.tipoCliente === 'ancla' ? 'Cliente Ancla' : 'Cliente Colo'

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 text-white">
        <span className="text-xs font-bold">{tipo}</span>
        {cliente.nombreCliente && (
          <span className="text-xs opacity-75">— {cliente.nombreCliente}</span>
        )}
        <span className="ml-auto text-[10px] opacity-50">#{index + 1}</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Info row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            ['Área Arrendada', cliente.areaArrendada],
            ['Área en Uso', cliente.areaEnUso],
            ['Placa de Equipos', cliente.placaEquipos],
          ].filter(([, v]) => v).map(([lbl, v]) => (
            <div key={lbl}>
              <div className="text-[10px] font-bold text-gray-500 uppercase">{lbl}</div>
              <div className="text-gray-900 font-medium">{val(v)}</div>
            </div>
          ))}
        </div>

        {/* Gabinetes table */}
        {cliente.gabinetes && cliente.gabinetes.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-[500px] w-full text-xs">
              <thead className="bg-gray-800 text-white">
                <tr>
                  {['Gabinete', 'Largo', 'Ancho', 'Alto', 'Foto #'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cliente.gabinetes.map((g, gi) => (
                  <tr key={gi} className={gi % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-1.5 font-medium">{val(g.gabinete)}</td>
                    <td className="px-3 py-1.5">{val(g.largo)}</td>
                    <td className="px-3 py-1.5">{val(g.ancho)}</td>
                    <td className="px-3 py-1.5">{val(g.alto)}</td>
                    <td className="px-3 py-1.5 text-gray-500">{val(g.fotoRef)}</td>
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

// ── Carrier card ───────────────────────────────────────────────────────────────
function CarrierCard({ carrier, index, assets }) {
  const name = carrier.nombre || `Carrier ${index + 1}`

  // Find carrier photos from assets
  const findPhoto = (key) => {
    if (!assets) return null
    const tag = `carrier:${index}:${key}`
    const asset = assets.find(a => a.asset_type === tag || a.type === tag || (a.meta && a.meta.field === tag))
    return asset?.storage_url || asset?.url || null
  }

  const foto1 = findPhoto('foto1') || carrier.foto1
  const foto2 = findPhoto('foto2') || carrier.foto2
  const foto3 = findPhoto('foto3') || carrier.foto3

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-700 text-white">
        <Radio size={14} />
        <span className="font-bold text-sm">{name}</span>
        <span className="ml-auto text-[10px] opacity-50">Carrier #{index + 1}</span>
      </div>

      <div className="p-4 space-y-4">
        <TorreTable items={carrier.items} />

        {(foto1 || foto2 || foto3) && (
          <div className="grid grid-cols-3 gap-3">
            {[foto1, foto2, foto3].map((url, pi) => (
              <div key={pi} className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                {url
                  ? <img src={url} alt={`Foto ${pi + 1} — ${name}`} className="w-full h-full object-cover" />
                  : <span className="text-xs text-gray-400">Sin foto {pi + 1}</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EquipmentV2Detail({ submission, assets }) {
  const raw     = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const siteInfo = raw.siteInfo  || {}
  const torre    = raw.torre     || {}
  const piso     = raw.piso      || {}
  const fotos    = raw.fotos     || {}
  const carriers = raw.carriers  || []

  // Resolve fotos from assets
  const assetPhotoMap = {}
  if (assets) {
    assets.forEach(a => {
      const field = a.asset_type || a.type || a.meta?.field
      const url   = a.storage_url || a.url
      if (field && url) assetPhotoMap[field] = url
    })
  }

  const fotoDistribucion = assetPhotoMap['equipmentV2:fotoDistribucionTorre'] || fotos.fotoDistribucionTorre
  const fotoTorre        = assetPhotoMap['equipmentV2:fotoTorreCompleta']     || fotos.fotoTorreCompleta
  const fotoCroquis      = assetPhotoMap['equipmentV2:fotoCroquisEdificio']   || fotos.fotoCroquisEdificio
  const fotoPlano        = assetPhotoMap['equipmentV2:fotoPlanoPlanta']       || fotos.fotoPlanoPlanta

  return (
    <div className="space-y-4">

      {/* ── Datos del Sitio ───────────────────────────────────────────── */}
      <Section icon={Package} title="Datos del Sitio" color="bg-gray-800">
        <SiteInfoGrid info={siteInfo} />
      </Section>

      {/* ── Inventario de Equipos en Torre ───────────────────────────── */}
      <Section icon={Package} title="Inventario de Equipos en Torre" color="bg-red-700">
        <div className="space-y-4">
          <TorreTable items={torre.items || []} />

          {/* Torre photos */}
          {(fotoDistribucion || fotoTorre || fotoCroquis) && (
            <div>
              <div className="text-xs font-bold text-gray-600 mb-2">Fotos de torre</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  [fotoDistribucion, 'Distribución de equipos en torre'],
                  [fotoTorre,        'Torre completa'],
                  [fotoCroquis,      'Croquis esquemático del edificio'],
                ].map(([url, lbl], pi) => (
                  <div key={pi} className="space-y-1">
                    <div className="text-[10px] text-gray-500 font-semibold">{lbl}</div>
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                      {url
                        ? <img src={url} alt={lbl} className="w-full h-full object-cover" />
                        : <span className="text-xs text-gray-300">Sin foto</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Inventario de Equipos en Piso ─────────────────────────────── */}
      {(piso.clientes && piso.clientes.length > 0) && (
        <Section icon={Building2} title="Inventario de Equipos en Piso" color="bg-gray-800">
          <div className="space-y-4">
            {piso.clientes.map((c, i) => (
              <FloorClientCard key={i} cliente={c} index={i} />
            ))}

            {/* Plano de planta */}
            {fotoPlano && (
              <div>
                <div className="text-xs font-bold text-gray-600 mb-2">Plano de planta y equipos</div>
                <img src={fotoPlano} alt="Plano de planta" className="max-w-full rounded-xl border border-gray-200" />
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Carriers ──────────────────────────────────────────────────── */}
      {carriers.length > 0 && (
        <Section icon={Radio} title={`Carriers (${carriers.length})`} color="bg-gray-700">
          <div className="space-y-4">
            {carriers.map((c, i) => (
              <CarrierCard key={i} carrier={c} index={i} assets={assets} />
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}
