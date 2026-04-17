import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Download, ExternalLink, X, ChevronDown, ChevronRight,
  Camera, MapPin, Calendar, User2, CheckCircle2, AlertTriangle, XCircle,
  Minus, Clock, Eye, Pencil, Save, RotateCcw, History, ShieldCheck, Upload, RefreshCw,
  Loader2,
} from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import LoadError from '../components/ui/LoadError'
import { useSubmissionsStore } from '../store/useSubmissionsStore'
import { useAuthStore } from '../store/useAuthStore'
import { getFormMeta, normalizeFormCode } from '../data/formTypes'
import {
  extractSiteInfo, extractMeta, getCleanPayload,
  groupAssetsBySection, isFinalized, extractSubmittedBy,
} from '../lib/payloadUtils'
import { downloadSubmissionPdf } from '../utils/pdf/generateReport'
import { downloadMaintenancePdf } from '../utils/pdf/maintenancePdf'
import { downloadGroundingPdf } from '../utils/pdf/groundingPdf'
import { downloadPMExecutedPdf } from '../utils/pdf/pmExecutedPdf'
import { downloadSafetyPdf } from '../utils/pdf/safetyPdf'
import { generateEquipmentV2Pdf } from '../utils/pdf/equipmentV2Pdf'
import EquipmentV2Detail from '../components/submissions/EquipmentV2Detail'
import { generateAdditionalPhotoPdf } from '../utils/pdf/additionalPhotoPdf'
import AdditionalPhotoDetail from '../components/submissions/AdditionalPhotoDetail'
import {
  updateSubmissionPayload,
  insertSubmissionEdit,
  fetchSubmissionEdits,
  upsertSubmissionAssetRecord,
  deleteSubmissionAsset,
} from '../lib/supabaseQueries'
import { supabase } from '../lib/supabaseClient'
import { LOG } from '../lib/logEvent'

// ─────────────────────────────────────────────────────────────
// SCORE RING
// ─────────────────────────────────────────────────────────────
function ScoreRing({ good, regular, bad, total, size = 56 }) {
  if (!total) return null
  const r = (size - 6) / 2, c = 2 * Math.PI * r
  const pG = good / total, pR = regular / total, pB = bad / total
  const score = Math.round((good / total) * 100)
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22C55E" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pG)} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F59E0B" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pR)} strokeLinecap="round"
          style={{ transform: `rotate(${pG*360}deg)`, transformOrigin:'50% 50%' }} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EF4444" strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - pB)} strokeLinecap="round"
          style={{ transform: `rotate(${(pG+pR)*360}deg)`, transformOrigin:'50% 50%' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// STATUS ATOMS
// ─────────────────────────────────────────────────────────────

// Convierte raw status ('bueno','regular','malo','na') a label display
function statusDisplayLabel(raw) {
  const v = String(raw || '').toLowerCase()
  if (v === 'bueno' || v.includes('bueno') || v.includes('ejecutada')) return '✅ Bueno'
  if (v === 'regular' || v.includes('regular')) return '⚠️ Regular'
  if (v === 'malo' || v.includes('malo')) return '❌ Malo'
  if (v === 'na' || v.includes('n/a')) return '— N/A'
  return raw || ''
}

function StatusDot({ value }) {
  const v = String(value || '').toLowerCase()
  if (v.includes('bueno') || v.includes('ejecutada')) return <span className="w-2.5 h-2.5 rounded-full bg-good" title="Bueno" />
  if (v.includes('regular'))  return <span className="w-2.5 h-2.5 rounded-full bg-warn" title="Regular" />
  if (v.includes('malo'))     return <span className="w-2.5 h-2.5 rounded-full bg-bad"  title="Malo" />
  if (v.includes('n/a'))      return <span className="w-2.5 h-2.5 rounded-full bg-slate-300" title="N/A" />
  if (v.includes('pendiente'))return <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-pulse" title="Pendiente" />
  return <span className="w-2 h-2 rounded-full bg-slate-200" />
}

function StatusBadge({ value }) {
  const v = String(value || '').toLowerCase()
  if (v.includes('bueno') || v.includes('ejecutada'))
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-good/10 text-good"><CheckCircle2 size={10}/>{value}</span>
  if (v.includes('regular'))
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warn/10 text-warn"><AlertTriangle size={10}/>{value}</span>
  if (v.includes('malo'))
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bad/10 text-bad"><XCircle size={10}/>{value}</span>
  if (v.includes('n/a'))
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium th-bg-base th-text-m"><Minus size={10}/>N/A</span>
  if (v.includes('pendiente'))
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium th-bg-base th-text-m"><Clock size={10}/>Pendiente</span>
  return <span className="text-[11px] th-text-m">{value || '—'}</span>
}

// ─────────────────────────────────────────────────────────────
// UPLOAD TOAST  — fixed bottom-right feedback
// ─────────────────────────────────────────────────────────────
function UploadToast({ status }) {
  if (!status) return null
  const cfg = {
    uploading: { bg: '#1e40af', icon: <Loader2 size={15} className="animate-spin flex-shrink-0" />, text: 'Subiendo foto…' },
    success:   { bg: '#15803d', icon: <CheckCircle2 size={15} className="flex-shrink-0" />,          text: '✓ Foto guardada correctamente' },
    error:     { bg: '#b91c1c', icon: <XCircle size={15} className="flex-shrink-0" />,                text: 'Error al subir foto' },
  }[status]

  return (
    <div className="fixed bottom-6 right-4 z-[80] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-elevated text-white text-[13px] font-semibold"
      style={{ background: cfg.bg, minWidth: 240, maxWidth: 320, transition: 'all .2s', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
      {cfg.icon}
      {cfg.text}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PHOTO GALLERY  (with optional upload button)
// ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos, editMode = false, onUpload, onDelete, isUploading = false }) {
  const [zoom, setZoom] = useState(null)
  if (!photos?.length && !editMode) return null
  return (
    <>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {(photos || []).map(p => (
          <div key={p.id} className="relative group">
            <button onClick={() => setZoom(p)}
              className="w-14 h-14 rounded-lg overflow-hidden border-2 border-white shadow-card hover:shadow-elevated hover:scale-105 transition-all th-bg-base">
              <img src={p.public_url} alt={p.label} className="w-full h-full object-cover" loading="lazy"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                  const ph = e.currentTarget.parentElement
                  if (ph) { ph.style.background = 'var(--bg-base)'; ph.title = 'Foto no disponible' }
                }} />
            </button>
            {editMode && (
              <button
                title="Eliminar foto"
                onClick={() => {
                  if (window.confirm(`¿Eliminar esta foto? Esta acción no se puede deshacer.`)) {
                    onDelete?.(p.asset_type, p.id)
                  }
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10"
                style={{ background: '#EF4444', border: '1.5px solid white' }}>
                <X size={8} color="white" />
              </button>
            )}
          </div>
        ))}
        {editMode && (
          <label
            className={`w-14 h-14 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all
              ${isUploading
                ? 'border-accent/40 bg-accent/5 cursor-wait opacity-70'
                : 'border-accent/40 hover:border-accent bg-accent/5 cursor-pointer group'}`}
            title={isUploading ? 'Subiendo…' : 'Subir foto'}>
            {isUploading
              ? <Loader2 size={13} className="animate-spin text-accent" />
              : <>
                  <Upload size={13} className="text-accent/50 group-hover:text-accent transition-colors" />
                  <span className="text-[9px] text-accent/50 group-hover:text-accent mt-0.5 transition-colors">Subir</span>
                </>
            }
            <input type="file" accept="image/*" disabled={isUploading} className="hidden"
              onChange={e => e.target.files[0] && onUpload?.(e.target.files[0])} />
          </label>
        )}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setZoom(null)} className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors">
              <X size={22}/>
            </button>
            <img src={zoom.public_url} alt={zoom.label} className="w-full rounded-xl shadow-elevated"
              onError={e => {
                e.currentTarget.style.display = 'none'
                const p = e.currentTarget.parentElement
                if (p) p.insertAdjacentHTML('beforeend',
                  '<div class="flex flex-col items-center justify-center gap-2 py-16 text-white/60"><span>Foto no disponible</span></div>')
              }} />
            {zoom.label && <div className="text-center mt-2 text-white/80 text-[13px]">{zoom.label}</div>}
            <a href={zoom.public_url} target="_blank" rel="noopener noreferrer"
              className="mt-1 flex items-center justify-center gap-1 text-white/40 hover:text-white text-xs transition-colors">
              <ExternalLink size={11}/>Original
            </a>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// INLINE EDITABLE FIELD  — type-aware
// ─────────────────────────────────────────────────────────────
const inputCls = (changed) =>
  `w-full text-[12px] border rounded px-2 py-1.5 outline-none transition-all th-text-p
   ${changed
     ? 'border-sky-500 bg-sky-50 shadow-sm ring-1 ring-sky-500/20 dark:bg-sky-900/20'
     : 'border-[var(--border)] th-bg-base focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'}`

function EditableField({ label, value, fieldKey, type = 'text', options, readOnly, pendingEdits, onChange, min, max, step }) {
  const current = fieldKey in pendingEdits ? pendingEdits[fieldKey] : (value ?? '')
  const changed  = fieldKey in pendingEdits && String(pendingEdits[fieldKey]) !== String(value ?? '')

  const changedBg = changed ? 'bg-sky-50 dark:bg-sky-900/10 -mx-2 px-2 rounded' : ''

  if (readOnly) {
    return (
      <div className={`flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2 py-1.5 border-b border-[var(--border-light)] last:border-0 ${changedBg}`}>
        <span className="text-[10px] font-semibold uppercase tracking-wider th-text-m w-full xs:w-28 sm:w-36 flex-shrink-0 xs:pt-1">{label}</span>
        <span className="text-[12px] th-text-s flex-1 pt-0.5 italic">{String(current || '—')}</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col xs:flex-row xs:items-start gap-1 xs:gap-2 py-1.5 border-b border-[var(--border-light)] last:border-0 transition-colors ${changedBg}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider th-text-m w-full xs:w-28 sm:w-36 flex-shrink-0 xs:pt-1.5">{label}</span>
      <div className="flex-1 relative">
        {type === 'select' && options ? (
          <select
            className={inputCls(changed)}
            value={current}
            onChange={e => onChange(fieldKey, e.target.value)}>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea rows={2}
            className={inputCls(changed) + ' resize-none'}
            value={current}
            onChange={e => onChange(fieldKey, e.target.value)} />
        ) : type === 'number' ? (
          <input type="number" step={step ?? 'any'}
            {...(min !== undefined ? { min } : {})}
            {...(max !== undefined ? { max } : {})}
            className={inputCls(changed)}
            value={current}
            onChange={e => onChange(fieldKey, e.target.value)} />
        ) : (
          <input type="text"
            className={inputCls(changed)}
            value={current}
            onChange={e => onChange(fieldKey, e.target.value)} />
        )}
        {changed && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-500" title="Modificado" />
        )}
      </div>
    </div>
  )
}

// Status select para items de checklist
const CHECKLIST_STATUS_OPTIONS = [
  { value: '',        label: 'Sin evaluar' },
  { value: 'bueno',   label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
  { value: 'malo',    label: 'Malo' },
  { value: 'na',      label: 'N/A' },
]

function ChecklistItemEditable({ item, pendingEdits, onChange }) {
  const statusKey = item.__statusKey__
  const obsKey    = item.__obsKey__

  const normalizeStatus = (v) => {
    if (!v) return ''
    const s = String(v).toLowerCase()
    if (s.includes('bueno') || s.includes('ejecutada')) return 'bueno'
    if (s.includes('regular')) return 'regular'
    if (s.includes('malo'))    return 'malo'
    if (s === 'na' || s.includes('n/a')) return 'na'
    return v
  }

  const rawStatus = normalizeStatus(item.__rawStatus__ || '')
  const curStatus = statusKey in pendingEdits ? normalizeStatus(pendingEdits[statusKey]) : rawStatus
  const curObs    = obsKey    in pendingEdits ? pendingEdits[obsKey]    : (item.__rawObs__ || '')
  const changedS  = curStatus !== rawStatus
  const changedO  = obsKey in pendingEdits && pendingEdits[obsKey] !== (item.__rawObs__ || '')

  return (
    <div className="py-2 px-2 rounded-lg space-y-1.5"
      style={{ borderBottom: '1px solid var(--border-light)', background: (changedS || changedO) ? 'rgba(2,132,199,0.04)' : '' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-medium th-text-p flex-1 min-w-0">{item.__itemName__}</span>
        <select
          className={`text-[11px] border rounded px-2 py-1 outline-none transition-all th-text-p
            ${changedS ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500/20' : 'border-[var(--border)] th-bg-base'}`}
          value={curStatus}
          onChange={e => onChange(statusKey, e.target.value)}
          style={{ minWidth: 120 }}>
          {CHECKLIST_STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <textarea rows={1}
        placeholder="Observación (opcional)…"
        className={`w-full text-[11px] border rounded px-2 py-1 outline-none resize-none transition-all th-text-p
          ${changedO ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500/20' : 'border-[var(--border)] th-bg-base'}`}
        value={curObs}
        onChange={e => onChange(obsKey, e.target.value)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION CARD  (read + edit modes)
// ─────────────────────────────────────────────────────────────
const READONLY_SECTIONS_SET = new Set(['👤 Enviado por', '📍 Inicio de inspección'])

function SectionCard({ title, data, photos, index, editMode, pendingEdits, onFieldChange, onPhotoUpload, onPhotoDelete, allowUpload = false, isUploading = false }) {
  const [open, setOpen] = useState(true)

  const isSectionReadonly = READONLY_SECTIONS_SET.has(title)
  const isNewFormat = data && typeof data === 'object' && !Array.isArray(data)
    && Object.values(data).some(v => v && typeof v === 'object' && 'fieldId' in v)
  const isCL  = Array.isArray(data) && data.some(d => d?.['Estado'] !== undefined)
  const isFld = data && typeof data === 'object' && !Array.isArray(data)

  const newFormatEntries = isNewFormat
    ? Object.entries(data).filter(([k]) => !k.startsWith('__'))
    : []
  const legacyEntries = (isFld && !isNewFormat)
    ? Object.entries(data).filter(([k]) => !k.startsWith('__'))
    : []

  let sGood=0, sReg=0, sBad=0, sTotal=0
  if (isCL) data.forEach(it => {
    const raw = (it.__rawStatus__ || it['Estado'] || '').toLowerCase()
    if (!raw || raw.includes('pendiente') || raw.includes('evaluar')) return
    sTotal++
    if (raw === 'bueno' || raw.includes('bueno') || raw.includes('ejecutada')) sGood++
    else if (raw === 'regular' || raw.includes('regular')) sReg++
    else if (raw === 'malo' || raw.includes('malo')) sBad++
  })

  const photoCount = photos?.length || 0
  const score = sTotal > 0 ? Math.round((sGood / sTotal) * 100) : null
  const scoreColor = score === null ? '' : score >= 80 ? '#16a34a' : score >= 50 ? '#b45309' : '#dc2626'
  const scoreBg    = score === null ? '' : score >= 80 ? '#f0fdf4' : score >= 50 ? '#fffbeb' : '#fef2f2'
  const fCount = isNewFormat ? newFormatEntries.length : legacyEntries.length

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animationDelay: `${index * 40}ms` }}>

      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ borderBottom: open ? '1px solid var(--border-light)' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>
        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
          <span className="text-[13px] font-semibold th-text-p">{title}</span>
          {isCL && sTotal > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {data.slice(0,24).map((it,i) => <StatusDot key={i} value={it.__rawStatus__ || it['Estado']} />)}
                {data.length > 24 && <span className="text-[9px] th-text-m ml-0.5">+{data.length-24}</span>}
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: scoreBg, color: scoreColor }}>{score}%</span>
            </div>
          )}
          {fCount > 0 && !isCL && (
            <span className="text-[10px] th-text-m">{fCount} campo{fCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {photoCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-light)', color: 'var(--accent-text)' }}>
              <Camera size={9}/>{photoCount}
            </span>
          )}
          <span className="th-text-m" style={{ transition: 'transform .15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', display:'inline-flex' }}>
            <ChevronDown size={14}/>
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">

          {/* Nuevo formato con metadatos de tipo */}
          {isNewFormat && (
            <div className="mt-3 space-y-0">
              {newFormatEntries.map(([fieldId, field]) => {
                const isRO = isSectionReadonly || field.readOnly
                if (editMode && !isRO) {
                  return (
                    <EditableField key={fieldId}
                      label={field.label} value={field.value} fieldKey={fieldId}
                      type={field.type} options={field.options}
                      min={field.min} max={field.max} step={field.step}
                      pendingEdits={pendingEdits} onChange={onFieldChange} />
                  )
                }
                const display = (field.value === '' || field.value == null) ? '—' : String(field.value)
                return (
                  <div key={fieldId} className="flex flex-col gap-0.5 py-2"
                    style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider th-text-m">{field.label}</span>
                    <span className={`text-[13px] font-medium ${display === '—' ? 'th-text-m italic' : 'th-text-p'}`}>{display}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Formato legacy */}
          {!isNewFormat && isFld && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
              {legacyEntries.map(([k, v]) => {
                const display = (v === null || v === undefined || v === '') ? '—' : String(v)
                return (
                  <div key={k} className="flex flex-col gap-0.5 py-2"
                    style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider th-text-m">{k}</span>
                    <span className={`text-[13px] font-medium ${display === '—' ? 'th-text-m' : 'th-text-p'}`}>{display}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Checklist */}
          {isCL && (
            <>
              {sTotal > 0 && (
                <div className="flex gap-2 mt-3 mb-2 flex-wrap">
                  {sGood > 0 && <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background:'#f0fdf4', color:'#16a34a' }}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/> {sGood} Bueno</span>}
                  {sReg  > 0 && <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background:'#fffbeb', color:'#b45309' }}><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/> {sReg} Regular</span>}
                  {sBad  > 0 && <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background:'#fef2f2', color:'#dc2626' }}><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/> {sBad} Malo</span>}
                  {(sTotal - sGood - sReg - sBad) > 0 && <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg th-bg-base th-text-m"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"/> {sTotal - sGood - sReg - sBad} Sin estado</span>}
                </div>
              )}
              <div className="mt-1 space-y-0">
                {data.map((it, i) => {
                  if (editMode && it.__editable__) {
                    return <ChecklistItemEditable key={i} item={it} pendingEdits={pendingEdits} onChange={onFieldChange} />
                  }
                  const estado = it.__rawStatus__ ? statusDisplayLabel(it.__rawStatus__) : (it['Estado'] || '')
                  const obs    = it.__rawObs__ || it['Observación'] || ''
                  const raw    = (it.__rawStatus__ || '').toLowerCase()
                  const rowBg  = raw === 'malo' ? 'rgba(239,68,68,.04)' : raw === 'regular' ? 'rgba(245,158,11,.04)' : ''
                  return (
                    <div key={i} className="flex items-start gap-2.5 py-2 px-2 rounded-lg"
                      style={{ borderBottom: i < data.length-1 ? '1px solid var(--border-light)' : 'none', background: rowBg }}>
                      <StatusDot value={it.__rawStatus__ || estado} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-medium th-text-p">
                            {it.__itemName__ || it['Item'] || it['Ítem'] || it['Pregunta'] || `Ítem ${i+1}`}
                          </span>
                          {(it.__rawStatus__ || estado) && <StatusBadge value={it.__rawStatus__ || estado} />}
                          {it['Valor'] && <span className="text-[10px] th-text-m th-bg-base px-1.5 py-0.5 rounded font-mono">{it['Valor']}</span>}
                        </div>
                        {obs && <p className="text-[11px] th-text-m mt-0.5 leading-snug">{obs}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Fotos */}
          {(photoCount > 0 || (editMode && allowUpload)) && (
            <div className={(isNewFormat || isCL || legacyEntries.length > 0) ? 'mt-3 pt-3' : 'mt-3'}
              style={(isNewFormat || isCL || legacyEntries.length > 0) ? { borderTop: '1px solid var(--border-light)' } : {}}>
              <PhotoGallery photos={photos} editMode={editMode && allowUpload} onUpload={onPhotoUpload} onDelete={onPhotoDelete} isUploading={isUploading} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SAVE CONFIRM MODAL  (shows diff + requires note)
// ─────────────────────────────────────────────────────────────
function SaveEditModal({ changes, onConfirm, onCancel, saving }) {
  const [note, setNote] = useState('')
  const entries = Object.entries(changes)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4"
      onClick={onCancel}>
      <div className="rounded-2xl shadow-elevated w-full max-w-md flex flex-col"
        style={{ background: 'var(--bg-card)', maxHeight: 'min(75dvh, 560px)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header — fijo */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={15} className="text-accent" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold th-text-p">Confirmar cambios</h2>
              <p className="text-[12px] th-text-m mt-0.5">Quedarán registrados en el historial de auditoría.</p>
            </div>
          </div>
        </div>

        {/* Diff list — scrolleable */}
        <div className="px-5 py-3 overflow-y-auto space-y-2 flex-1 min-h-0">
          {entries.map(([key, { from, to, label }]) => (
            <div key={key} className="text-[12px] th-bg-base rounded-lg px-3 py-2">
              <div className="font-medium th-text-s mb-1">{label || key}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-bad/90 line-through">{String(from ?? '—')}</span>
                <ChevronRight size={10} className="th-text-m flex-shrink-0"/>
                <span className="text-good font-medium">{String(to ?? '—')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Note + botones — fijo al fondo */}
        <div className="px-5 pb-5 pt-4 flex-shrink-0 space-y-3"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <label className="text-[11px] font-semibold th-text-s uppercase tracking-wide block mb-1.5">
              Razón del cambio <span className="text-bad">*</span>
            </label>
            <textarea
              autoFocus
              rows={2}
              className="w-full text-[13px] rounded-lg px-3 py-2 outline-none resize-none transition-all th-text-p th-bg-input"
              style={{ border: '1px solid var(--border)' }}
              onFocus={e  => { e.target.style.borderColor = '#0284C7'; e.target.style.boxShadow = '0 0 0 3px rgba(2,132,199,0.15)' }}
              onBlur={e   => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              placeholder="Ej: Corrección de tipo de torre según revisión de campo…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 h-10 text-[13px] font-medium th-text-s th-bg-base rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)' }}>
              Cancelar
            </button>
            <button onClick={() => onConfirm(note)}
              disabled={!note.trim() || saving}
              className="flex-1 h-10 text-[13px] font-semibold text-white rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5" style={{ background: '#0284C7' }}>
              {saving
                ? <><Clock size={13} className="animate-spin"/>Guardando…</>
                : <><Save size={13}/>Guardar cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EDIT HISTORY PANEL
// ─────────────────────────────────────────────────────────────
function EditHistory({ submissionId }) {
  const [open,    setOpen]    = useState(false)
  const [edits,   setEdits]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !submissionId) return
    setLoading(true)
    fetchSubmissionEdits(submissionId)
      .then(setEdits).catch(console.error).finally(() => setLoading(false))
  }, [open, submissionId])

  return (
    <div className="rounded-xl th-shadow overflow-hidden" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>
        <History size={14} className="th-text-m" />
        <span className="text-[13px] font-semibold th-text-s flex-1">Historial de ediciones</span>
        {open ? <ChevronDown size={14} className="th-text-m"/> : <ChevronRight size={14} className="th-text-m"/>}
      </button>

      {open && (
        <div className="border-t th-border-l px-4 pb-4">
          {loading && <div className="py-6 flex justify-center"><Spinner size={14} /></div>}

          {!loading && edits.length === 0 && (
            <p className="text-[12px] th-text-m py-5 text-center">Sin ediciones registradas</p>
          )}

          {!loading && edits.map(edit => (
            <div key={edit.id} className="py-3 border-b th-border-l last:border-0">
              {/* Who + when */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold th-text-p">{edit.edited_by}</span>
                <span className="text-[10px] th-text-m">
                  {new Date(edit.edited_at).toLocaleString('es', { dateStyle:'medium', timeStyle:'short' })}
                </span>
              </div>
              {/* Diff */}
              <div className="space-y-1 mb-2">
                {Object.entries(edit.changes || {}).map(([key, ch]) => (
                  <div key={key} className="text-[11px] flex items-center gap-1.5 flex-wrap">
                    <span className="th-text-m font-medium">{ch.label || key}:</span>
                    <span className="text-bad/80 line-through">{String(ch.from ?? '—')}</span>
                    <ChevronRight size={9} className="th-text-m"/>
                    <span className="text-good font-medium">{String(ch.to ?? '—')}</span>
                  </div>
                ))}
              </div>
              {/* Note */}
              {edit.note && (
                <p className="text-[11px] th-text-m italic th-bg-base rounded px-2 py-1 mt-1">
                  "{edit.note}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

/**
 * Sanitiza un string para usarlo como segmento de path en Supabase Storage.
 * Elimina: emojis, tildes/diacríticos, espacios, y cualquier carácter no-ASCII.
 * Supabase Storage solo acepta: letras, dígitos, guiones y guiones bajos.
 */
const sanitizePath = (str) =>
  String(str || '')
    .normalize('NFD')                   // descomponer chars acentuados (á → a + ́)
    .replace(/[\u0300-\u036f]/g, '')    // eliminar diacríticos
    .replace(/[^\w\-]/g, '_')           // reemplazar todo lo no-alfanumérico (excepto -) con _
    .replace(/_{2,}/g, '_')             // colapsar underscores múltiples
    .replace(/^_+|_+$/g, '')            // trim underscores al inicio/fin
    .substring(0, 60)                   // limitar longitud
    || 'foto'                           // fallback si queda vacío

/**
 * Detecta la extensión del archivo de forma robusta.
 * Prefiere la extensión del nombre de archivo; si no tiene, usa el MIME type.
 * Necesario para móviles donde el archivo puede llamarse solo "image" sin extensión.
 */
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'image/avif': 'avif',
}
const getExt = (file) => {
  if (file.name?.includes('.')) {
    const raw = file.name.split('.').pop().toLowerCase()
    if (raw && raw.length <= 5) return raw
  }
  return MIME_TO_EXT[file.type] || 'jpg'
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function SubmissionDetail() {
  const { submissionId }                        = useParams()
  const navigate                                = useNavigate()
  const submission   = useSubmissionsStore(s => s.activeSubmission)
  const assets       = useSubmissionsStore(s => s.activeAssets || [])
  const loadDetail   = useSubmissionsStore(s => s.loadDetail)
  const refreshDetail= useSubmissionsStore(s => s.refreshDetail)
  const addAsset     = useSubmissionsStore(s => s.addAsset)
  const removeAsset  = useSubmissionsStore(s => s.removeAsset)
  const clearDetail  = useSubmissionsStore(s => s.clearDetail)
  const isLoading                               = useSubmissionsStore(s => s.isLoadingDetail)
  const user                                    = useAuthStore(s => s.user)

  const [pdfLoading,    setPdfLoading]    = useState(false)
  const [photosLoading, setPhotosLoading] = useState(false)
  const [timedOut,      setTimedOut]      = useState(false)
  const [uploadStatus,  setUploadStatus]  = useState(null) // null | 'uploading' | 'success' | 'error'

  // Edit state
  const [editMode,      setEditMode]      = useState(false)
  const [pendingEdits,  setPendingEdits]  = useState({})
  const [showModal,     setShowModal]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState(null)
  const [saveSuccess,   setSaveSuccess]   = useState(false)

  useEffect(() => {
    if (!submissionId) return
    setTimedOut(false)
    loadDetail(submissionId)
    // Forzar refresh de la lista en background para que al volver el estado sea actual
    useSubmissionsStore.getState().load(true)
    useSubmissionsStore.setState({ error: null })
    const t = setTimeout(() => setTimedOut(true), 45000)
    return () => { clearDetail(); clearTimeout(t) }
  }, [submissionId])

  // ── PDF ─────────────────────────────────────────────────────
  const handlePdf = async () => {
    if (!submission) return
    setPdfLoading(true)
    try {
      const fc = normalizeFormCode(submission.form_code)
      if      (fc === 'preventive-maintenance') await downloadMaintenancePdf(submission, assets)
      else if (fc === 'grounding-system-test')  await downloadGroundingPdf(submission, assets)
      else if (fc === 'executed-maintenance')   await downloadPMExecutedPdf(submission, assets)
      else if (fc === 'safety-system')          await downloadSafetyPdf(submission, assets)
      else if (fc === 'equipment-v2') {
        const photoMap = {}
        if (assets) assets.forEach(a => {
          const field = a.asset_type || a.type || a.meta?.field
          const url   = a.storage_url || a.public_url || a.url
          if (field && url) photoMap[field] = url
        })
        const blob = await generateEquipmentV2Pdf(submission, photoMap)
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        const site = submission?.payload?.payload?.data?.siteInfo || {}
        a.href     = url
        a.download = `Inventario_v2_${site.idSitio || 'sitio'}_${Date.now()}.pdf`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      else if (fc === 'additional-photo-report') {
        await generateAdditionalPhotoPdf(submission, assets)
      }
      else                                       await downloadSubmissionPdf(submission, assets)
    } catch (e) { console.error('PDF error:', e) }
    setPdfLoading(false)
  }

  // ── Download all photos as ZIP ──────────────────────────────
  const handleDownloadPhotos = async () => {
    const photos = assets.filter(a => a.public_url)
    if (!photos.length) return
    setPhotosLoading(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip   = new JSZip()
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]
        try {
          const resp = await fetch(p.public_url)
          if (!resp.ok) continue
          const blob = await resp.blob()
          const ext  = (p.mime || p.public_url || '').includes('png') ? 'png' : 'jpg'
          zip.file(`${String(p.asset_type || 'foto_'+i).replace(/[^a-zA-Z0-9_\-]/g,'_')}.${ext}`, blob)
        } catch {}
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a   = document.createElement('a')
      a.href = url
      a.download = `fotos_${site.idSitio||'sitio'}_${meta.shortLabel||'form'}.zip`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) { console.error('ZIP error:', e) }
    setPhotosLoading(false)
  }

  // ── Edit field handler ──────────────────────────────────────
  const handleFieldChange = useCallback((key, value) => {
    setPendingEdits(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleEditCancel = () => {
    setEditMode(false); setPendingEdits({}); setSaveError(null)
  }

  const handleEditSave = () => {
    if (Object.keys(pendingEdits).length === 0) { setEditMode(false); return }
    setShowModal(true)
  }

  // ─────────────────────────────────────────────────────────────
  // PHOTO UPLOAD — handler universal para todos los formularios
  // ─────────────────────────────────────────────────────────────
  // `assetTypeOrHint` puede ser:
  //   • Un asset_type EXACTO con ':' (ej: 'equipmentV2:fotoTorre', 'carrier:0:foto1')
  //     → usado por EquipmentV2Detail que conoce el slot exacto
  //   • Un hint de sección sin ':' (ej: '🗼 Información de la Torre')
  //     → usado por SectionCard; genera 'dashboard:safeHint:ts'
  const handlePhotoUpload = useCallback(async (file, assetTypeOrHint) => {
    if (!file || !submission) return
    setUploadStatus('uploading')

    const ts      = Date.now()
    const ext     = getExt(file)
    const BUCKET  = 'pti-inspect'
    const orgPath = `${submission.org_code || 'PTI'}/${submissionId}`

    // Determinar assetType y path según si es tipo exacto o hint de sección
    const isExactType = String(assetTypeOrHint || '').includes(':')
    let assetType, path

    if (isExactType) {
      // Tipo exacto (equipment-v2, carrier, etc.) — preservar el slot original
      assetType = assetTypeOrHint
      const safeName = sanitizePath(assetType.replace(/:/g, '_'))
      path = `${orgPath}/${safeName}.${ext}`
    } else {
      // Hint de sección (SectionCard) — crear slot nuevo con timestamp único
      const safeHint = sanitizePath(assetTypeOrHint || 'foto')
      assetType = `dashboard:${safeHint}:${ts}`
      path      = `${orgPath}/dashboard_${safeHint}_${ts}.${ext}`
    }

    try {
      // 1. Storage
      const { error: storageErr } = await supabase.storage
        .from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
      if (storageErr) throw new Error(`Storage: ${storageErr.message}`)

      // 2. URL pública
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) throw new Error('No se pudo obtener URL pública')

      // 3. Optimistic: foto visible INMEDIATAMENTE
      addAsset({
        id:            `optimistic-${ts}`,
        submission_id: submissionId,
        asset_type:    assetType,
        asset_key:     path,
        bucket:        BUCKET,
        path,
        public_url:    publicUrl,
        mime:          file.type || 'image/jpeg',
        created_at:    new Date().toISOString(),
      })

      // 4. Persistir en DB (best-effort — el optimistic ya mostró la foto)
      upsertSubmissionAssetRecord({ submissionId, assetType, assetKey: path, bucket: BUCKET, path, publicUrl, mime: file.type || 'image/jpeg' })
        .catch(e => console.warn('[Photo] DB persist failed:', e.message))

      // 5. Audit log
      const editedBy = user?.email || user?.username || 'admin'
      insertSubmissionEdit(submissionId, editedBy,
        { [assetType]: { from: '—', to: publicUrl, label: `Foto subida: ${assetType}` } },
        `Foto subida desde panel: ${file.name}`)
        .catch(e => console.warn('[Audit]', e.message))

      LOG.submissionEdited(submissionId, extractSiteInfo(submission)?.nombreSitio || submissionId, editedBy, [`foto:${assetType}`])

      setTimedOut(false)
      setUploadStatus('success')
      setTimeout(() => setUploadStatus(null), 4000)

    } catch (e) {
      console.error('[Photo] upload error:', e)
      removeAsset(assetType)
      setUploadStatus('error')
      setSaveError(`Error al subir foto: ${e.message}`)
      setTimeout(() => { setUploadStatus(null); setSaveError(null) }, 4000)
    }
  }, [submission, submissionId, user])

  // ─────────────────────────────────────────────────────────────
  // PHOTO DELETE — handler universal para todos los formularios
  // ─────────────────────────────────────────────────────────────
  const handlePhotoDelete = useCallback(async (assetType) => {
    if (!submissionId || !assetType) return
    const editedBy      = user?.email || user?.username || 'admin'
    const siteName      = extractSiteInfo(submission)?.nombreSitio || submissionId
    const currentAsset  = assets?.find(a => a.asset_type === assetType)
    const prevUrl       = currentAsset?.public_url || '—'
    // Usar el submission_id REAL del asset — puede estar en un sibling submission
    const targetSubId   = currentAsset?.submission_id || submissionId

    try {
      // Optimistic: quitar del UI INMEDIATAMENTE
      removeAsset(assetType)
      await deleteSubmissionAsset(targetSubId, assetType)

      // Para additional-photo-report: limpiar también el payload
      if (normalizeFormCode(submission?.form_code || '') === 'additional-photo-report') {
        const parts = assetType.split(':')
        if (parts[0] === 'photos' && parts[1] && parts[2] !== undefined) {
          await updateSubmissionPayload(submissionId, submission.payload, {})
            .catch(() => {})
        }
      }

      insertSubmissionEdit(submissionId, editedBy,
        { [assetType]: { from: prevUrl, to: '—', label: `Foto eliminada: ${assetType}` } },
        `Foto eliminada desde panel admin: ${assetType}`)
        .catch(e => console.warn('[Audit]', e.message))

      LOG.submissionEdited(submissionId, siteName, editedBy, [`foto_eliminada:${assetType}`])
      setTimedOut(false)

    } catch (e) {
      console.error('[Photo] delete error:', e)
      // Rollback: el delete falló → restaurar estado real desde servidor
      await refreshDetail(submissionId)
      setSaveError(`Error al eliminar foto: ${e.message}`)
      setTimeout(() => setSaveError(null), 5000)
    }
  }, [submission, submissionId, user, assets])

  // ─────────────────────────────────────────────────────────────
  // PHOTO UPLOAD — additional-photo-report (particularidades propias)
  // ─────────────────────────────────────────────────────────────
  // Formato especial: assetType = 'photos:ACRONYM:ts' (timestamp como idx)
  // Path de Storage usa '_' en lugar de ':' para evitar StorageApiError
  const handlePhotoUploadAdditional = useCallback(async (file, acronym) => {
    if (!file || !submission || !submissionId || !acronym) return
    const editedBy = user?.email || user?.username || 'admin'
    const siteName = extractSiteInfo(submission)?.nombreSitio || submissionId
    setUploadStatus('uploading')
    try {
      const ext    = getExt(file)
      const BUCKET = 'pti-inspect'
      const ts     = Date.now()
      const assetType = `photos:${acronym.toUpperCase()}:${ts}`
      const safeName  = `photos_${acronym.toUpperCase()}_${ts}`
      const path      = `${submission.org_code || 'PTI'}/${submissionId}/additional/${safeName}.${ext}`

      const { error: storageErr } = await supabase.storage
        .from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
      if (storageErr) throw new Error(`Storage: ${storageErr.message}`)

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) throw new Error('No se pudo obtener URL pública')

      addAsset({
        id:            `optimistic-${ts}`,
        submission_id: submissionId,
        asset_type:    assetType,
        asset_key:     path,
        bucket:        BUCKET,
        path,
        public_url:    publicUrl,
        mime:          file.type || 'image/jpeg',
        created_at:    new Date().toISOString(),
      })

      upsertSubmissionAssetRecord({ submissionId, assetType, assetKey: path, bucket: BUCKET, path, publicUrl, mime: file.type || 'image/jpeg' })
        .catch(e => console.warn('[PhotoAdditional] DB persist failed:', e.message))

      insertSubmissionEdit(submissionId, editedBy,
        { [assetType]: { from: '—', to: publicUrl, label: `Foto subida: ${acronym}` } },
        `Foto subida desde panel en categoría ${acronym} (${file.name})`)
        .catch(e => console.warn('[Audit]', e.message))

      LOG.submissionEdited(submissionId, siteName, editedBy, [`foto_adicional:${acronym}`])
      setTimedOut(false)
      setUploadStatus('success')
      setTimeout(() => setUploadStatus(null), 4000)

    } catch (e) {
      console.error('[PhotoAdditional] upload error:', e)
      removeAsset(`photos:${acronym?.toUpperCase()}:`)
      setUploadStatus('error')
      setSaveError(`Error al subir foto: ${e.message}`)
      setTimeout(() => { setUploadStatus(null); setSaveError(null) }, 4000)
    }
  }, [submission, submissionId, user])

  // ── Finalized toggle ────────────────────────────────────────
  const handleFinalizedToggle = async () => {
    if (!user?.canWrite) return
    const newVal = !fin
    setSaving(true)
    try {
      await updateSubmissionPayload(submissionId, submission.payload, { __finalized__: newVal })
      insertSubmissionEdit(submissionId, user.username, {
        estado: {
          from:  fin ? 'Completado' : 'Borrador',
          to:    newVal ? 'Completado' : 'Borrador',
          label: 'Estado',
        },
      }, newVal ? 'Marcado como Completado desde el panel' : 'Revertido a Borrador desde el panel')
        .catch(e => console.warn('[Audit] submission_edits not available yet:', e.message))
      setTimedOut(false)  // evita que timer expirado bloquee el re-render
      await refreshDetail(submissionId)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // ── Confirm save with audit ─────────────────────────────────
  const handleConfirmSave = async (note) => {
    setSaving(true); setSaveError(null)
    try {
      // Usar buildModalChanges que ya maneja claves estructuradas (checklist, medicion, etc.)
      const allChanges = buildModalChanges()
      const changes = {}
      for (const [k, ch] of Object.entries(allChanges)) {
        if (String(ch.to) !== String(ch.from ?? '')) {
          changes[k] = ch
        }
      }

      if (Object.keys(changes).length === 0) {
        setShowModal(false); setEditMode(false); setPendingEdits({}); setSaving(false); return
      }

      await updateSubmissionPayload(submissionId, submission.payload, pendingEdits)
      const editedBy = user?.email || user?.username || 'admin'
      insertSubmissionEdit(submissionId, editedBy, changes, note)
        .catch(e => console.warn('[Audit] submission_edits not available yet:', e.message))
      LOG.submissionEdited(
        submissionId,
        extractSiteInfo(submission)?.nombreSitio || submissionId,
        editedBy,
        Object.keys(changes)
      )
      setTimedOut(false)  // evita que timer expirado bloquee el re-render
      await refreshDetail(submissionId)

      setShowModal(false); setEditMode(false); setPendingEdits({})
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    } catch (err) {
      console.error('Save error:', err)
      setSaveError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Derived ─────────────────────────────────────────────────
  const photosBySection = useMemo(() =>
    (!assets?.length || !submission) ? {} : groupAssetsBySection(assets, submission.form_code),
    [assets, submission])

  if (isLoading && !timedOut) return <div className="flex items-center justify-center py-20"><Spinner size={16}/></div>
  if (timedOut && !submission) return (
    <div className="p-4">
      <button onClick={() => navigate(-1)} className="text-[13px] th-text-m mb-4 flex items-center gap-1">← Volver</button>
      <LoadError message="Tiempo de espera agotado." onRetry={() => { setTimedOut(false); loadDetail(submissionId) }} />
    </div>
  )
  if (!submission) return (
    <div className="text-center py-20 text-[13px] th-text-m">
      No encontrado.{' '}
      <button onClick={() => navigate('/submissions')} className="text-accent hover:underline">Volver</button>
    </div>
  )

  const meta        = getFormMeta(submission.form_code)
  const site        = extractSiteInfo(submission)
  const inspMeta    = extractMeta(submission)
  const cleanPayload= getCleanPayload(submission)
  const totalPhotos = assets.filter(a => a.public_url).length
  const fin         = submission.finalized || isFinalized(submission)
  const who         = extractSubmittedBy(submission)
  const visitId     = submission.site_visit_id
  const hasOrder    = visitId && visitId !== '00000000-0000-0000-0000-000000000000'
  const canWrite    = user?.canWrite === true
  // Contar cambios reales: claves checklist.itemId.* cuentan como 1 por item
  const pendingCount = (() => {
    const keys = Object.keys(pendingEdits)
    const checklistItems = new Set(
      keys.filter(k => k.includes('|||')).map(k => k.split('|||').slice(0,2).join('|||'))
    )
    const directKeys = keys.filter(k => !k.includes('|||')).length
    return directKeys + checklistItems.size
  })()

  // Global checklist stats
  let totalItems=0, bueno=0, regular=0, malo=0, pendiente=0
  for (const sec of Object.values(cleanPayload)) {
    if (!Array.isArray(sec)) continue
    for (const it of sec) {
      if (!it['Estado']) continue; totalItems++
      const st = String(it['Estado']).toLowerCase()
      if (st.includes('bueno') || st.includes('ejecutada')) bueno++
      else if (st.includes('regular')) regular++
      else if (st.includes('malo'))    malo++
      else if (st.includes('pendiente')) pendiente++
    }
  }

  // Secciones que realmente tienen fotos por tipo de formulario
  // (basado en los campos type:'photo' de cada config del inspector)
  const PHOTO_SECTIONS = {
    // Mantenimiento Preventivo — secciones con fotos del app
    'preventive-maintenance': [
      // DynamicForm (sin prefijo)
      '🗼 información de la torre',
      '🔑 acceso al sitio',
      '📝 cierre',
      // InspectionChecklist (11 pasos — títulos exactos del config)
      '🚪 inspección - acceso',
      '🔒 inspección - seguridad',
      '⚡ inspección - sistema de tierras',
      '🔌 inspección - sistema eléctrico',
      '🏗️ inspección - sitio en general',
      '🔩 inspección - miembros de torre',
      '🎨 inspección - acabado',
      '💡 inspección - luces de torre',
      '⚡ inspección - tierras en torre',
      '🔗 inspección - retenidas',
      '🧱 inspección - cimentación',
    ],
    // Inspección General — solo dos secciones tienen fotos
    'inspection-general': ['🚪 acceso', '🔒 seguridad'],
    // Puesta a Tierra
    'grounding-system-test': ['⚡ equipo de medición', '⚡ evidencia fotográfica'],
    // Sistema de Ascenso — platinas NO tiene fotos en el app
    'safety-system': [
      '🧗 herrajes y cable',
      '🧗 prensacables y carro',
      '🧗 tramos (escaleras)',
      '🧗 certificación',
    ],
    // PM Ejecutado — solo las secciones de actividades (🔧) tienen fotos
    // Las secciones de meta (📍 Inicio, 📋 Datos del Sitio, 👤 Enviado por) no tienen fotos
    'executed-maintenance': ['🔧'],
    // Inventario v1 — fotos embebidas en payload, no por sección
    'equipment': [],
    // equipment-v2 usa componente propio (EquipmentV2Detail), no pasa por SectionCard
    // additional-photo-report usa componente propio (AdditionalPhotoDetail)
    'additional-photo-report': [],
  }

  const fc = normalizeFormCode(submission?.form_code || '')
  const allowedSections = PHOTO_SECTIONS[fc] // undefined = no mapeado, null = todas

  const sectionAllowsUpload = (title) => {
    if (allowedSections === null) return true   // todas las secciones
    if (!allowedSections) return false          // no mapeado — no permitir

    return allowedSections.some(s => {
      // Prefix match: e.g. '🔧' matches any section starting with that emoji
      if (s.length <= 2 && title.startsWith(s)) return true
      // Full string match (case-insensitive, stripping leading emoji/symbols)
      const t  = title.replace(/^[^\w]*/, '').trim().toLowerCase()
      const sc = s.replace(/^[^\w]*/, '').trim().toLowerCase()
      return t.includes(sc) || sc.includes(t)
    })
  }

  // Photo matching
  // Normaliza un string para comparación: quita emojis, tildes y pone en minúsculas
  const normalizeTitle = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .toLowerCase()

  // Devuelve TODAS las claves de photosBySection que coinciden con el título dado
  // (exact match + normalized match con tildes/emojis quitados)
  const findMatchingKeys = (title) => {
    const c    = normalizeTitle(title)
    const keys = []
    for (const k of Object.keys(photosBySection)) {
      if (k === title || normalizeTitle(k) === c ||
          normalizeTitle(k).includes(c) || c.includes(normalizeTitle(k))) {
        keys.push(k)
      }
    }
    return keys
  }

  // Merge de todas las fotos de las secciones que coincidan
  const findPhotos = (title) => {
    const keys   = findMatchingKeys(title)
    const photos = keys.flatMap(k => photosBySection[k] || [])
    return photos.length > 0 ? photos : null
  }

  const matched = new Set()
  const entries = Object.entries(cleanPayload)
  for (const [t] of entries) {
    findMatchingKeys(t).forEach(k => matched.add(k))
  }
  // Para additional-photo-report, AdditionalPhotoDetail maneja todas las fotos — no mostrar "Otras fotos"
  const unmatched     = fc === 'additional-photo-report'
    ? []
    : Object.entries(photosBySection).filter(([k]) => !matched.has(k)).flatMap(([,p]) => p)
  const globalScore   = totalItems > 0 && (bueno+regular+malo) > 0 ? Math.round((bueno/totalItems)*100) : null
  const Icon          = meta.icon

  // Build diff for modal preview
  const buildModalChanges = () => {
    const outer  = submission?.payload || {}
    const inner  = outer.payload || outer
    const data   = inner.data || {}

    // Flat map del payload para comparar valores originales
    const rawFlat = {}
    const _subs = [data.formData, data.datos, data.herrajes, data.prensacables,
                   data.tramos, data.platinas, data.certificacion, data.siteInfo]
    for (const sub of _subs) {
      if (!sub || typeof sub !== 'object') continue
      for (const [k, v] of Object.entries(sub)) { rawFlat[k] = v; rawFlat[k.toLowerCase()] = v }
    }

    const ch = {}
    for (const [k, v] of Object.entries(pendingEdits)) {
      // Claves estructuradas: checklist.itemId.field / items.itemId.field / medicion.fieldId
      if (k.includes('|||')) {
        const parts = k.split('|||')
        const scope  = parts[0]
        const itemId = parts[1]
        const field  = parts[2]

        let oldVal = '', label = k

        if (scope === 'checklist') {
          oldVal = data.checklistData?.[itemId]?.[field] ?? ''
          label = field === 'status' ? `Ítem ${itemId} — Estado` : `Ítem ${itemId} — Observación`
        } else if (scope === 'items') {
          oldVal = data.items?.[itemId]?.[field] ?? ''
          label = field === 'status' ? `Ítem ${itemId} — Estado` : `Ítem ${itemId} — Observación`
        } else if (scope === 'medicion') {
          oldVal = data.medicion?.[itemId] ?? ''
          label = `Medición ${itemId}`
        } else if (scope === 'siteInfo') {
          oldVal = data.siteInfo?.[itemId] ?? ''
          label = itemId
        } else if (scope === 'torre') {
          const rIdx = parseInt(field); const fId = parts[3]
          oldVal = data.torre?.items?.[rIdx]?.[fId] ?? ''
          label = `Torre fila ${rIdx+1} — ${fId}`
        } else if (scope === 'piso') {
          const cIdx = parseInt(itemId)
          if (field === 'gab') {
            const gIdx = parseInt(parts[3]); const fId = parts[4]
            oldVal = data.piso?.clientes?.[cIdx]?.gabinetes?.[gIdx]?.[fId] ?? ''
            label = `Cliente ${cIdx+1} Gab ${gIdx+1} — ${fId}`
          } else {
            oldVal = data.piso?.clientes?.[cIdx]?.[field] ?? ''
            label = `Cliente ${cIdx+1} — ${field}`
          }
        } else if (scope === 'carrier') {
          const cIdx = parseInt(itemId)
          if (field === 'item') {
            const rIdx = parseInt(parts[3]); const fId = parts[4]
            oldVal = data.carriers?.[cIdx]?.items?.[rIdx]?.[fId] ?? ''
            label = `Carrier ${cIdx+1} fila ${rIdx+1} — ${fId}`
          } else {
            oldVal = data.carriers?.[cIdx]?.[field] ?? ''
            label = `Carrier ${cIdx+1} — ${field}`
          }
        }

        ch[k] = { from: oldVal, to: v, label }
        continue
      }

      // Clave directa (campo de formulario)
      const oldVal = k in rawFlat ? rawFlat[k] : (k.toLowerCase() in rawFlat ? rawFlat[k.toLowerCase()] : '')
      ch[k] = { from: oldVal ?? '', to: v, label: k }
    }
    return ch
  }

  return (
    <>
      {/* Upload status toast */}
      <UploadToast status={uploadStatus} />

      {/* Save modal */}
      {showModal && (
        <SaveEditModal
          changes={buildModalChanges()}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowModal(false)}
          saving={saving}
        />
      )}

      <div className="space-y-4">
        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)}
              className="text-[13px] th-text-m hover:th-text-p flex items-center gap-1 transition-colors">
              <ArrowLeft size={15}/> Volver
            </button>
            <button
              onClick={() => { useSubmissionsStore.getState().load(true); loadDetail(submissionId) }}
              className="h-7 px-2.5 text-[11px] rounded-lg flex items-center gap-1 transition-colors th-text-m"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-base)' }}
              title="Actualizar datos desde el servidor">
              <RefreshCw size={11}/> Actualizar
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Feedback */}
            {saveSuccess && (
              <span className="text-[12px] text-good font-medium flex items-center gap-1">
                <CheckCircle2 size={13}/>Cambios guardados
              </span>
            )}
            {saveError && <span className="text-[12px] text-bad">{saveError}</span>}

            {/* Edit controls */}
            {canWrite && !editMode && (
              <button onClick={() => setEditMode(true)}
                className="h-8 px-3 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-all border"
                style={{ color: 'var(--accent-text)', background: 'var(--accent-light)', borderColor: 'rgba(2,132,199,.2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(2,132,199,.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-light)'}>
                <Pencil size={12}/> Editar
              </button>
            )}
            {editMode && <>
              <span className="text-[11px] th-text-m">
                {pendingCount} campo{pendingCount !== 1 ? 's' : ''} modificado{pendingCount !== 1 ? 's' : ''}
              </span>
              <button onClick={handleEditCancel}
                className="h-8 px-3 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-all"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-base)', border: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-base)'}>
                <RotateCcw size={12}/> Cancelar
              </button>
              <button onClick={handleEditSave} disabled={pendingCount === 0}
                className="h-8 px-3 text-[12px] font-semibold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40"
                style={{ color: '#fff', background: 'var(--accent)' }}
                onMouseEnter={e => { if (pendingCount > 0) e.currentTarget.style.background = 'var(--accent-text)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                <Save size={12}/> Guardar cambios
              </button>
            </>}

            {/* Standard actions */}
            {!editMode && totalPhotos > 0 && (
              <button onClick={handleDownloadPhotos} disabled={photosLoading}
                className="h-8 px-3 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-all border disabled:opacity-50"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
                {photosLoading
                  ? <><Clock size={13} className="animate-spin"/>Descargando…</>
                  : <><Download size={13}/>Fotos ({totalPhotos})</>}
              </button>
            )}
            {!editMode && fc !== 'additional-photo-report' && (
              <button onClick={handlePdf} disabled={pdfLoading}
                className="h-8 px-3.5 text-[12px] font-semibold rounded-lg flex items-center gap-1.5 transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: '#0d2137', color: '#ffffff' }}
                onMouseEnter={e => { if (!pdfLoading) e.currentTarget.style.background = '#1a3450' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0d2137' }}>
                <Download size={13}/>{pdfLoading ? 'Generando…' : 'PDF'}
              </button>
            )}
          </div>
        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 flex items-start gap-3">
            <Pencil size={14} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-accent leading-relaxed">
              <strong>Modo edición activo.</strong> Modifica los campos que necesites y pulsa{' '}
              <strong>Guardar cambios</strong>. Los campos de GPS, fechas y coordenadas no son editables.
              Las fotos se pueden subir usando el botón <strong>Subir</strong> en cada sección.
            </p>
          </div>
        )}

        {/* ── HERO CARD ── */}
        <div className="rounded-xl th-shadow overflow-hidden" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
          <div className="px-4 sm:px-5 py-4 flex items-start gap-3">
            <div className="flex-shrink-0">
              {globalScore !== null
                ? <ScoreRing good={bueno} regular={regular} bad={malo} total={totalItems} size={56}/>
                : <div className={`w-14 h-14 rounded-xl ${meta.color} text-white flex items-center justify-center`}><Icon size={22}/></div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold th-text-p">{site.nombreSitio || 'Sin nombre'}</h1>
                {/* Status — clickable if canWrite */}
                {canWrite && !editMode
                  ? (
                    <button onClick={handleFinalizedToggle} disabled={saving}
                      title="Click para cambiar estado"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95
                        ${fin
                          ? 'text-good bg-good/10 border-good/20 hover:bg-good/20'
                          : 'text-warn bg-warn/10 border-warn/20 hover:bg-warn/20'}`}>
                      {saving ? '…' : fin ? '✓ Completado' : '○ Borrador'}
                    </button>
                  ) : (
                    fin
                      ? <span className="text-[10px] font-semibold text-good bg-good/10 px-2 py-0.5 rounded-full">Completado</span>
                      : <span className="text-[10px] font-semibold text-warn bg-warn/10 px-2 py-0.5 rounded-full">Borrador</span>
                  )}
              </div>
              <div className="text-[13px] th-text-m mt-0.5">{meta.label}</div>
              {totalItems > 0 && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-good"/><b className="text-good">{bueno}</b><span className="th-text-m">bueno</span></span>
                  <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-warn"/><b className="text-warn">{regular}</b><span className="th-text-m">regular</span></span>
                  <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-bad"/><b className="text-bad">{malo}</b><span className="th-text-m">malo</span></span>
                  {pendiente > 0 && <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-slate-300"/><b>{pendiente}</b><span className="th-text-m">pendiente</span></span>}
                  <span className="text-[10px] th-text-m ml-auto">{totalItems} ítems</span>
                </div>
              )}
              {totalItems > 0 && (
                <div className="h-1.5 rounded-full th-bg-base overflow-hidden mt-2 flex">
                  {bueno   > 0 && <div className="h-full bg-good transition-all" style={{ width:`${(bueno/totalItems)*100}%` }}/>}
                  {regular > 0 && <div className="h-full bg-warn transition-all" style={{ width:`${(regular/totalItems)*100}%` }}/>}
                  {malo    > 0 && <div className="h-full bg-bad  transition-all" style={{ width:`${(malo/totalItems)*100}%` }}/>}
                </div>
              )}
            </div>
          </div>

          {/* Meta chips */}
          <div className="px-4 sm:px-5 pb-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] th-text-m">
            <span className="flex items-center gap-1"><MapPin   size={12} className="th-text-m"/>{site.idSitio || '—'}</span>
            <span className="flex items-center gap-1"><User2    size={12} className="th-text-m"/>{who?.name || '—'}</span>
            <span className="flex items-center gap-1"><Calendar size={12} className="th-text-m"/>{inspMeta.date || (submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '—')}</span>
            <span className="flex items-center gap-1"><Camera   size={12} className="th-text-m"/>{totalPhotos} foto{totalPhotos !== 1 ? 's' : ''}</span>
            {submission.app_version && <span className="th-text-m">v{submission.app_version}</span>}
          </div>

          {hasOrder && (
            <div className="px-5 pb-3">
              <Link to={`/orders/${visitId}`} className="inline-flex items-center gap-1.5 text-[12px] text-accent font-medium hover:underline">
                <Eye size={12}/>Ver visita completa<ChevronRight size={10}/>
              </Link>
            </div>
          )}
        </div>

        {/* ── EQUIPMENT V2 — Vista especializada ── */}
        {normalizeFormCode(submission.form_code) === 'equipment-v2' ? (
          <div className="px-0">
            <EquipmentV2Detail submission={submission} assets={assets}
              editMode={editMode} pendingEdits={pendingEdits} onFieldChange={handleFieldChange}
              onPhotoUpload={handlePhotoUpload}
              onPhotoDelete={handlePhotoDelete} />
          </div>
        ) : normalizeFormCode(submission.form_code) === 'additional-photo-report' ? (
          <div className="px-0">
            <AdditionalPhotoDetail submission={submission} assets={assets}
              editMode={editMode} pendingEdits={pendingEdits} onFieldChange={handleFieldChange}
              onPhotoUpload={handlePhotoUploadAdditional}
              onPhotoDelete={handlePhotoDelete}
              isUploading={uploadStatus === 'uploading'} />
          </div>
        ) : (
          <>
            {/* ── SECTION CARDS ── */}
            {entries.map(([t, d], i) => (
              <SectionCard
                key={t} title={t} data={d} photos={findPhotos(t)} index={i}
                editMode={editMode}
                pendingEdits={pendingEdits}
                onFieldChange={handleFieldChange}
                onPhotoUpload={(file) => handlePhotoUpload(file, t)}
                onPhotoDelete={(assetType) => handlePhotoDelete(assetType)}
                allowUpload={sectionAllowsUpload(t)}
                isUploading={uploadStatus === 'uploading'}
              />
            ))}

            {entries.length === 0 && (
              <div className="rounded-xl th-shadow py-14 text-center text-[13px] th-text-m">
                Sin datos de formulario
              </div>
            )}
          </>
        )}

        {/* Unmatched photos */}
        {unmatched.length > 0 && (
          <div className="rounded-xl th-shadow p-4" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
            <div className="flex items-center gap-2 mb-2">
              <Camera size={14} className="text-accent"/>
              <span className="text-[13px] font-semibold th-text-p">Otras fotos</span>
              <span className="text-[10px] th-text-m th-bg-base px-1.5 py-0.5 rounded">{unmatched.length}</span>
            </div>
            <PhotoGallery photos={unmatched} editMode={editMode}
              onUpload={(file) => handlePhotoUpload(file, 'otras')}
              onDelete={(assetType) => handlePhotoDelete(assetType)}
              isUploading={uploadStatus === 'uploading'} />
          </div>
        )}

        {/* ── AUDIT HISTORY ── */}
        <EditHistory submissionId={submissionId} />
      </div>
    </>
  )
}
