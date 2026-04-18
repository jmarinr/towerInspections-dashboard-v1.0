/**
 * GeoMapReport.jsx
 * Mapa interactivo de Panamá con Leaflet + OpenStreetMap.
 * Sin API key — tiles gratuitos.
 */
import { useEffect, useRef } from 'react'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow"
      style={{ background:'var(--bg-card)', border:`1px solid var(--border)`, borderLeft:`3px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold th-text-p mt-0.5">{label}</div>
      {sub && <div className="text-[10px] th-text-m mt-0.5">{sub}</div>}
    </div>
  )
}

// Inyectar CSS de Leaflet una sola vez
function injectLeafletCSS() {
  if (document.getElementById('leaflet-css')) return
  const link = document.createElement('link')
  link.id   = 'leaflet-css'
  link.rel  = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

const ORG_COLORS = { CG: '#0ea5e9', HQ: '#818cf8', HK: '#34d399' }

function getMarkerColor(orgCode, status) {
  if (status === 'open') return '#fbbf24'
  return ORG_COLORS[orgCode] || '#94a3b8'
}

export default function GeoMapReport({ hook }) {
  const {
    scatterData, kpis, orgs, inspectors,
    filterOrg, filterStatus, filterInspector, setFilter,
    totalFiltered, isLoading, error,
  } = hook

  const mapRef     = useRef(null)  // DOM container
  const leafletRef = useRef(null)  // L.map instance
  const markersRef = useRef([])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current) return
    injectLeafletCSS()

    // Cargar Leaflet dinámicamente
    const script = document.getElementById('leaflet-js')
    if (!script) {
      const s = document.createElement('script')
      s.id  = 'leaflet-js'
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => initMap()
      document.head.appendChild(s)
    } else if (window.L) {
      initMap()
    } else {
      script.addEventListener('load', initMap)
    }

    function initMap() {
      if (leafletRef.current || !mapRef.current) return
      const L = window.L
      const map = L.map(mapRef.current, {
        center: [8.55, -80.0],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      leafletRef.current = map
    }

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
      }
    }
  }, [mapRef.current])

  // Actualizar marcadores cuando cambian los datos o filtros
  useEffect(() => {
    if (!leafletRef.current || !window.L) return
    const L   = window.L
    const map = leafletRef.current

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    scatterData.forEach(d => {
      const color  = getMarkerColor(d.orgCode, d.status)
      const marker = L.circleMarker([d.y, d.x], {
        radius:      8,
        fillColor:   color,
        color:       '#fff',
        weight:      1.5,
        opacity:     1,
        fillOpacity: 0.85,
      }).addTo(map)

      const badge = d.status === 'closed'
        ? `<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700">Cerrada</span>`
        : `<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:700">Abierta</span>`

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${d.siteId || '—'}</div>
          <div style="font-size:12px;color:#475569;margin-bottom:6px">${d.siteName || ''}</div>
          <div style="font-size:11px;color:#64748b">Inspector: ${d.inspector}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px">${d.dateLabel}</div>
          ${badge}
        </div>
      `, { maxWidth: 220 })

      markersRef.current.push(marker)
    })
  }, [scatterData])

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Con GPS"        value={kpis.total}  color="var(--accent)" sub="de 89 órdenes totales" />
        <KpiCard label="Cerradas"       value={kpis.closed} color="#16a34a" />
        <KpiCard label="Abiertas"       value={kpis.open}   color="#fbbf24" />
        <KpiCard label="Organizaciones" value={kpis.orgs}   color="#818cf8" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterOrg} onChange={e => setFilter('org', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
          <option value="">Todas las orgs</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilter('status', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
          <option value="">Todos los estados</option>
          <option value="closed">Cerradas</option>
          <option value="open">Abiertas</option>
        </select>
        <select value={filterInspector} onChange={e => setFilter('inspector', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
          <option value="">Todos los inspectores</option>
          {inspectors.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <span className="text-[12px] th-text-m ml-auto">{totalFiltered} sitios visibles</span>
      </div>

      {/* Mapa */}
      <div className="rounded-2xl overflow-hidden th-shadow"
        style={{ border:'1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
          <div>
            <h3 className="text-[13px] font-bold th-text-p">Mapa de Panamá — Sitios Inspeccionados</h3>
            <p className="text-[11px] th-text-m mt-0.5">Click en un punto para ver detalles · Scroll para zoom · Arrastrar para navegar</p>
          </div>
        </div>

        {/* Contenedor del mapa — Leaflet monta aquí */}
        <div
          ref={mapRef}
          style={{ height: 480, width: '100%', zIndex: 0 }}
        />

        {/* Leyenda */}
        <div className="px-5 py-3 flex flex-wrap gap-4"
          style={{ background:'var(--bg-card)', borderTop:'1px solid var(--border)' }}>
          {Object.entries(ORG_COLORS).map(([org, color]) => (
            <div key={org} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background:color }} />
              <span className="text-[11px] th-text-m">{org} · cerradas</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white shadow-sm bg-yellow-400" />
            <span className="text-[11px] th-text-m">Abiertas (todas las orgs)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
