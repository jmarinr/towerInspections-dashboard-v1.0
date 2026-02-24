import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Download, Image as ImageIcon, MapPin, Calendar,
  Clock, FileText, CheckCircle2, AlertTriangle,
  XCircle, Minus, X, User2, ChevronRight, ExternalLink,
} from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload, groupAssetsBySection, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'

// ── Status Pill ──
const STATUS_MAP = {
  '✅ Bueno': { icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  '⚠️ Regular': { icon: AlertTriangle, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  '❌ Malo': { icon: XCircle, cls: 'text-red-700 bg-red-50 border-red-200' },
  '➖ N/A': { icon: Minus, cls: 'text-gray-500 bg-gray-50 border-gray-200' },
  '⏳ Pendiente': { icon: Clock, cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  '✅ Ejecutada': { icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
}

function StatusPill({ value }) {
  const raw = String(value || '')
  const cfg = STATUS_MAP[raw]
  if (!cfg) return <span className="text-[12px] text-gray-600">{value || '—'}</span>
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.cls}`}>
      <Icon size={10} /> {raw.replace(/^[^\s]+\s/, '')}
    </span>
  )
}

// ── Section Photos (always visible) ──
function SectionPhotos({ photos }) {
  const [zoomed, setZoomed] = useState(null)
  if (!photos?.length) return null

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <ImageIcon size={12} className="text-teal-600" />
        <span className="text-[11px] font-semibold text-teal-700">{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((p) => (
          <button key={p.id} onClick={() => setZoomed(p)} className="rounded-lg overflow-hidden border border-gray-200 hover:shadow-soft transition-all text-left group bg-white">
            <img src={p.public_url} alt={p.label} className="w-full h-24 object-cover bg-gray-100" loading="lazy" />
            <div className="px-2 py-1.5">
              <div className="text-[10px] font-medium text-gray-700 truncate">{p.label}</div>
            </div>
          </button>
        ))}
      </div>
      {zoomed && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setZoomed(null)}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomed(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white"><X size={24} /></button>
            <img src={zoomed.public_url} alt={zoomed.label} className="w-full rounded-xl" />
            <div className="text-center mt-3 text-white text-sm font-medium">{zoomed.label}</div>
            <a href={zoomed.public_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 text-white/70 hover:text-white text-sm">
              <ExternalLink size={14} /> Abrir en nueva pestaña
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Field Grid ──
function FieldGrid({ data }) {
  if (!data || typeof data !== 'object') return null
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== '' && v !== '—')
  if (!entries.length) return <div className="text-[12px] text-gray-400 italic py-2">Sin datos capturados</div>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {entries.map(([label, value]) => (
        <div key={label} className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</div>
          <div className="text-[13px] font-medium text-gray-800 mt-0.5 break-words">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Checklist Table ──
function ChecklistTable({ items }) {
  if (!Array.isArray(items) || !items.length) return null
  const hasValue = items.some(i => i['Valor'])
  const hasObs = items.some(i => i['Observación'])
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-[12px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Ítem</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-28">Estado</th>
            {hasValue && <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-24">Valor</th>}
            {hasObs && <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Observación</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50/50">
              <td className="px-3 py-2.5 text-gray-400 font-mono">{item['#'] || idx + 1}</td>
              <td className="px-3 py-2.5 text-gray-700 font-medium">{item['Ítem'] || item['Pregunta'] || item['Actividad'] || '—'}</td>
              <td className="px-3 py-2.5"><StatusPill value={item['Estado']} /></td>
              {hasValue && <td className="px-3 py-2.5 text-gray-500">{item['Valor'] || ''}</td>}
              {hasObs && <td className="px-3 py-2.5 text-gray-500 max-w-xs">{item['Observación'] || ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Data Section ──
function DataSection({ title, data, photos }) {
  const isChecklist = Array.isArray(data) && data.some(d => d?.['Estado'])
  const isTable = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && !isChecklist
  const isFields = data && typeof data === 'object' && !Array.isArray(data)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-teal-500" />
        <h3 className="text-[13px] font-semibold text-gray-800">{title}</h3>
        {isChecklist && <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{data.length}</span>}
      </div>
      {isChecklist && <ChecklistTable items={data} />}
      {isTable && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-[12px]">
            <thead><tr className="bg-gray-50">{Object.keys(data[0]).map(k => <th key={k} className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{k}</th>)}</tr></thead>
            <tbody>{data.map((row, i) => <tr key={i} className="border-t border-gray-100">{Object.values(row).map((v, j) => <td key={j} className="px-3 py-2.5 text-gray-600">{v != null ? String(v) : '—'}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {isFields && <FieldGrid data={data} />}
      <SectionPhotos photos={photos} />
    </div>
  )
}

// ── MAIN ──
export default function SubmissionDetail() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const loadDetail = useSubmissionsStore((s) => s.loadDetail)
  const clearDetail = useSubmissionsStore((s) => s.clearDetail)
  const submission = useSubmissionsStore((s) => s.activeSubmission)
  const assets = useSubmissionsStore((s) => s.activeAssets)
  const isLoading = useSubmissionsStore((s) => s.isLoadingDetail)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => { if (submissionId) loadDetail(submissionId); return () => clearDetail() }, [submissionId])

  const handleDownloadPdf = async () => {
    if (!submission) return
    setPdfLoading(true)
    try { await downloadSubmissionPdf(submission, assets) } catch (e) { console.error(e) }
    setPdfLoading(false)
  }

  const photosBySection = useMemo(() => {
    if (!assets?.length || !submission) return {}
    return groupAssetsBySection(assets, submission.form_code)
  }, [assets, submission])

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Spinner size={20} /><span className="ml-3 text-sm text-gray-400">Cargando informe…</span></div>
  }
  if (!submission) {
    return (
      <div className="text-center py-20">
        <FileText size={32} className="mx-auto text-gray-300 mb-3" />
        <div className="text-sm font-medium text-gray-500">Formulario no encontrado</div>
        <Link to="/submissions"><button className="mt-4 text-sm font-medium text-teal-600 hover:underline">← Volver a formularios</button></Link>
      </div>
    )
  }

  const meta = getFormMeta(submission.form_code)
  const Icon = meta.icon
  const site = extractSiteInfo(submission)
  const inspMeta = extractMeta(submission)
  const cleanPayload = getCleanPayload(submission)
  const totalPhotos = assets.filter(a => a.public_url).length
  const finalized = submission.finalized || isFinalized(submission)
  const submitter = extractSubmittedBy(submission)
  const visitId = submission.site_visit_id
  const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

  // Checklist stats
  let totalItems = 0, bueno = 0, regular = 0, malo = 0, pendiente = 0
  for (const sec of Object.values(cleanPayload)) {
    if (!Array.isArray(sec)) continue
    for (const item of sec) {
      if (!item['Estado']) continue
      totalItems++
      const st = item['Estado']
      if (st.includes('Bueno') || st.includes('Ejecutada')) bueno++
      else if (st.includes('Regular')) regular++
      else if (st.includes('Malo')) malo++
      else if (st.includes('Pendiente')) pendiente++
    }
  }

  // Photo matching
  const findPhotosForSection = (title) => {
    if (photosBySection[title]) return photosBySection[title]
    const clean = title.replace(/^[^\w]*/, '').trim().toLowerCase()
    for (const [key, photos] of Object.entries(photosBySection)) {
      const kc = key.replace(/^[^\w]*/, '').trim().toLowerCase()
      if (kc.includes(clean) || clean.includes(kc)) return photos
    }
    return null
  }

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
  const unmatchedPhotos = Object.entries(photosBySection).filter(([k]) => !matchedSections.has(k)).flatMap(([, p]) => p)

  return (
    <div className="max-w-5xl space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={16} /> Volver
        </button>
        <button onClick={handleDownloadPdf} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
          <Download size={14} /> {pdfLoading ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-card overflow-hidden">
        <div className={`${meta.color} px-6 py-4 flex items-center gap-4`}>
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white/70 text-[11px] font-medium">{meta.label}</div>
            <div className="text-white text-lg font-bold">{site.nombreSitio}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md">{site.idSitio}</span>
            {finalized ? (
              <span className="bg-emerald-500/30 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle2 size={10} /> Final</span>
            ) : (
              <span className="bg-amber-500/30 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1"><Clock size={10} /> Borrador</span>
            )}
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><MapPin size={10} /> Sitio</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{site.nombreSitio}</div>
            <div className="text-[10px] text-gray-400">{site.tipoSitio || site.idSitio}</div>
          </div>
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><User2 size={10} /> Inspector</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{submitter?.name || submitter?.username || '—'}</div>
            <div className="text-[10px] text-gray-400">{submitter?.role || ''}</div>
          </div>
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><Calendar size={10} /> Fecha</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{inspMeta.date || (submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '—')}</div>
            <div className="text-[10px] text-gray-400">{inspMeta.time ? `Hora: ${inspMeta.time}` : ''}</div>
          </div>
          <div className="bg-gray-50/80 rounded-lg px-3 py-2.5 border border-gray-100">
            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1"><ImageIcon size={10} /> Evidencia</div>
            <div className="text-[13px] font-medium text-gray-800 mt-0.5">{totalPhotos} foto{totalPhotos !== 1 ? 's' : ''}</div>
            <div className="text-[10px] text-gray-400">App v{submission.app_version || '?'}</div>
          </div>
        </div>

        {/* Order link */}
        {hasOrder && (
          <div className="px-5 pb-4">
            <Link to={`/orders/${visitId}`} className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 hover:bg-teal-100 transition-colors">
              <FileText size={12} className="text-teal-600" />
              <span className="text-[11px] font-semibold text-teal-700">Ver orden de visita completa</span>
              <ChevronRight size={12} className="text-teal-400 ml-auto" />
            </Link>
          </div>
        )}

        {/* Checklist summary bar */}
        {totalItems > 0 && (
          <div className="px-5 pb-5">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Resumen de evaluación</div>
              <div className="flex flex-wrap gap-4 text-[12px]">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> <b className="text-emerald-700">{bueno}</b> <span className="text-gray-400">Bueno</span></span>
                <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-amber-500" /> <b className="text-amber-600">{regular}</b> <span className="text-gray-400">Regular</span></span>
                <span className="flex items-center gap-1"><XCircle size={12} className="text-red-500" /> <b className="text-red-600">{malo}</b> <span className="text-gray-400">Malo</span></span>
                {pendiente > 0 && <span className="flex items-center gap-1"><Clock size={12} className="text-blue-500" /> <b className="text-blue-600">{pendiente}</b> <span className="text-gray-400">Pendiente</span></span>}
                <span className="ml-auto text-[11px] text-gray-400 font-medium">{totalItems} ítems</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden flex">
                {bueno > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(bueno / totalItems) * 100}%` }} />}
                {regular > 0 && <div className="h-full bg-amber-400" style={{ width: `${(regular / totalItems) * 100}%` }} />}
                {malo > 0 && <div className="h-full bg-red-500" style={{ width: `${(malo / totalItems) * 100}%` }} />}
                {pendiente > 0 && <div className="h-full bg-blue-400" style={{ width: `${(pendiente / totalItems) * 100}%` }} />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data sections */}
      {sectionEntries.map(([title, data]) => (
        <div key={title} className="bg-white rounded-xl border border-gray-200/60 shadow-card p-5">
          <DataSection title={title} data={data} photos={findPhotosForSection(title)} />
        </div>
      ))}

      {sectionEntries.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 py-16 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <div className="text-sm font-medium text-gray-500">Sin datos de formulario</div>
          <div className="text-[12px] text-gray-400 mt-1">El inspector aún no ha capturado datos</div>
        </div>
      )}

      {/* Unmatched photos */}
      {unmatchedPhotos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h3 className="text-[13px] font-semibold text-gray-800">📷 Otras fotos</h3>
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{unmatchedPhotos.length}</span>
          </div>
          <SectionPhotos photos={unmatchedPhotos} />
        </div>
      )}
    </div>
  )
}
