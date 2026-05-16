/**
 * TowerDetail.jsx
 * Vista 2: Detalle completo de una torre.
 * Diagrama SVG + tabla de equipos + equipos en piso + export Excel.
 */
import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Download, Hash, MapPin, Ruler, Building2, Radio } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import SiteStatusBadge from '../../components/tower-inventory/SiteStatusBadge'
import TowerDiagram from '../../components/tower-inventory/TowerDiagram'
import TowerEquipmentTable from '../../components/tower-inventory/TowerEquipmentTable'
import FloorEquipmentSection from '../../components/tower-inventory/FloorEquipmentSection'
import useTowerDetail from '../../hooks/useTowerDetail'
import { useAuthStore } from '../../store/useAuthStore'

function InfoTag({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className="th-text-m flex-shrink-0" />
      <span className="text-[11px] th-text-m">{label}</span>
      <span className="text-[12px] font-semibold th-text-p">{value}</span>
    </div>
  )
}

export default function TowerDetail() {
  // v4.14.3 — defensa: solo admins acceden a Inv. Torres
  const user = useAuthStore(s => s.user)
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const { siteId } = useParams()
  const navigate   = useNavigate()
  const [activeIdx, setActiveIdx] = useState(null)

  const {
    siteInfo,
    towerEquipment,
    floorEquipment,
    lastVisit,
    siteStatus,
    exportToExcel,
    isLoading,
    error,
  } = useTowerDetail(siteId)

  if (isLoading) return (
    <div className="flex justify-center py-24"><Spinner size={18} /></div>
  )

  if (error || !siteInfo) return (
    <div className="space-y-4">
      <button onClick={() => navigate('/tower-inventory')}
        className="flex items-center gap-2 text-[13px] th-text-m hover:th-text-p transition-colors">
        <ArrowLeft size={15} /> Volver al inventario
      </button>
      <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {error || 'Sitio no encontrado'}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Botón retorno */}
      <button onClick={() => navigate('/tower-inventory')}
        className="flex items-center gap-2 text-[13px] th-text-m hover:th-text-p transition-colors">
        <ArrowLeft size={15} /> Volver al inventario
      </button>

      {/* Header del sitio */}
      <div className="rounded-2xl p-5 border th-border th-shadow"
        style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[18px] font-bold th-text-p">{siteInfo.siteName}</h1>
              <SiteStatusBadge status={siteStatus} size="md" />
            </div>
            <div className="flex flex-wrap gap-4">
              <InfoTag icon={Hash}     label="ID Sitio"    value={siteInfo.siteId} />
              <InfoTag icon={Ruler}    label="Altura"      value={siteInfo.heightM ? `${siteInfo.heightM} m` : null} />
              <InfoTag icon={Building2} label="Estructura" value={siteInfo.structureType} />
              <InfoTag icon={Radio}    label="Tipo sitio"  value={siteInfo.siteType} />
              {siteInfo.lat && siteInfo.lng && (
                <InfoTag icon={MapPin} label="GPS" value={`${siteInfo.lat?.toFixed(4)}, ${siteInfo.lng?.toFixed(4)}`} />
              )}
            </div>
            {lastVisit && (
              <p className="text-[11px] th-text-m mt-1">
                Última inspección:{' '}
                {lastVisit.date && new Date(lastVisit.date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                {lastVisit.inspector && ` · ${lastVisit.inspector}`}
                {lastVisit.orderNum && ` · ${lastVisit.orderNum}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Agregar equipo — Fase 2 */}
            <button disabled title="Disponible en Fase 2"
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium border th-border th-text-m opacity-40 cursor-not-allowed">
              + Agregar equipo
            </button>
            {/* Export Excel */}
            {towerEquipment.length > 0 && (
              <button onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-colors"
                style={{ background: '#1e293b' }}>
                <Download size={13} />
                Descargar Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Layout diagrama + tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">

        {/* Diagrama SVG */}
        <div className="rounded-2xl p-4 border th-border th-shadow"
          style={{ background: 'var(--bg-card)' }}>
          <h2 className="text-[13px] font-semibold th-text-p mb-3">
            Diagrama de torre
          </h2>
          {towerEquipment.length > 0
            ? <TowerDiagram
                equipment={towerEquipment}
                siteInfo={siteInfo}
                activeIdx={activeIdx}
                onEquipmentClick={idx => setActiveIdx(idx === activeIdx ? null : idx)}
              />
            : <div className="text-center py-12 text-[12px] th-text-m">
                Sin equipos para mostrar
              </div>
          }
        </div>

        {/* Tabla de equipos en torre */}
        <div className="rounded-2xl p-5 border th-border th-shadow"
          style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold th-text-p">
              Equipos en torre
              <span className="ml-2 text-[12px] font-normal th-text-m">
                ({towerEquipment.length})
              </span>
            </h2>
          </div>
          <TowerEquipmentTable
            equipment={towerEquipment}
            activeIdx={activeIdx}
            onRowClick={idx => setActiveIdx(idx === activeIdx ? null : idx)}
          />
        </div>
      </div>

      {/* Equipos en piso */}
      <div className="rounded-2xl p-5 border th-border th-shadow"
        style={{ background: 'var(--bg-card)' }}>
        <h2 className="text-[14px] font-semibold th-text-p mb-4">
          Equipos en piso
          <span className="ml-2 text-[12px] font-normal th-text-m">
            ({floorEquipment.length} carrier{floorEquipment.length !== 1 ? 's' : ''})
          </span>
        </h2>
        <FloorEquipmentSection floorEquipment={floorEquipment} />
      </div>

    </div>
  )
}
