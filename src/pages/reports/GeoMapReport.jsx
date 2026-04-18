import { useState, useRef } from 'react'
import useGeoMapReport from '../../hooks/useGeoMapReport'
import Spinner from '../../components/ui/Spinner'
import LoadError from '../../components/ui/LoadError'

const PANAMA_OUTLINE = [
  [-83.05,8.22],[-82.93,8.20],[-82.88,8.15],[-82.74,8.07],
  [-82.58,8.09],[-82.43,8.20],[-82.34,8.25],[-82.22,8.29],
  [-82.02,8.29],[-81.90,8.20],[-81.74,8.19],[-81.59,8.10],
  [-81.39,8.05],[-81.17,7.96],[-80.95,7.87],[-80.70,7.78],
  [-80.44,7.72],[-80.20,7.70],[-80.00,7.74],[-79.80,7.81],
  [-79.60,7.88],[-79.43,7.91],[-79.28,7.95],[-78.95,7.88],
  [-78.55,7.80],[-78.15,7.72],[-77.85,7.66],[-77.55,7.53],
  [-77.30,7.62],[-77.17,7.78],[-77.25,7.98],[-77.44,8.13],
  [-77.57,8.24],[-77.70,8.52],[-77.80,8.72],[-77.90,8.86],
  [-78.03,9.00],[-78.20,9.20],[-78.45,9.36],[-78.67,9.42],
  [-78.90,9.44],[-79.15,9.45],[-79.35,9.43],[-79.55,9.37],
  [-79.75,9.30],[-79.90,9.28],[-80.10,9.25],[-80.35,9.30],
  [-80.55,9.38],[-80.75,9.46],[-81.00,9.57],[-81.20,9.67],
  [-81.40,9.75],[-81.60,9.78],[-81.78,9.70],[-81.92,9.60],
  [-82.05,9.47],[-82.20,9.35],[-82.42,9.32],[-82.60,9.36],
  [-82.76,9.42],[-82.90,9.38],[-82.98,9.30],[-83.02,9.18],
  [-83.05,9.05],[-83.06,8.80],[-83.04,8.60],[-83.05,8.40],
  [-83.05,8.22],
]

const MAP_BOUNDS = { minLng: -83.6, maxLng: -77.0, minLat: 7.1, maxLat: 9.95 }
const W = 800, H = 310

function project(lng, lat) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * W
  const y = H - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * H
  return { x, y }
}

const outlinePts = PANAMA_OUTLINE.map(([lng, lat]) => {
  const { x, y } = project(lng, lat)
  return `${x.toFixed(1)},${y.toFixed(1)}`
}).join(' ')

const CITIES = [
  { name: 'David',    lng: -82.43, lat: 8.43 },
  { name: 'Santiago', lng: -80.98, lat: 8.10 },
  { name: 'Aguadulce',lng: -80.54, lat: 8.24 },
  { name: 'Panamá',   lng: -79.51, lat: 8.99 },
  { name: 'Chitré',   lng: -80.43, lat: 7.97 },
  { name: 'Colón',    lng: -79.90, lat: 9.36 },
]

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl p-4 th-shadow" style={{ background:'var(--bg-card)', border:`1px solid var(--border)`, borderLeft:`3px solid ${color}` }}>
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
    totalFiltered, getColor, ORG_COLORS,
    isLoading, error,
  } = hook

  const [tooltip, setTooltip] = useState(null)
  const svgRef = useRef(null)

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size={16} /></div>
  if (error)     return <LoadError message={error} />

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Con GPS"        value={kpis.total}  color="var(--accent)" sub="de 89 órdenes totales" />
        <KpiCard label="Cerradas"       value={kpis.closed} color="#16a34a" />
        <KpiCard label="Abiertas"       value={kpis.open}   color="#fbbf24" />
        <KpiCard label="Organizaciones" value={kpis.orgs}   color="#818cf8" />
      </div>

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

      <div className="rounded-2xl p-5 th-shadow relative"
        style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <div className="mb-3">
          <h3 className="text-[13px] font-bold th-text-p">Mapa de Panamá — Sitios Inspeccionados</h3>
          <p className="text-[11px] th-text-m mt-0.5">Cada punto es un sitio con GPS registrado · Hover para ver detalles</p>
        </div>

        <div className="relative overflow-hidden rounded-xl"
          style={{ background:'var(--bg-base)', border:'1px solid var(--border-light)' }}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
            style={{ width:'100%', height:'auto', display:'block' }}
            onMouseLeave={() => setTooltip(null)}>
            <rect x={0} y={0} width={W} height={H} fill="var(--bg-base)" />
            <polygon points={outlinePts} fill="var(--bg-card)" stroke="var(--border)" strokeWidth={1.5} strokeLinejoin="round" />
            {CITIES.map(c => {
              const { x, y } = project(c.lng, c.lat)
              return (
                <g key={c.name}>
                  <circle cx={x} cy={y} r={2.5} fill="var(--text-muted)" opacity={0.5} />
                  <text x={x+4} y={y+4} fontSize={8.5} fill="var(--text-muted)" fontFamily="system-ui, sans-serif" opacity={0.8}>{c.name}</text>
                </g>
              )
            })}
            {scatterData.map((d, i) => {
              const { x, y } = project(d.x, d.y)
              const color = getColor(d.orgCode, d.status)
              return (
                <circle key={i} cx={x} cy={y} r={5.5}
                  fill={color} fillOpacity={0.85}
                  stroke="#fff" strokeWidth={1.2}
                  style={{ cursor:'pointer', transition:'r .12s' }}
                  onMouseEnter={e => {
                    e.target.setAttribute('r', '8')
                    const rect = svgRef.current?.getBoundingClientRect()
                    const scale = rect ? rect.width / W : 1
                    setTooltip({ d, px: x * scale, py: y * scale })
                  }}
                  onMouseLeave={e => e.target.setAttribute('r', '5.5')}
                />
              )
            })}
          </svg>

          {tooltip && (
            <div className="absolute pointer-events-none z-10 rounded-xl p-3 shadow-lg text-[12px]"
              style={{
                background:'var(--bg-card)', border:'1px solid var(--border)',
                left: Math.min(tooltip.px + 12, 220),
                top:  Math.max(tooltip.py - 70, 4),
                maxWidth: 210,
              }}>
              <div className="font-bold th-text-p text-[13px]">{tooltip.d.siteId}</div>
              <div className="th-text-m mt-0.5 truncate">{tooltip.d.siteName}</div>
              <div className="th-text-m mt-0.5">Inspector: {tooltip.d.inspector}</div>
              <div className="th-text-m">{tooltip.d.dateLabel}</div>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: tooltip.d.status==='closed'?'#dcfce7':'#dbeafe', color: tooltip.d.status==='closed'?'#15803d':'#1d4ed8' }}>
                {tooltip.d.status}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-3">
          {Object.entries(ORG_COLORS).map(([org, color]) => (
            <div key={org} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background:color }} />
              <span className="text-[11px] th-text-m">{org} · cerradas</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-[11px] th-text-m">Abiertas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
