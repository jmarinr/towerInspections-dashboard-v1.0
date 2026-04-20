/**
 * GeoMapReport.jsx
 * Mapa interactivo Leaflet + OpenStreetMap.
 * Fix: mapReady state asegura que los marcadores se pintan
 * después de que el mapa esté completamente inicializado.
 */
import { useEffect, useRef, useState } from 'react'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'
import ReportInfo from '../../components/ui/ReportInfo'

const ORG_COLORS = { CG: '#0ea5e9', HQ: '#818cf8', HK: '#34d399' }

function getMarkerColor(orgCode, status) {
  if (status === 'open') return '#fbbf24'
  return ORG_COLORS[orgCode] || '#94a3b8'
}

function injectLeafletAssets(onReady) {
  // CSS
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id   = 'leaflet-css'
    link.rel  = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }
  // JS
  if (window.L) { onReady(); return }
  const existing = document.getElementById('leaflet-js')
  if (existing) {
    existing.addEventListener('load', onReady)
    return
  }
  const s = document.createElement('script')
  s.id  = 'leaflet-js'
  s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  s.addEventListener('load', onReady)
  document.head.appendChild(s)
}

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

export default function GeoMapReport({ hook }) {
  const {
    scatterData, kpis, orgs, inspectors,
    filterOrg, filterStatus, filterInspector, setFilter,
    totalFiltered, isLoading, error,
  } = hook

  const mapContainerRef = useRef(null)
  const mapInstanceRef  = useRef(null)
  const markersRef      = useRef([])
  const [mapReady, setMapReady] = useState(false)

  // ── Inicializar mapa ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return

    injectLeafletAssets(() => {
      if (mapInstanceRef.current) return   // ya inicializado
      const L   = window.L
      const map = L.map(mapContainerRef.current, {
        center: [8.4, -80.2],
        zoom:   7,
        scrollWheelZoom: true,
        zoomControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      mapInstanceRef.current = map
      setMapReady(true)   // dispara el efecto de marcadores
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setMapReady(false)
      }
    }
  }, [])

  // ── Pintar / actualizar marcadores ───────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L) return
    const L   = window.L
    const map = mapInstanceRef.current

    // Borrar marcadores anteriores
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    scatterData.forEach(d => {
      if (!d.y || !d.x) return
      const color  = getMarkerColor(d.orgCode, d.status)

      const marker = L.circleMarker([d.y, d.x], {
        radius:      7,
        fillColor:   color,
        color:       '#fff',
        weight:      1.5,
        opacity:     1,
        fillOpacity: 0.88,
      }).addTo(map)

      const badge = d.status === 'closed'
        ? `<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700">Cerrada</span>`
        : `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700">Abierta</span>`

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:170px;padding:2px">
          <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#0f172a">${d.siteId || '—'}</div>
          <div style="font-size:12px;color:#475569;margin-bottom:5px">${d.siteName || ''}</div>
          <div style="font-size:11px;color:#64748b">Inspector: ${d.inspector}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px">Fecha: ${d.dateLabel}</div>
          ${badge}
        </div>
      `, { maxWidth: 230 })

      markersRef.current.push(marker)
    })
  }, [mapReady, scatterData])

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Con GPS"        value={kpis.total}  color="var(--accent)" sub="de las órdenes totales" />
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
        <select value={hook.filterRegion ?? ''} onChange={e => hook.setFilter('region', e.target.value)}
          className="px-3 py-2 rounded-xl text-[13px] border"
          style={{ background:'var(--bg-input)', borderColor:'var(--border)', color:'var(--text-primary)' }}>
          <option value="">Todas las regiones</option>
          {(hook.regions ?? []).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-[12px] th-text-m ml-auto">{totalFiltered} sitios visibles</span>
      </div>

      {/* Mapa */}
      <ReportInfo
        title="Dispersión Geográfica"
        description="Mapa interactivo de Panamá que muestra la ubicación GPS registrada al iniciar cada orden. Permite visualizar la cobertura geográfica de las inspecciones y detectar zonas concentradas o sin cobertura."
        howToUse={[
          "Filtra por organización o inspector para ver la cobertura de un equipo específico.",
          "Usa scroll para hacer zoom en una región específica (Chiriquí, Coclé, Panamá, etc.).",
          "Haz click en cualquier punto para ver el ID del sitio, nombre, inspector y fecha.",
          "Exporta a Excel para obtener las coordenadas lat/lng y usarlas en otras herramientas de análisis geoespacial.",
        ]}
        howToInterpret={[
          "Puntos azules (CG): Órdenes cerradas de la organización Chiriquí/Oeste.",
          "Puntos morados (HQ): Órdenes cerradas de la organización Central/HQ.",
          "Puntos amarillos: Órdenes abiertas — el inspector está actualmente trabajando en ese sitio.",
          "La concentración de puntos en la región de Chiriquí refleja que CG tiene más sitios inspeccionados en ese período.",
          "Los puntos de HQ aparecen en la zona central (Coclé, Herrera) que es su área de cobertura.",
        ]}
      />

      <div className="rounded-2xl overflow-hidden th-shadow" style={{ border:'1px solid var(--border)' }}>
        <div className="px-5 py-3" style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
          <h3 className="text-[13px] font-bold th-text-p">Mapa de Panamá — Sitios Inspeccionados</h3>
          <p className="text-[11px] th-text-m mt-0.5">Click en un punto para ver detalles · Scroll para zoom · Arrastrar para navegar</p>
        </div>

        <div ref={mapContainerRef} style={{ height: 500, width:'100%', zIndex: 0 }} />

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
            <span className="text-[11px] th-text-m">Abiertas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
