import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, X, ChevronRight } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload, groupAssetsBySection, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'

function StatusText({ value }) {
  const v = String(value || '')
  const label = v.replace(/^[^\s]+\s/, '')
  if (v.includes('Bueno') || v.includes('Ejecutada')) return <span className="text-success font-medium">{label}</span>
  if (v.includes('Regular')) return <span className="text-warning font-medium">{label}</span>
  if (v.includes('Malo')) return <span className="text-danger font-medium">{label}</span>
  if (v.includes('N/A')) return <span className="text-gray-400">{label}</span>
  if (v.includes('Pendiente')) return <span className="text-gray-400">{label}</span>
  return <span className="text-gray-600">{value || '—'}</span>
}

function Photos({ photos }) {
  const [z, setZ] = useState(null)
  if (!photos?.length) return null
  return (
    <>
      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-thin pb-1">
        {photos.map(p => (
          <button key={p.id} onClick={() => setZ(p)} className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-gray-200 hover:border-accent hover:shadow-ring transition-all bg-gray-50">
            <img src={p.public_url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {z && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setZ(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setZ(null)} className="absolute -top-9 right-0 text-white/60 hover:text-white"><X size={20} /></button>
            <img src={z.public_url} alt={z.label} className="w-full rounded-lg" />
            {z.label && <div className="text-center mt-2 text-white/70 text-sm">{z.label}</div>}
            <a href={z.public_url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center justify-center gap-1 text-white/40 hover:text-white/80 text-xs"><ExternalLink size={11}/>Abrir original</a>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, data, photos }) {
  const isCL = Array.isArray(data) && data.some(d => d?.['Estado'])
  const isTbl = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && !isCL
  const isFld = data && typeof data === 'object' && !Array.isArray(data)
  const hv = isCL && data.some(i => i['Valor']); const ho = isCL && data.some(i => i['Observación'])

  return (
    <div className="py-5 first:pt-0 border-b border-gray-100 last:border-0">
      <h3 className="text-sm font-medium text-gray-900 mb-3">{title}</h3>

      {isCL && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-3 py-1.5 text-2xs font-medium text-gray-500 w-8">#</th>
              <th className="text-left px-3 py-1.5 text-2xs font-medium text-gray-500">Ítem</th>
              <th className="text-left px-3 py-1.5 text-2xs font-medium text-gray-500 w-24">Estado</th>
              {hv && <th className="text-left px-3 py-1.5 text-2xs font-medium text-gray-500 w-20">Valor</th>}
              {ho && <th className="text-left px-3 py-1.5 text-2xs font-medium text-gray-500 max-w-[160px]">Obs.</th>}
            </tr></thead>
            <tbody>{data.map((it, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-2 text-2xs text-gray-400 tabular-nums">{it['#'] || i + 1}</td>
                <td className="px-3 py-2 text-gray-700">{it['Ítem'] || it['Pregunta'] || it['Actividad'] || '—'}</td>
                <td className="px-3 py-2"><StatusText value={it['Estado']} /></td>
                {hv && <td className="px-3 py-2 text-gray-500">{it['Valor'] || ''}</td>}
                {ho && <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{it['Observación'] || ''}</td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {isTbl && (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">{Object.keys(data[0]).map(k => <th key={k} className="text-left px-3 py-1.5 text-2xs font-medium text-gray-500">{k}</th>)}</tr></thead>
            <tbody>{data.map((r, i) => <tr key={i} className="border-b border-gray-50 last:border-0">{Object.values(r).map((v, j) => <td key={j} className="px-3 py-2 text-gray-600">{v != null ? String(v) : '—'}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}

      {isFld && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
          {Object.entries(data).filter(([, v]) => v != null && v !== '' && v !== '—').map(([l, v]) => (
            <div key={l}>
              <dt className="text-2xs text-gray-400">{l}</dt>
              <dd className="text-sm text-gray-900 break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      <Photos photos={photos} />
    </div>
  )
}

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

  const handlePdf = async () => { if (!submission) return; setPdfLoading(true); try { await downloadSubmissionPdf(submission, assets) } catch (e) { console.error(e) } setPdfLoading(false) }

  const photosBySection = useMemo(() => (!assets?.length || !submission) ? {} : groupAssetsBySection(assets, submission.form_code), [assets, submission])

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size={16} /></div>
  if (!submission) return <div className="text-center py-20 text-sm text-gray-400">No encontrado. <button onClick={() => navigate('/submissions')} className="text-accent hover:underline">Volver</button></div>

  const meta = getFormMeta(submission.form_code); const site = extractSiteInfo(submission); const inspMeta = extractMeta(submission)
  const cleanPayload = getCleanPayload(submission); const totalPhotos = assets.filter(a => a.public_url).length
  const fin = submission.finalized || isFinalized(submission); const who = extractSubmittedBy(submission)
  const visitId = submission.site_visit_id; const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

  let totalItems = 0, bueno = 0, regular = 0, malo = 0
  for (const sec of Object.values(cleanPayload)) { if (!Array.isArray(sec)) continue; for (const it of sec) { if (!it['Estado']) continue; totalItems++; const st = it['Estado']; if (st.includes('Bueno') || st.includes('Ejecutada')) bueno++; else if (st.includes('Regular')) regular++; else if (st.includes('Malo')) malo++ } }

  const findPhotos = (title) => {
    if (photosBySection[title]) return photosBySection[title]
    const c = title.replace(/^[^\w]*/, '').trim().toLowerCase()
    for (const [k, p] of Object.entries(photosBySection)) { const kc = k.replace(/^[^\w]*/, '').trim().toLowerCase(); if (kc.includes(c) || c.includes(kc)) return p }
    return null
  }
  const matched = new Set()
  const entries = Object.entries(cleanPayload)
  for (const [t] of entries) { const p = findPhotos(t); if (p) for (const [k, v] of Object.entries(photosBySection)) { if (v === p) matched.add(k) } }
  const unmatched = Object.entries(photosBySection).filter(([k]) => !matched.has(k)).flatMap(([, p]) => p)

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"><ArrowLeft size={15}/> Volver</button>
        <button onClick={handlePdf} disabled={pdfLoading} className="h-8 px-3 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"><Download size={13}/>{pdfLoading ? 'Generando…' : 'Descargar PDF'}</button>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-semibold text-gray-900">{site.nombreSitio}</h1>
          {fin ? <span className="text-2xs font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">Completado</span>
               : <span className="text-2xs font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">Borrador</span>}
        </div>
        <div className="text-sm text-gray-500">{meta.label}</div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div><span className="text-gray-400">Sitio</span> <span className="text-gray-700 ml-1">{site.idSitio}</span></div>
        <div><span className="text-gray-400">Inspector</span> <span className="text-gray-700 ml-1">{who?.name || '—'}</span></div>
        <div><span className="text-gray-400">Fecha</span> <span className="text-gray-700 ml-1">{inspMeta.date || (submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '—')}</span></div>
        <div><span className="text-gray-400">Fotos</span> <span className="text-gray-700 ml-1">{totalPhotos}</span></div>
        {submission.app_version && <div><span className="text-gray-400">App</span> <span className="text-gray-700 ml-1">v{submission.app_version}</span></div>}
      </div>

      {hasOrder && (
        <Link to={`/orders/${visitId}`} className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          Ver visita completa <ChevronRight size={12} />
        </Link>
      )}

      {/* Summary bar */}
      {totalItems > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /><span className="text-gray-600"><b className="text-gray-900">{bueno}</b> bueno</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /><span className="text-gray-600"><b className="text-gray-900">{regular}</b> regular</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /><span className="text-gray-600"><b className="text-gray-900">{malo}</b> malo</span></div>
          <span className="text-2xs text-gray-400 ml-auto">{totalItems} ítems</span>
        </div>
      )}

      <div className="h-px bg-gray-100" />

      {/* Sections */}
      {entries.map(([t, d]) => <Section key={t} title={t} data={d} photos={findPhotos(t)} />)}
      {entries.length === 0 && <div className="text-center py-12 text-sm text-gray-400">Sin datos de formulario</div>}

      {unmatched.length > 0 && (
        <div className="pt-5 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Otras fotos <span className="text-2xs text-gray-400 font-normal ml-1">{unmatched.length}</span></h3>
          <Photos photos={unmatched} />
        </div>
      )}
    </div>
  )
}
