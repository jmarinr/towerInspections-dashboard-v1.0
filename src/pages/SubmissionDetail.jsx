import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Image as ImageIcon, MapPin, Calendar, Clock, FileText, CheckCircle2, AlertTriangle, XCircle, Minus, X, User2, ChevronRight, ExternalLink, FolderOpen } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { getFormMeta } from '../data/formTypes'
import { extractSiteInfo, extractMeta, getCleanPayload, groupAssetsBySection, isFinalized, extractSubmittedBy } from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'

const STATUS = {
  '✅ Bueno': { icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50' },
  '⚠️ Regular': { icon: AlertTriangle, cls: 'text-amber-700 bg-amber-50' },
  '❌ Malo': { icon: XCircle, cls: 'text-red-700 bg-red-50' },
  '➖ N/A': { icon: Minus, cls: 'text-gray-500 bg-gray-50' },
  '⏳ Pendiente': { icon: Clock, cls: 'text-blue-600 bg-blue-50' },
  '✅ Ejecutada': { icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50' },
}

function StatusPill({ value }) {
  const c = STATUS[String(value || '')]
  if (!c) return <span className="text-[11px] text-gray-600">{value || '—'}</span>
  const I = c.icon
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${c.cls}`}><I size={10} />{String(value).replace(/^[^\s]+\s/,'')}</span>
}

function Photos({ photos }) {
  const [z, setZ] = useState(null)
  if (!photos?.length) return null
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 mb-2"><ImageIcon size={11} className="text-emerald-600" /><span className="text-[10px] font-semibold text-emerald-700">{photos.length} foto{photos.length!==1?'s':''}</span></div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
        {photos.map(p => (
          <button key={p.id} onClick={() => setZ(p)} className="rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-300 transition-all bg-white aspect-square">
            <img src={p.public_url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {z && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={() => setZ(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setZ(null)} className="absolute -top-10 right-0 text-white/70 hover:text-white"><X size={22} /></button>
            <img src={z.public_url} alt={z.label} className="w-full rounded-xl" />
            <div className="text-center mt-2 text-white/80 text-sm">{z.label}</div>
            <a href={z.public_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-1.5 text-white/50 hover:text-white text-xs"><ExternalLink size={12} /> Abrir</a>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldGrid({ data }) {
  if (!data || typeof data !== 'object') return null
  const e = Object.entries(data).filter(([,v]) => v != null && v !== '' && v !== '—')
  if (!e.length) return <div className="text-[11px] text-gray-400 italic py-1">Sin datos</div>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {e.map(([l,v]) => (
        <div key={l} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">{l}</div>
          <div className="text-[12px] font-medium text-gray-800 mt-0.5 break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
        </div>
      ))}
    </div>
  )
}

function ChecklistTable({ items }) {
  if (!items?.length) return null
  const hv = items.some(i => i['Valor']); const ho = items.some(i => i['Observación'])
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-[11px]">
        <thead><tr className="bg-gray-50">
          <th className="text-left px-3 py-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
          <th className="text-left px-3 py-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Ítem</th>
          <th className="text-left px-3 py-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider w-24">Estado</th>
          {hv && <th className="text-left px-3 py-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider w-20">Valor</th>}
          {ho && <th className="text-left px-3 py-2 text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Obs.</th>}
        </tr></thead>
        <tbody>{items.map((it,i) => (
          <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
            <td className="px-3 py-2 text-gray-400 font-mono">{it['#']||i+1}</td>
            <td className="px-3 py-2 text-gray-700 font-medium">{it['Ítem']||it['Pregunta']||it['Actividad']||'—'}</td>
            <td className="px-3 py-2"><StatusPill value={it['Estado']} /></td>
            {hv && <td className="px-3 py-2 text-gray-500">{it['Valor']||''}</td>}
            {ho && <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{it['Observación']||''}</td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function Section({ title, data, photos }) {
  const isCL = Array.isArray(data) && data.some(d => d?.['Estado'])
  const isTbl = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && !isCL
  const isFld = data && typeof data === 'object' && !Array.isArray(data)
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-1 h-4 rounded-full bg-emerald-500" />
        <h3 className="text-[12px] font-semibold text-gray-800">{title}</h3>
        {isCL && <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{data.length}</span>}
      </div>
      {isCL && <ChecklistTable items={data} />}
      {isTbl && <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="min-w-full text-[11px]"><thead><tr className="bg-gray-50">{Object.keys(data[0]).map(k=><th key={k} className="text-left px-3 py-2 text-[9px] font-semibold text-gray-500 uppercase">{k}</th>)}</tr></thead><tbody>{data.map((r,i)=><tr key={i} className="border-t border-gray-100">{Object.values(r).map((v,j)=><td key={j} className="px-3 py-2 text-gray-600">{v!=null?String(v):'—'}</td>)}</tr>)}</tbody></table></div>}
      {isFld && <FieldGrid data={data} />}
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

  const handlePdf = async () => { if (!submission) return; setPdfLoading(true); try { await downloadSubmissionPdf(submission, assets) } catch(e) { console.error(e) } setPdfLoading(false) }

  const photosBySection = useMemo(() => {
    if (!assets?.length || !submission) return {}
    return groupAssetsBySection(assets, submission.form_code)
  }, [assets, submission])

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size={20} /><span className="ml-3 text-sm text-gray-400">Cargando…</span></div>
  if (!submission) return (
    <div className="text-center py-20">
      <FileText size={28} className="mx-auto text-gray-300 mb-2" />
      <div className="text-sm text-gray-500">No encontrado</div>
      <Link to="/submissions"><button className="mt-3 text-sm text-emerald-600 hover:underline">← Volver</button></Link>
    </div>
  )

  const meta = getFormMeta(submission.form_code); const Icon = meta.icon
  const site = extractSiteInfo(submission); const inspMeta = extractMeta(submission); const cleanPayload = getCleanPayload(submission)
  const totalPhotos = assets.filter(a => a.public_url).length; const fin = submission.finalized || isFinalized(submission); const submitter = extractSubmittedBy(submission)
  const visitId = submission.site_visit_id; const hasOrder = visitId && visitId !== '00000000-0000-0000-0000-000000000000'

  let totalItems=0, bueno=0, regular=0, malo=0, pendiente=0
  for (const sec of Object.values(cleanPayload)) { if (!Array.isArray(sec)) continue; for (const it of sec) { if (!it['Estado']) continue; totalItems++; const st=it['Estado']; if(st.includes('Bueno')||st.includes('Ejecutada')) bueno++; else if(st.includes('Regular')) regular++; else if(st.includes('Malo')) malo++; else if(st.includes('Pendiente')) pendiente++ } }

  const findPhotos = (title) => {
    if (photosBySection[title]) return photosBySection[title]
    const c = title.replace(/^[^\w]*/,'').trim().toLowerCase()
    for (const [k,p] of Object.entries(photosBySection)) { const kc=k.replace(/^[^\w]*/,'').trim().toLowerCase(); if(kc.includes(c)||c.includes(kc)) return p }
    return null
  }
  const matched = new Set()
  const entries = Object.entries(cleanPayload)
  for (const [t] of entries) { const p=findPhotos(t); if(p) for (const [k,v] of Object.entries(photosBySection)) { if(v===p) matched.add(k) } }
  const unmatched = Object.entries(photosBySection).filter(([k])=>!matched.has(k)).flatMap(([,p])=>p)

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-colors"><ArrowLeft size={15} /> Volver</button>
        <button onClick={handlePdf} disabled={pdfLoading} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]">
          <Download size={13} /> {pdfLoading ? 'Generando…' : 'PDF'}
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className={`${meta.color} px-5 py-4 flex items-center gap-3`}>
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><Icon size={18} className="text-white" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-white/60 text-[10px] font-medium">{meta.label}</div>
            <div className="text-white text-base font-bold">{site.nombreSitio}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {fin ? <span className="bg-white/20 text-white text-[9px] font-semibold px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={9} /> Final</span>
                 : <span className="bg-white/20 text-white text-[9px] font-semibold px-2 py-1 rounded flex items-center gap-1"><Clock size={9} /> Borrador</span>}
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { icon: MapPin, label: 'Sitio', val: site.nombreSitio, sub: site.tipoSitio || site.idSitio },
            { icon: User2, label: 'Inspector', val: submitter?.name || '—', sub: submitter?.role || '' },
            { icon: Calendar, label: 'Fecha', val: inspMeta.date || (submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '—'), sub: inspMeta.time ? `${inspMeta.time}` : '' },
            { icon: ImageIcon, label: 'Evidencia', val: `${totalPhotos} foto${totalPhotos!==1?'s':''}`, sub: `v${submission.app_version||'?'}` },
          ].map((c,i) => {const I=c.icon; return (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <div className="text-[9px] text-gray-400 font-semibold flex items-center gap-1"><I size={9} /> {c.label}</div>
              <div className="text-[12px] font-medium text-gray-800 mt-0.5">{c.val}</div>
              {c.sub && <div className="text-[9px] text-gray-400">{c.sub}</div>}
            </div>
          )})}
        </div>

        {hasOrder && (
          <div className="px-4 pb-3">
            <Link to={`/orders/${visitId}`} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 hover:bg-emerald-100 transition-colors">
              <FolderOpen size={12} className="text-emerald-600" />
              <span className="text-[10px] font-semibold text-emerald-700">Ver visita completa</span>
              <ChevronRight size={10} className="text-emerald-400 ml-auto" />
            </Link>
          </div>
        )}

        {totalItems > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Resumen</div>
              <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-600" /><b className="text-emerald-700">{bueno}</b><span className="text-gray-400">Bueno</span></span>
                <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-amber-500" /><b className="text-amber-600">{regular}</b><span className="text-gray-400">Regular</span></span>
                <span className="flex items-center gap-1"><XCircle size={11} className="text-red-500" /><b className="text-red-600">{malo}</b><span className="text-gray-400">Malo</span></span>
                {pendiente>0 && <span className="flex items-center gap-1"><Clock size={11} className="text-blue-500" /><b className="text-blue-600">{pendiente}</b><span className="text-gray-400">Pendiente</span></span>}
                <span className="ml-auto text-[10px] text-gray-400">{totalItems} ítems</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-gray-200 overflow-hidden flex">
                {bueno>0&&<div className="h-full bg-emerald-500" style={{width:`${(bueno/totalItems)*100}%`}}/>}
                {regular>0&&<div className="h-full bg-amber-400" style={{width:`${(regular/totalItems)*100}%`}}/>}
                {malo>0&&<div className="h-full bg-red-500" style={{width:`${(malo/totalItems)*100}%`}}/>}
                {pendiente>0&&<div className="h-full bg-blue-400" style={{width:`${(pendiente/totalItems)*100}%`}}/>}
              </div>
            </div>
          </div>
        )}
      </div>

      {entries.map(([t,d]) => (
        <div key={t} className="bg-white rounded-xl border border-gray-100 p-4"><Section title={t} data={d} photos={findPhotos(t)} /></div>
      ))}

      {entries.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 py-14 text-center">
          <FileText size={28} className="mx-auto text-gray-300 mb-2" />
          <div className="text-sm text-gray-500">Sin datos de formulario</div>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 rounded-full bg-amber-500"/><h3 className="text-[12px] font-semibold text-gray-800">Otras fotos</h3><span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{unmatched.length}</span></div>
          <Photos photos={unmatched} />
        </div>
      )}
    </div>
  )
}
