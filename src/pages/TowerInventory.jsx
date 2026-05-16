/**
 * TowerInventory.jsx
 * Vista 1: Mapa de Panamá + lista lateral sincronizada + KPI strip.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Search, AlertTriangle, Radio, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import SiteStatusBadge from '../components/tower-inventory/SiteStatusBadge'
import useTowerInventory, { STATUS_COLORS } from '../hooks/useTowerInventory'
import { useAuthStore } from '../store/useAuthStore'

// Leaflet — importación dinámica para evitar SSR issues
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const PANAMA_CENTER  = [8.4, -80.1]
const PANAMA_ZOOM    = 8

// KPI card
function KpiCard({ label, value, accent, color, sub }) {
  return (
    <div className="rounded-2xl p-4 border th-shadow"
      style={{
        background:  accent ? '#1e293b' : 'var(--bg-card)',
        borderColor: accent ? 'transparent' : color ? 'var(--border)' : 'var(--border)',
        borderLeft:  !accent && color ? `3px solid ${color}` : undefined,
        borderRadius: !accent && color ? '0 12px 12px 0' : undefined,
      }}>
      <div className="text-[24px] font-bold leading-none tabular-nums"
        style={{ color: accent ? '#e2e8f0' : color || 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-[11.5px] font-medium mt-1.5"
        style={{ color: accent ? 'rgba(226,232,240,0.5)' : 'var(--text-secondary)' }}>
        {label}
      </div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: accent ? 'rgba(226,232,240,0.35)' : 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

export default function TowerInventory() {
  // v4.14.3 — defensa: solo admins acceden a Inv. Torres
  const user = useAuthStore(s => s.user)
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const navigate  = useNavigate()
  const listRef   = useRef(null)
  const rowRefs   = useRef({})

  const {
    filteredSites,
    totalSites, totalTowerEquipment, totalFloorCarriers, criticalSites,
    searchQuery, setSearchQuery,
    filterRegion, setFilterRegion,
    filterStatus, setFilterStatus,
    regionOptions,
    isLoading, error,
  } = useTowerInventory()

  const [selectedSite, setSelectedSite] = useState(null)

  // Scroll automático en la lista cuando se selecciona un pin
  useEffect(() => {
    if (selectedSite && rowRefs.current[selectedSite]) {
      rowRefs.current[selectedSite].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedSite])

  if (isLoading) return (
    <div className="flex justify-center py-24"><Spinner size={18} /></div>
  )

  if (error) return (
    <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>
      Error: {error}
    </div>
  )

  // Sitios con coordenadas válidas
  const mappable = filteredSites.filter(s => s.lat && s.lng)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Radio size={20} className="th-text-m" />
        <h1 className="text-[20px] font-bold th-text-p">Inventario de Torres</h1>
        <span className="text-[12px] font-semibold th-text-m th-bg-base px-2.5 py-0.5 rounded-full tabular-nums">
          {filteredSites.length}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total torres"       value={totalSites}          accent />
        <KpiCard label="Equipos en torre"   value={totalTowerEquipment} color="#0d9488" />
        <KpiCard label="Carriers en piso"   value={totalFloorCarriers}  color="#475569" />
        <KpiCard label="Sitios críticos"    value={criticalSites}       color="#ef4444"
          sub={criticalSites > 0 ? 'Requieren atención' : 'Sin alertas'} />
      </div>

      {/* Layout mapa + lista */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-0 rounded-2xl overflow-hidden border th-border"
        style={{ minHeight: 460 }}>

        {/* Mapa */}
        <div style={{ minHeight: 400, zIndex: 0 }}>
          <MapContainer
            center={PANAMA_CENTER}
            zoom={PANAMA_ZOOM}
            style={{ width: '100%', height: '100%', minHeight: 400 }}
            scrollWheelZoom={true}>
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mappable.map(site => (
              <CircleMarker
                key={site.siteId}
                center={[site.lat, site.lng]}
                radius={selectedSite === site.siteId ? 10 : 7}
                fillColor={STATUS_COLORS[site.status]}
                color={selectedSite === site.siteId ? '#fff' : STATUS_COLORS[site.status]}
                weight={selectedSite === site.siteId ? 2.5 : 1.5}
                fillOpacity={0.9}
                eventHandlers={{
                  click: () => setSelectedSite(site.siteId),
                }}>
                <Popup>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                      {site.siteName}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                      ID: {site.siteId}
                    </div>
                    {site.heightM && (
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        Altura: {site.heightM} m · {site.structureType || '—'}
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/tower-inventory/${site.siteId}`)}
                      style={{
                        marginTop: 6, padding: '4px 10px', borderRadius: 6,
                        background: '#1e293b', color: '#fff', fontSize: 11,
                        border: 'none', cursor: 'pointer', width: '100%'
                      }}>
                      Ver detalle →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Panel lateral */}
        <div className="border-l th-border flex flex-col"
          style={{ background: 'var(--bg-card)', maxHeight: 460 }}>

          {/* Búsqueda y filtros */}
          <div className="p-3 space-y-2 border-b th-border-l">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 th-text-m" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar sitio o ID…"
                className="w-full h-7 pl-7 pr-2 text-[12px] border th-border rounded-lg th-bg-base
                  focus:outline-none focus:ring-1 focus:ring-sky-600/20 th-text-p placeholder:th-text-m"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
                className="h-7 px-2 text-[11px] border th-border rounded-lg th-bg-base th-text-s focus:outline-none">
                <option value="">Todas</option>
                {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="h-7 px-2 text-[11px] border th-border rounded-lg th-bg-base th-text-s focus:outline-none">
                <option value="">Todos</option>
                <option value="operative">Operativo</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="critical">Crítico</option>
              </select>
            </div>
            <div className="text-[11px] th-text-m">{filteredSites.length} sitio{filteredSites.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Lista */}
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {filteredSites.length === 0 && (
              <div className="text-center py-8 text-[12px] th-text-m">Sin resultados</div>
            )}
            {filteredSites.map(site => (
              <div
                key={site.siteId}
                ref={el => { rowRefs.current[site.siteId] = el }}
                onClick={() => setSelectedSite(site.siteId === selectedSite ? null : site.siteId)}
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b th-border-l transition-colors"
                style={{
                  background: selectedSite === site.siteId ? 'var(--row-hover-bg)' : '',
                }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLORS[site.status] }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium th-text-p truncate">{site.siteName}</div>
                  <div className="text-[10px] th-text-m font-mono">{site.siteId}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/tower-inventory/${site.siteId}`) }}
                  className="flex-shrink-0 p-1 rounded th-text-m hover:th-text-p transition-colors">
                  <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="p-3 border-t th-border-l flex gap-3">
            {[
              ['Operativo',   STATUS_COLORS.operative],
              ['Mantenimiento', STATUS_COLORS.maintenance],
              ['Crítico',     STATUS_COLORS.critical],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-[10px] th-text-m">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
