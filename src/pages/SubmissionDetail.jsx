import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Download, Image as ImageIcon, MapPin, Calendar,
  Smartphone, Clock, Globe, FileText, CheckCircle2, AlertTriangle,
  XCircle, Minus, ClipboardList, ChevronRight,
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload } from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'

// ===== STATUS VISUAL COMPONENTS =====
const STATUS_CONFIG = {
  '✅ Bueno': { icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  '⚠️ Regular': { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  '❌ Malo': { icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  '➖ N/A': { icon: Minus, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  '⏳ Pendiente': { icon: Clock, bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-200' },
}

function StatusPill({ value }) {
  const raw = String(value || '')
  const cfg = STATUS_CONFIG[raw]
  if (!cfg) {
    // Not a status value, just show text
    return <span className="text-sm text-primary/80">{value || '—'}</span>
  }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <Icon size={13} />
      {raw.replace(/^[^\s]+\s/, '')}
    </span>
  )
}

// ===== INFO CHIP =====
function InfoChip({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-primary/8 p-3.5 bg-white">
      <div className="text-[11px] text-primary/50 font-bold flex items-center gap-1.5">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="font-bold text-primary text-sm mt-1 break-words">{value || '—'}</div>
      {sub && <div className="text-[11px] text-primary/40 mt-0.5">{sub}</div>}
    </div>
  )
}

// ===== SECTION HEADER =====
function SectionHeader({ title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3 pt-1">
      <div className="w-1 h-5 rounded-full bg-accent" />
      <h3 className="text-sm font-extrabold text-primary">{title}</h3>
      {count != null && (
        <span className="text-[10px] font-bold text-primary/40 bg-primary/5 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

// ===== KEY-VALUE FIELDS (for form data sections) =====
function FieldGrid({ data }) {
  if (!data || typeof data !== 'object') return null
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== '' && v !== '—')
  if (!entries.length) return <div className="text-sm text-primary/40 italic">Sin datos capturados</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {entries.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-primary/6 bg-surface p-3">
          <div className="text-[10px] text-primary/50 font-bold uppercase tracking-wide">{label}</div>
          <div className="text-sm font-semibold text-primary mt-0.5 break-words">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== CHECKLIST TABLE (for inspection items) =====
function ChecklistTable({ items }) {
  if (!Array.isArray(items) || !items.length) return null

  return (
    <div className="overflow-x-auto rounded-2xl border border-primary/8">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-primary/[0.03]">
            <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide w-12">#</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide">Ítem</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide w-32">Estado</th>
            {items.some(i => i['Valor']) && (
              <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide w-28">Valor</th>
            )}
            {items.some(i => i['Observación']) && (
              <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide">Observación</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const itemLabel = item['Ítem'] || item['Pregunta'] || item['name'] || '—'
            const status = item['Estado'] || '—'
            return (
              <tr key={idx} className="border-t border-primary/6 hover:bg-primary/[0.015] transition-colors">
                <td className="px-3 py-2.5 text-xs text-primary/50 font-mono">{item['#'] || idx + 1}</td>
                <td className="px-3 py-2.5 text-sm text-primary font-medium">{itemLabel}</td>
                <td className="px-3 py-2.5"><StatusPill value={status} /></td>
                {items.some(i => i['Valor']) && (
                  <td className="px-3 py-2.5 text-sm text-primary/70">{item['Valor'] || ''}</td>
                )}
                {items.some(i => i['Observación']) && (
                  <td className="px-3 py-2.5 text-sm text-primary/60 max-w-xs">{item['Observación'] || ''}</td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ===== SMART SECTION RENDERER =====
function DataSection({ title, data }) {
  // Array of objects = checklist/table
  if (Array.isArray(data)) {
    const hasStatusField = data.some(d => d && d['Estado'])
    if (hasStatusField) {
      return (
        <div>
          <SectionHeader title={title} count={data.length} />
          <ChecklistTable items={data} />
        </div>
      )
    }
    // Generic array of objects (equipment, clients, etc.)
    if (data.length > 0 && typeof data[0] === 'object') {
      return (
        <div>
          <SectionHeader title={title} count={data.length} />
          <div className="overflow-x-auto rounded-2xl border border-primary/8">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-primary/[0.03]">
                  {Object.keys(data[0]).map(key => (
                    <th key={key} className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-t border-primary/6">
                    {Object.values(row).map((val, vi) => (
                      <td key={vi} className="px-3 py-2.5 text-sm text-primary/80">
                        {val != null ? String(val) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  }

  // Object = key-value fields
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div>
        <SectionHeader title={title} />
        <FieldGrid data={data} />
      </div>
    )
  }

  // Primitive
  return (
    <div>
      <SectionHeader title={title} />
      <div className="text-sm text-primary/70">{String(data)}</div>
    </div>
  )
}

// ===== MAIN COMPONENT =====
export default function SubmissionDetail() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const loadDetail = useSubmissionsStore((s) => s.loadDetail)
  const clearDetail = useSubmissionsStore((s) => s.clearDetail)
  const submission = useSubmissionsStore((s) => s.activeSubmission)
  const assets = useSubmissionsStore((s) => s.activeAssets)
  const isLoading = useSubmissionsStore((s) => s.isLoadingDetail)

  const [photoOpen, setPhotoOpen] = useState(false)
  const [activePhoto, setActivePhoto] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    if (submissionId) loadDetail(submissionId)
    return () => clearDetail()
  }, [submissionId])

  const handleDownloadPdf = async () => {
    if (!submission) return
    setPdfLoading(true)
    try { await downloadSubmissionPdf(submission, assets) } catch (e) { console.error(e) }
    setPdfLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size={28} />
        <span className="text-sm text-primary/60 font-bold">Cargando informe…</span>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <ClipboardList size={40} className="mx-auto text-primary/20 mb-3" />
        <div className="font-extrabold text-primary">Orden no encontrada</div>
        <Link to="/submissions"><Button variant="outline" className="mt-4">Volver a Submissions</Button></Link>
      </div>
    )
  }

  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const site = extractSiteInfo(submission)
  const inspMeta = extractMeta(submission)
  const cleanPayload = getCleanPayload(submission)
  const photos = assets.filter((a) => a.public_url)
  const createdAt = submission.created_at ? new Date(submission.created_at) : null
  const updatedAt = submission.updated_at ? new Date(submission.updated_at) : null

  // Count checklist stats for summary
  const allSections = Object.values(cleanPayload)
  let totalItems = 0, bueno = 0, regular = 0, malo = 0, pendiente = 0
  for (const sec of allSections) {
    if (!Array.isArray(sec)) continue
    for (const item of sec) {
      if (!item['Estado']) continue
      totalItems++
      const st = item['Estado']
      if (st.includes('Bueno')) bueno++
      else if (st.includes('Regular')) regular++
      else if (st.includes('Malo')) malo++
      else if (st.includes('Pendiente')) pendiente++
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* === TOP BAR === */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <Button variant="accent" onClick={handleDownloadPdf} disabled={pdfLoading}>
          <Download size={16} /> {pdfLoading ? 'Generando…' : 'Descargar PDF'}
        </Button>
      </div>

      {/* === REPORT HEADER === */}
      <Card className="p-0 overflow-hidden">
        {/* Colored banner */}
        <div className={`${meta.color} px-5 py-4 flex items-center gap-3`}>
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <Icon size={22} className="text-white" />
          </div>
          <div>
            <div className="text-white/70 text-[11px] font-bold">{meta.label}</div>
            <div className="text-white text-lg font-extrabold">{site.nombreSitio}</div>
          </div>
          <div className="ml-auto">
            <Badge tone="neutral" className="bg-white/20 text-white border-0">{site.idSitio}</Badge>
          </div>
        </div>

        {/* Site info chips */}
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <InfoChip icon={MapPin} label="Sitio" value={site.nombreSitio} sub={site.tipoSitio || site.idSitio} />
          <InfoChip icon={Globe} label="Ubicación"
            value={inspMeta.lat ? `${Number(inspMeta.lat).toFixed(4)}, ${Number(inspMeta.lng).toFixed(4)}` : (site.coordenadas || site.direccion || '—')}
            sub={site.direccion && inspMeta.lat ? site.direccion : null}
          />
          <InfoChip icon={Calendar} label="Fecha"
            value={inspMeta.date || (createdAt ? createdAt.toLocaleDateString() : '—')}
            sub={inspMeta.time ? `Hora: ${inspMeta.time}` : (createdAt ? createdAt.toLocaleTimeString() : null)}
          />
          <InfoChip icon={ImageIcon} label="Evidencia"
            value={`${photos.length} foto${photos.length !== 1 ? 's' : ''}`}
            sub={`App v${submission.app_version || '?'} · ${submission.device_id?.slice(0, 8)}…`}
          />
        </div>

        {/* Checklist summary bar (if applicable) */}
        {totalItems > 0 && (
          <div className="px-4 pb-4">
            <div className="rounded-2xl bg-surface border border-primary/6 p-3">
              <div className="text-[10px] text-primary/50 font-bold uppercase tracking-wide mb-2">Resumen de evaluación</div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">{bueno}</span>
                  <span className="text-xs text-primary/50">Bueno</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="text-sm font-bold text-amber-700">{regular}</span>
                  <span className="text-xs text-primary/50">Regular</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle size={14} className="text-red-600" />
                  <span className="text-sm font-bold text-red-700">{malo}</span>
                  <span className="text-xs text-primary/50">Malo</span>
                </div>
                {pendiente > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    <span className="text-sm font-bold text-blue-600">{pendiente}</span>
                    <span className="text-xs text-primary/50">Pendiente</span>
                  </div>
                )}
                <div className="ml-auto text-xs text-primary/40 font-bold self-center">
                  {totalItems} ítems evaluados
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 rounded-full bg-primary/10 overflow-hidden flex">
                {bueno > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(bueno / totalItems) * 100}%` }} />}
                {regular > 0 && <div className="h-full bg-amber-400" style={{ width: `${(regular / totalItems) * 100}%` }} />}
                {malo > 0 && <div className="h-full bg-red-500" style={{ width: `${(malo / totalItems) * 100}%` }} />}
                {pendiente > 0 && <div className="h-full bg-blue-300" style={{ width: `${(pendiente / totalItems) * 100}%` }} />}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* === ALL DATA SECTIONS === */}
      {Object.entries(cleanPayload).map(([sectionTitle, sectionData]) => (
        <Card key={sectionTitle} className="p-4">
          <DataSection title={sectionTitle} data={sectionData} />
        </Card>
      ))}

      {/* Empty state if no data */}
      {Object.keys(cleanPayload).length === 0 && (
        <Card className="p-8 text-center">
          <FileText size={32} className="mx-auto text-primary/20 mb-3" />
          <div className="text-sm font-bold text-primary/50">Sin datos de formulario</div>
          <div className="text-xs text-primary/40 mt-1">El inspector aún no ha capturado datos en esta orden</div>
        </Card>
      )}

      {/* === PHOTO GALLERY === */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
            <ImageIcon size={16} className="text-accent" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-primary">Evidencia fotográfica</div>
            <div className="text-[11px] text-primary/50">
              {photos.length
                ? `${photos.length} foto${photos.length !== 1 ? 's' : ''} · Toca para ampliar`
                : 'Sin fotos subidas'}
            </div>
          </div>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => {
              const parts = (p.asset_type || '').split(':')
              const label = parts.length >= 2 ? parts.slice(1).join(' · ') : p.asset_type || 'Foto'

              return (
                <button
                  key={p.id}
                  onClick={() => { setActivePhoto({ ...p, label }); setPhotoOpen(true) }}
                  className="rounded-2xl overflow-hidden border border-primary/8 bg-white hover:shadow-soft transition-all active:scale-[0.98] text-left group"
                >
                  <div className="relative">
                    <img src={p.public_url} alt={label} className="w-full h-36 object-cover bg-primary/5" loading="lazy" />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                      <ChevronRight size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="text-[11px] font-bold text-primary truncate">{label}</div>
                    <div className="text-[10px] text-primary/40 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-primary/40">
            <ImageIcon size={36} className="mx-auto mb-2 opacity-20" />
            <div className="text-sm font-bold">Sin fotos en storage</div>
            <div className="text-xs mt-1">Las fotos aparecerán cuando el inspector las suba</div>
          </div>
        )}
      </Card>

      {/* === PHOTO MODAL === */}
      <Modal
        open={photoOpen}
        title={activePhoto ? `${activePhoto.label}` : 'Foto'}
        onClose={() => setPhotoOpen(false)}
      >
        {activePhoto && (
          <div className="space-y-3">
            <img src={activePhoto.public_url} alt={activePhoto.label} className="w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-primary/5 p-2.5">
                <div className="text-primary/50 font-bold text-[10px]">Tipo</div>
                <div className="text-primary font-bold text-xs mt-0.5">{activePhoto.asset_type}</div>
              </div>
              <div className="rounded-xl bg-primary/5 p-2.5">
                <div className="text-primary/50 font-bold text-[10px]">Fecha</div>
                <div className="text-primary font-bold text-xs mt-0.5">{new Date(activePhoto.created_at).toLocaleString()}</div>
              </div>
            </div>
            <a href={activePhoto.public_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full">Abrir en nueva pestaña</Button>
            </a>
          </div>
        )}
      </Modal>
    </div>
  )
}
