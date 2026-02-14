import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Download, Image as ImageIcon, MapPin, Calendar,
  Clock, Globe, FileText, CheckCircle2, AlertTriangle,
  XCircle, Minus, ClipboardList, ChevronDown, ChevronRight, X,
  User2,
} from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload, groupAssetsBySection } from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'

// ===== STATUS PILL =====
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
  if (!cfg) return <span className="text-sm text-primary/80">{value || '—'}</span>
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <Icon size={13} /> {raw.replace(/^[^\s]+\s/, '')}
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

// ===== KEY-VALUE FIELDS =====
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

// ===== CHECKLIST TABLE =====
function ChecklistTable({ items }) {
  if (!Array.isArray(items) || !items.length) return null
  const hasValue = items.some(i => i['Valor'])
  const hasObs = items.some(i => i['Observación'])

  return (
    <div className="overflow-x-auto rounded-2xl border border-primary/8">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-primary/[0.03]">
            <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide w-12">#</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide">Ítem</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide w-32">Estado</th>
            {hasValue && <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide w-28">Valor</th>}
            {hasObs && <th className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide">Observación</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-t border-primary/6 hover:bg-primary/[0.015] transition-colors">
              <td className="px-3 py-2.5 text-xs text-primary/50 font-mono">{item['#'] || idx + 1}</td>
              <td className="px-3 py-2.5 text-sm text-primary font-medium">{item['Ítem'] || item['Pregunta'] || '—'}</td>
              <td className="px-3 py-2.5"><StatusPill value={item['Estado']} /></td>
              {hasValue && <td className="px-3 py-2.5 text-sm text-primary/70">{item['Valor'] || ''}</td>}
              {hasObs && <td className="px-3 py-2.5 text-sm text-primary/60 max-w-xs">{item['Observación'] || ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== SECTION PHOTO STRIP (collapsible, lazy) =====
function SectionPhotos({ photos }) {
  const [open, setOpen] = useState(false)
  const [zoomedPhoto, setZoomedPhoto] = useState(null)

  if (!photos || !photos.length) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-bold text-accent hover:text-accent/80 transition-colors"
      >
        <ImageIcon size={13} />
        {photos.length} foto{photos.length !== 1 ? 's' : ''} en esta sección
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setZoomedPhoto(p)}
              className="rounded-xl overflow-hidden border border-primary/8 bg-white hover:shadow-soft transition-all text-left group"
            >
              <img
                src={p.public_url}
                alt={p.label}
                className="w-full h-28 object-cover bg-primary/5"
                loading="lazy"
              />
              <div className="p-2">
                <div className="text-[10px] font-bold text-primary truncate">{p.label}</div>
                <div className="text-[9px] text-primary/40 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setZoomedPhoto(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomedPhoto(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white">
              <X size={24} />
            </button>
            <img src={zoomedPhoto.public_url} alt={zoomedPhoto.label} className="w-full rounded-2xl" />
            <div className="text-center mt-3">
              <div className="text-white font-bold text-sm">{zoomedPhoto.label}</div>
              <div className="text-white/50 text-xs mt-1">{zoomedPhoto.asset_type}</div>
            </div>
            <a href={zoomedPhoto.public_url} target="_blank" rel="noopener noreferrer" className="block mt-3">
              <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10">
                Abrir en nueva pestaña
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== DATA SECTION (with photos) =====
function DataSection({ title, data, photos }) {
  const isChecklist = Array.isArray(data) && data.some(d => d?.['Estado'])
  const isGenericTable = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && !isChecklist
  const isFields = data && typeof data === 'object' && !Array.isArray(data)

  return (
    <div>
      <SectionHeader title={title} count={isChecklist ? data.length : null} />
      {isChecklist && <ChecklistTable items={data} />}
      {isGenericTable && (
        <div className="overflow-x-auto rounded-2xl border border-primary/8">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-primary/[0.03]">
                {Object.keys(data[0]).map(key => (
                  <th key={key} className="text-left px-3 py-2.5 text-[10px] font-extrabold text-primary/60 uppercase tracking-wide">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-t border-primary/6">
                  {Object.values(row).map((val, vi) => (
                    <td key={vi} className="px-3 py-2.5 text-sm text-primary/80">{val != null ? String(val) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isFields && <FieldGrid data={data} />}
      {!isChecklist && !isGenericTable && !isFields && (
        <div className="text-sm text-primary/70">{String(data)}</div>
      )}
      <SectionPhotos photos={photos} />
    </div>
  )
}

// ===== MAIN =====
export default function SubmissionDetail() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const loadDetail = useSubmissionsStore((s) => s.loadDetail)
  const clearDetail = useSubmissionsStore((s) => s.clearDetail)
  const submission = useSubmissionsStore((s) => s.activeSubmission)
  const assets = useSubmissionsStore((s) => s.activeAssets)
  const isLoading = useSubmissionsStore((s) => s.isLoadingDetail)
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

  // Group photos by section
  const photosBySection = useMemo(() => {
    if (!assets?.length || !submission) return {}
    return groupAssetsBySection(assets, submission.form_code)
  }, [assets, submission])

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
        <Link to="/submissions"><Button variant="outline" className="mt-4">Volver</Button></Link>
      </div>
    )
  }

  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const site = extractSiteInfo(submission)
  const inspMeta = extractMeta(submission)
  const cleanPayload = getCleanPayload(submission)
  const totalPhotos = assets.filter(a => a.public_url).length
  const createdAt = submission.created_at ? new Date(submission.created_at) : null

  // Checklist stats
  let totalItems = 0, bueno = 0, regular = 0, malo = 0, pendiente = 0
  for (const sec of Object.values(cleanPayload)) {
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

  // Find matching section photos by title similarity
  const findPhotosForSection = (sectionTitle) => {
    // Direct match
    if (photosBySection[sectionTitle]) return photosBySection[sectionTitle]
    // Partial match (remove emoji prefix)
    const clean = sectionTitle.replace(/^[^\w]*/, '').trim().toLowerCase()
    for (const [key, photos] of Object.entries(photosBySection)) {
      const keyClean = key.replace(/^[^\w]*/, '').trim().toLowerCase()
      if (keyClean.includes(clean) || clean.includes(keyClean)) return photos
    }
    return null
  }

  // Collect unmatched photos
  const matchedSections = new Set()
  const sectionEntries = Object.entries(cleanPayload)
  for (const [title] of sectionEntries) {
    const photos = findPhotosForSection(title)
    if (photos) {
      for (const [key, val] of Object.entries(photosBySection)) {
        if (val === photos) matchedSections.add(key)
      }
    }
  }
  const unmatchedPhotos = Object.entries(photosBySection)
    .filter(([key]) => !matchedSections.has(key))
    .flatMap(([, photos]) => photos)

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <Button variant="accent" onClick={handleDownloadPdf} disabled={pdfLoading}>
          <Download size={16} /> {pdfLoading ? 'Generando…' : 'Descargar PDF'}
        </Button>
      </div>

      {/* Report header */}
      <Card className="p-0 overflow-hidden">
        <div className={`${meta.color} px-5 py-4 flex items-center gap-3`}>
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
            <Icon size={22} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white/70 text-[11px] font-bold">{meta.label}</div>
            <div className="text-white text-lg font-extrabold">{site.nombreSitio}</div>
          </div>
          <Badge tone="neutral" className="bg-white/20 text-white border-0">{site.idSitio}</Badge>
        </div>

        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <InfoChip icon={MapPin} label="Sitio" value={site.nombreSitio} sub={site.tipoSitio || site.idSitio} />
          <InfoChip icon={Globe} label="Ubicación"
            value={inspMeta.lat ? `${Number(inspMeta.lat).toFixed(4)}, ${Number(inspMeta.lng).toFixed(4)}` : (site.coordenadas || '—')}
            sub={site.direccion || null}
          />
          <InfoChip icon={Calendar} label="Fecha"
            value={inspMeta.date || (createdAt ? createdAt.toLocaleDateString() : '—')}
            sub={inspMeta.time ? `Hora: ${inspMeta.time}` : null}
          />
          <InfoChip icon={ImageIcon} label="Evidencia"
            value={`${totalPhotos} foto${totalPhotos !== 1 ? 's' : ''}`}
            sub={`App v${submission.app_version || '?'}`}
          />
        </div>

        {/* Checklist summary */}
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
                <div className="ml-auto text-xs text-primary/40 font-bold self-center">{totalItems} ítems</div>
              </div>
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

      {/* All data sections with inline photos */}
      {sectionEntries.map(([sectionTitle, sectionData]) => (
        <Card key={sectionTitle} className="p-4">
          <DataSection
            title={sectionTitle}
            data={sectionData}
            photos={findPhotosForSection(sectionTitle)}
          />
        </Card>
      ))}

      {/* Empty state */}
      {sectionEntries.length === 0 && (
        <Card className="p-8 text-center">
          <FileText size={32} className="mx-auto text-primary/20 mb-3" />
          <div className="text-sm font-bold text-primary/50">Sin datos de formulario</div>
          <div className="text-xs text-primary/40 mt-1">El inspector aún no ha capturado datos</div>
        </Card>
      )}

      {/* Unmatched photos (ones that couldn't be mapped to a section) */}
      {unmatchedPhotos.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="📷 Otras fotos" count={unmatchedPhotos.length} />
          <SectionPhotos photos={unmatchedPhotos} />
        </Card>
      )}
    </div>
  )
}
