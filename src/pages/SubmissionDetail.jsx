import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Download, ExternalLink, X, ChevronDown, ChevronRight,
  Camera, MapPin, Calendar, User2, CheckCircle2, AlertTriangle, XCircle,
  Minus, Clock, Eye, Pencil, Save, RotateCcw, History, ShieldCheck, Upload,
} from 'lucide-react'
import Spinner from '../components/ui/Spinner'
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
import {
  updateSubmissionPayload,
  insertSubmissionEdit,
  fetchSubmissionEdits,
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
// PHOTO GALLERY  (with optional upload button)
// ─────────────────────────────────────────────────────────────
function PhotoGallery({ photos, editMode = false, onUpload }) {
  const [zoom, setZoom] = useState(null)
  if (!photos?.length && !editMode) return null
  return (
    <>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {(photos || []).map(p => (
          <button key={p.id} onClick={() => setZoom(p)}
            className="w-14 h-14 rounded-lg overflow-hidden border-2 border-white shadow-card hover:shadow-elevated hover:scale-105 transition-all th-bg-base">
            <img src={p.public_url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
        {editMode && (
          <label className="w-14 h-14 rounded-lg border-2 border-dashed border-accent/40 hover:border-accent bg-accent/5 flex flex-col items-center justify-center cursor-pointer transition-all group" title="Subir foto">
            <Upload size={13} className="text-accent/50 group-hover:text-accent transition-colors" />
            <span className="text-[9px] text-accent/50 group-hover:text-accent mt-0.5 transition-colors">Subir</span>
            <input type="file" accept="image/*" capture="environment" className="hidden"
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
            <img src={zoom.public_url} alt={zoom.label} className="w-full rounded-xl shadow-elevated" />
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
// INLINE EDITABLE FIELD
// ─────────────────────────────────────────────────────────────
function EditableField({ label, value, fieldKey, pendingEdits, onChange }) {
  const current = fieldKey in pendingEdits ? pendingEdits[fieldKey] : (value ?? '')
  const changed  = fieldKey in pendingEdits && String(pendingEdits[fieldKey]) !== String(value ?? '')
  const isLong   = String(current).length > 80

  return (
    <div className={`flex items-start gap-2 py-1.5 border-b th-border-l last:border-0 transition-colors
      ${changed ? 'bg-accent/5 -mx-2 px-2 rounded' : ''}`}>
      <span className="text-[11px] th-text-m w-36 flex-shrink-0 pt-1.5">{label}</span>
      <div className="flex-1 relative">
        {isLong
          ? <textarea rows={3}
              className={`w-full text-[12px] border rounded px-2 py-1 outline-none resize-none transition-all
                ${changed
                  ? 'border-sky-500 bg-white shadow-sm ring-1 ring-sky-500/20'
                  : 'border th-border th-bg-base focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'}`}
              value={current}
              onChange={e => onChange(fieldKey, e.target.value)}
            />
          : <input
              className={`w-full text-[12px] border rounded px-2 py-1 outline-none transition-all
                ${changed
                  ? 'border-sky-500 bg-white shadow-sm ring-1 ring-sky-500/20'
                  : 'border th-border th-bg-base focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'}`}
              value={current}
              onChange={e => onChange(fieldKey, e.target.value)}
            />
        }
        {changed && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" title="Modificado" />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION CARD  (read + edit modes)
// ─────────────────────────────────────────────────────────────
function SectionCard({ title, data, photos, index, editMode, pendingEdits, onFieldChange, onPhotoUpload }) {
  const [open, setOpen] = useState(true)

  const isCL  = Array.isArray(data) && data.some(d => d?.['Estado'])
  const isFld = data && typeof data === 'object' && !Array.isArray(data)

  const READONLY_KEYS = new Set([
    'lat','lng','startedAt','finishedAt','date','time','created_at','updated_at','_meta',
    'Nombre','Rol','Usuario','Fecha de envío','Fecha de envio',
    'name','role','username',
  ])
  const READONLY_SECTIONS = new Set(['👤 Enviado por', '📍 Inicio de inspección'])
  const isSectionReadonly = READONLY_SECTIONS.has(title)

  // Checklist stats
  let sGood=0, sReg=0, sBad=0, sTotal=0
  if (isCL) data.forEach(it => {
    if (!it['Estado']) return; sTotal++
    const st = String(it['Estado']).toLowerCase()
    if (st.includes('bueno') || st.includes('ejecutada')) sGood++
    else if (st.includes('regular')) sReg++
    else if (st.includes('malo')) sBad++
  })

  const hv = isCL && data.some(i => i['Valor'])
  const ho = isCL && data.some(i => i['Observación'])
  const photoCount = photos?.length || 0

  // Score % para checklists
  const score = sTotal > 0 ? Math.round((sGood / sTotal) * 100) : null
  const scoreColor = score === null ? '' : score >= 80 ? '#16a34a' : score >= 50 ? '#b45309' : '#dc2626'
  const scoreBg    = score === null ? '' : score >= 80 ? '#f0fdf4' : score >= 50 ? '#fffbeb' : '#fef2f2'

  // Agrupar campos por pares (label - valor) para layout en grid
  const fieldEntries = isFld ? Object.entries(data).filter(([k]) => !k.startsWith('__')) : []

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        animationDelay: `${index * 40}ms`,
      }}>

      {/* ── Header de sección ─────────────────────────────────── */}
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ borderBottom: open ? '1px solid var(--border-light)' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>

        <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
          <span className="text-[13px] font-semibold th-text-p">{title}</span>

          {/* Mini score bar para checklists */}
          {isCL && sTotal > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {data.slice(0,24).map((it,i) => <StatusDot key={i} value={it['Estado']} />)}
                {data.length > 24 && <span className="text-[9px] th-text-m ml-0.5">+{data.length-24}</span>}
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: scoreBg, color: scoreColor }}>
                {score}%
              </span>
            </div>
          )}

          {/* Contador campo normales */}
          {isFld && fieldEntries.length > 0 && (
            <span className="text-[10px] th-text-m">
              {fieldEntries.length} campo{fieldEntries.length !== 1 ? 's' : ''}
            </span>
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

          {/* ── Campos en grid 2 columnas ──────────────────────── */}
          {isFld && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
              {fieldEntries.map(([k, v]) => {
                const isReadonly = isSectionReadonly || READONLY_KEYS.has(k) || k.startsWith('foto') || k.startsWith('__')
                if (editMode && !isReadonly) {
                  return (
                    <EditableField key={k} label={k} value={v} fieldKey={k}
                      pendingEdits={pendingEdits} onChange={onFieldChange} />
                  )
                }
                const display = (v === null || v === undefined || v === '') ? '—' : String(v)
                const isPhoto = k.startsWith('foto') && typeof v === 'string' && v.startsWith('http')
                const isEmpty = display === '—'
                return (
                  <div key={k} className="flex flex-col gap-0.5 py-2"
                    style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider th-text-m"
                      style={{ letterSpacing: '.05em' }}>{k}</span>
                    {isPhoto
                      ? <a href={v} target="_blank" rel="noopener noreferrer"
                          className="text-[12px] font-medium"
                          style={{ color: 'var(--accent)' }}>Ver foto ↗</a>
                      : <span className={`text-[13px] font-medium ${isEmpty ? 'th-text-m' : 'th-text-p'}`}>
                          {display}
                        </span>
                    }
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Checklist ──────────────────────────────────────── */}
          {isCL && (
            <>
              {/* Resumen de estado si hay items */}
              {sTotal > 0 && (
                <div className="flex gap-3 mt-3 mb-2 flex-wrap">
                  {sGood > 0 && (
                    <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/> {sGood} Bueno
                    </span>
                  )}
                  {sReg > 0 && (
                    <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ background: '#fffbeb', color: '#b45309' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/> {sReg} Regular
                    </span>
                  )}
                  {sBad > 0 && (
                    <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ background: '#fef2f2', color: '#dc2626' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/> {sBad} Malo
                    </span>
                  )}
                  {(sTotal - sGood - sReg - sBad) > 0 && (
                    <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg th-bg-base th-text-m">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"/> {sTotal - sGood - sReg - sBad} Sin estado
                    </span>
                  )}
                </div>
              )}

              {/* Items del checklist */}
              <div className="mt-1 space-y-0">
                {data.map((it, i) => {
                  const estado = it['Estado'] || ''
                  const st = estado.toLowerCase()
                  const isGood = st.includes('bueno') || st.includes('ejecutada')
                  const isBad  = st.includes('malo')
                  const isReg  = st.includes('regular')
                  const rowBg  = isBad ? 'rgba(239,68,68,.04)' : isReg ? 'rgba(245,158,11,.04)' : ''
                  return (
                    <div key={i}
                      className="flex items-start gap-2.5 py-2 px-2 rounded-lg"
                      style={{
                        borderBottom: i < data.length-1 ? '1px solid var(--border-light)' : 'none',
                        background: rowBg,
                      }}>
                      <StatusDot value={estado} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-medium th-text-p">
                            {it['Item'] || it['Ítem'] || it['nombre'] || `Ítem ${i+1}`}
                          </span>
                          {estado && <StatusBadge value={estado} />}
                          {hv && it['Valor'] && (
                            <span className="text-[10px] th-text-m th-bg-base px-1.5 py-0.5 rounded font-mono">{it['Valor']}</span>
                          )}
                        </div>
                        {ho && it['Observación'] && (
                          <p className="text-[11px] th-text-m mt-0.5 leading-snug">{it['Observación']}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Fotos ──────────────────────────────────────────── */}
          {(photoCount > 0 || editMode) && (
            <div className={fieldEntries.length > 0 || isCL ? 'mt-3 pt-3' : 'mt-3'}
              style={fieldEntries.length > 0 || isCL ? { borderTop: '1px solid var(--border-light)' } : {}}>
              <PhotoGallery photos={photos} editMode={editMode} onUpload={onPhotoUpload} />
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}>
      <div className="rounded-2xl shadow-elevated w-full max-w-md" style={{background:"var(--bg-card)"}} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b th-border-l flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={15} className="text-accent" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold th-text-p">Confirmar cambios</h2>
            <p className="text-[12px] th-text-m mt-0.5">Quedarán registrados en el historial de auditoría.</p>
          </div>
        </div>

        {/* Diff list */}
        <div className="px-5 py-3 max-h-48 overflow-y-auto space-y-2">
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

        {/* Note input */}
        <div className="px-5 pb-5 border-t th-border-l pt-4 space-y-3">
          <div>
            <label className="text-[11px] font-semibold th-text-s uppercase tracking-wide block mb-1.5">
              Razón del cambio <span className="text-bad">*</span>
            </label>
            <textarea
              autoFocus
              rows={3}
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
              className="flex-1 h-9 text-[13px] font-medium th-text-s th-bg-base rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={() => onConfirm(note)}
              disabled={!note.trim() || saving}
              className="flex-1 h-9 text-[13px] font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
              {saving
                ? <><Clock size={13} className="animate-spin"/>Guardando…</>
                : <><Save size={13}/>Guardar</>}
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
// MAIN
// ─────────────────────────────────────────────────────────────
export default function SubmissionDetail() {
  const { submissionId }                        = useParams()
  const navigate                                = useNavigate()
  const submission   = useSubmissionsStore(s => s.activeSubmission)
  const assets       = useSubmissionsStore(s => s.activeAssets || [])
  const loadDetail   = useSubmissionsStore(s => s.loadDetail)
  const clearDetail  = useSubmissionsStore(s => s.clearDetail)
  const isLoading                               = useSubmissionsStore(s => s.isLoadingDetail)
  const user                                    = useAuthStore(s => s.user)

  const [pdfLoading,    setPdfLoading]    = useState(false)
  const [photosLoading, setPhotosLoading] = useState(false)

  // Edit state
  const [editMode,      setEditMode]      = useState(false)
  const [pendingEdits,  setPendingEdits]  = useState({})   // { key: newVal }
  const [showModal,     setShowModal]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState(null)
  const [saveSuccess,   setSaveSuccess]   = useState(false)

  useEffect(() => {
    if (submissionId) loadDetail(submissionId)
    return () => clearDetail()
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

  // ── Photo upload from dashboard ─────────────────────────────
  const handlePhotoUpload = useCallback(async (file, sectionHint) => {
    if (!file || !submission) return
    try {
      const ext  = file.name.split('.').pop() || 'jpg'
      const path = `${submission.org_code || 'pti'}/${submissionId}/${sectionHint || 'dashboard'}_${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('inspection-assets')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      // Reload so new asset appears
      await loadDetail(submissionId)
      // Audit — non-blocking
      insertSubmissionEdit(submissionId, user.username,
        { __photo__: { from: '—', to: path, label: 'Foto subida' } },
        `Foto subida desde panel de administración: ${file.name}`)
        .catch(e => console.warn('[Audit] submission_edits not available yet:', e.message))
    } catch (e) { console.error('Photo upload error:', e) }
  }, [submission, submissionId, user])

  // ── Finalized toggle ────────────────────────────────────────
  const handleFinalizedToggle = async () => {
    if (!user?.canWrite) return
    const newVal = !fin
    setSaving(true)
    try {
      await updateSubmissionPayload(submissionId, submission.payload, { __finalized__: newVal })
      // Audit — non-blocking
      insertSubmissionEdit(submissionId, user.username, {
        estado: {
          from:  fin ? 'Completado' : 'Borrador',
          to:    newVal ? 'Completado' : 'Borrador',
          label: 'Estado',
        },
      }, newVal ? 'Marcado como Completado desde el panel' : 'Revertido a Borrador desde el panel')
        .catch(e => console.warn('[Audit] submission_edits not available yet:', e.message))
      await loadDetail(submissionId)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  // ── Confirm save with audit ─────────────────────────────────
  const handleConfirmSave = async (note) => {
    setSaving(true); setSaveError(null)
    try {
      // Build original flat map for diff — merge all sub-objects, case-insensitive lookup
      const outer  = submission?.payload || {}
      const inner  = outer.payload || outer
      const data   = inner.data || {}

      const rawFlat = {}
      const subObjs = [data.formData, data.datos, data.herrajes, data.prensacables,
                       data.tramos, data.platinas, data.certificacion, data.siteInfo]
      for (const sub of subObjs) {
        if (!sub || typeof sub !== 'object') continue
        for (const [k, v] of Object.entries(sub)) {
          rawFlat[k] = v
          rawFlat[k.toLowerCase()] = v
        }
      }
      const findOld = (key) => {
        if (key in rawFlat) return rawFlat[key]
        const kl = key.toLowerCase()
        return kl in rawFlat ? rawFlat[kl] : ''
      }

      // Build changes object (only truly changed fields)
      const changes = {}
      for (const [key, newVal] of Object.entries(pendingEdits)) {
        const oldVal = findOld(key)
        if (String(newVal) !== String(oldVal ?? '')) {
          changes[key] = { from: oldVal ?? '', to: newVal, label: key }
        }
      }

      if (Object.keys(changes).length === 0) {
        setShowModal(false); setEditMode(false); setPendingEdits({}); setSaving(false); return
      }

      await updateSubmissionPayload(submissionId, submission.payload, pendingEdits)
      insertSubmissionEdit(submissionId, user.username || user.email, changes, note)
        .catch(e => console.warn('[Audit] submission_edits not available yet:', e.message))
      // Log en system_logs
      LOG.submissionEdited(
        submissionId,
        extractSiteInfo(submission)?.nombreSitio || submissionId,
        user.email,
        Object.keys(changes)
      )
      await loadDetail(submissionId)

      setShowModal(false); setEditMode(false); setPendingEdits({})
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    } catch (err) {
      console.error('Save error:', err)
      setSaveError(err.message || 'Error al guardar')
    }
    setSaving(false)
  }

  // ── Derived ─────────────────────────────────────────────────
  const photosBySection = useMemo(() =>
    (!assets?.length || !submission) ? {} : groupAssetsBySection(assets, submission.form_code),
    [assets, submission])

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size={16}/></div>
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
  const pendingCount= Object.keys(pendingEdits).length

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

  // Photo matching
  const findPhotos = (title) => {
    if (photosBySection[title]) return photosBySection[title]
    const c = title.replace(/^[^\w]*/, '').trim().toLowerCase()
    for (const [k, p] of Object.entries(photosBySection)) {
      const kc = k.replace(/^[^\w]*/, '').trim().toLowerCase()
      if (kc.includes(c) || c.includes(kc)) return p
    }
    return null
  }
  const matched = new Set()
  const entries = Object.entries(cleanPayload)
  for (const [t] of entries) {
    const p = findPhotos(t)
    if (p) for (const [k, v] of Object.entries(photosBySection)) { if (v === p) matched.add(k) }
  }
  const unmatched     = Object.entries(photosBySection).filter(([k]) => !matched.has(k)).flatMap(([,p]) => p)
  const globalScore   = totalItems > 0 && (bueno+regular+malo) > 0 ? Math.round((bueno/totalItems)*100) : null
  const Icon          = meta.icon

  // Build diff for modal preview
  const buildModalChanges = () => {
    const outer  = submission?.payload || {}
    const inner  = outer.payload || outer
    const data   = inner.data || {}
    const rawFlat = {}
    const _subs = [data.formData, data.datos, data.herrajes, data.prensacables,
                   data.tramos, data.platinas, data.certificacion, data.siteInfo]
    for (const sub of _subs) {
      if (!sub || typeof sub !== 'object') continue
      for (const [k, v] of Object.entries(sub)) { rawFlat[k] = v; rawFlat[k.toLowerCase()] = v }
    }
    const _findOld = (key) => key in rawFlat ? rawFlat[key] : (key.toLowerCase() in rawFlat ? rawFlat[key.toLowerCase()] : '')
    const ch = {}
    for (const [k, v] of Object.entries(pendingEdits)) {
      ch[k] = { from: _findOld(k) ?? '', to: v, label: k }
    }
    return ch
  }

  return (
    <>
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => navigate(-1)}
            className="text-[13px] th-text-m hover:th-text-p flex items-center gap-1 transition-colors">
            <ArrowLeft size={15}/> Volver
          </button>

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
            {!editMode && (
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
          <div className="px-5 py-4 flex items-start gap-4">
            <div className="flex-shrink-0">
              {globalScore !== null
                ? <ScoreRing good={bueno} regular={regular} bad={malo} total={totalItems} size={64}/>
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
          <div className="px-5 pb-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px] th-text-m">
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
            <EquipmentV2Detail submission={submission} assets={assets} />
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
              onUpload={(file) => handlePhotoUpload(file, 'otras')} />
          </div>
        )}

        {/* ── AUDIT HISTORY ── */}
        <EditHistory submissionId={submissionId} />
      </div>
    </>
  )
}
