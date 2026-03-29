/**
 * AdditionalPhotoDetail.jsx
 * Vista detallada del Reporte Adicional de Fotografías
 * Soporta modo lectura y modo edición (notas solamente — las fotos se manejan vía upload)
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Camera, CheckCircle2, Clock, Image, Upload, Trash2, Plus } from 'lucide-react'
import { PHOTO_CATEGORIES } from '../../data/additionalPhotoConfig'

// ── Helpers ───────────────────────────────────────────────────────────────────
const inpCls = (changed) =>
  `w-full text-[12px] border rounded px-2 py-1.5 outline-none transition-all resize-none
   ${changed
     ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500/20 dark:bg-sky-900/20'
     : 'border-[var(--border)] th-bg-base focus:border-sky-500'}`

// ── Panel colapsable ──────────────────────────────────────────────────────────
function CategoryPanel({ cat, photos, editMode, pendingEdits, onChange, index, onPhotoUpload, onPhotoDelete }) {
  const [open, setOpen] = useState(index < 3) // primeras 3 abiertas por default

  const captured  = photos.filter(p => p?.public_url).length
  const minPhotos = cat.minPhotos
  const complete  = captured >= minPhotos
  const accent    = complete ? '#16a34a' : captured > 0 ? '#b45309' : '#94a3b8'

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}` }}>

      {/* Header */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ borderBottom: open ? '1px solid var(--border-light)' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>

        <span className="text-lg flex-shrink-0">{cat.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold th-text-p">{cat.title}</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {cat.id}
            </span>
          </div>
        </div>

        {/* Contador y estado */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {complete ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <CheckCircle2 size={10}/>{captured}✓
            </span>
          ) : captured > 0 ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#fffbeb', color: '#b45309' }}>
              <Camera size={10}/>{captured}/{minPhotos}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
              <Clock size={10}/>0/{minPhotos}
            </span>
          )}
          {open
            ? <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
            : <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3">
          {/* Descripción */}
          <p className="text-[11px] th-text-m leading-relaxed">{cat.description}</p>

          {/* Pills de metadata */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(2,132,199,0.08)', color: '#0284C7' }}>
              📷 Mín. {minPhotos} foto{minPhotos !== 1 ? 's' : ''}
            </span>
            <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-lg th-bg-base th-text-m">
              🔍 {cat.quality}
            </span>
            {cat.variable && (
              <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: '#fffbeb', color: '#b45309' }}>
                ± Variable
              </span>
            )}
          </div>

          {/* Subgrupos si los hay */}
          {cat.subGroups && (
            <div className="flex flex-wrap gap-1">
              {cat.subGroups.map(sg => (
                <span key={sg.key} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {cat.id}_{sg.key} · {sg.label}
                </span>
              ))}
            </div>
          )}

          {/* Galería de fotos */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {photos.map((photo, i) => {
                const subLabel = cat.subLabels?.[i] ?? `Foto ${i + 1}`
                const code     = `${cat.id}_${String(i + 1).padStart(2, '0')}`
                const url      = photo?.public_url || photo?.storage_url || photo?.url || null
                return (
                  <div key={i} className="space-y-1">
                    <div className="relative aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                      {url ? (
                        <>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                            <img src={url} alt={subLabel}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                              onError={e => {
                                e.currentTarget.style.display = 'none'
                                const container = e.currentTarget.closest('a')?.parentElement
                                if (container) {
                                  container.innerHTML = '<div class="flex flex-col items-center gap-1 h-full justify-center"><span style="color:var(--text-muted);font-size:9px">No disponible</span></div>'
                                }
                              }} />
                          </a>
                          {editMode && (
                            <button
                              title="Eliminar foto"
                              onClick={() => {
                                const assetType = photo?.asset_type
                                if (!assetType) return
                                if (window.confirm(`¿Eliminar "${subLabel}"? Esta acción no se puede deshacer.`)) {
                                  onPhotoDelete?.(assetType)
                                }
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center z-10"
                              style={{ background: '#EF4444', border: '1.5px solid white' }}>
                              <Trash2 size={10} color="white" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Image size={20} style={{ color: 'var(--border)' }} />
                          <span className="text-[9px] th-text-m">Sin foto</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-mono font-bold px-1 rounded"
                        style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {code}
                      </span>
                      <span className="text-[9px] th-text-m truncate flex-1">{subLabel}</span>
                    </div>
                  </div>
                )
              })}

              {/* Upload button in editMode */}
              {editMode && (
                <div className="space-y-1">
                  <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group"
                    style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)' }}
                    title={`Subir foto a ${cat.title}`}>
                    <Plus size={20} style={{ color: 'var(--accent)' }} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-medium mt-1" style={{ color: 'var(--accent)' }}>Agregar</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) onPhotoUpload?.(f, cat.id)
                        e.target.value = ''
                      }} />
                  </label>
                </div>
              )}

              {/* Slots vacíos hasta completar mínimo */}
              {Array.from({ length: Math.max(0, minPhotos - photos.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="space-y-1">
                  <div className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1"
                    style={{ background: 'var(--bg-base)', border: '2px dashed var(--border)' }}>
                    <Camera size={16} style={{ color: 'var(--border)' }} />
                    <span className="text-[9px] th-text-m">Pendiente</span>
                  </div>
                  <span className="text-[9px] th-text-m">
                    {cat.subLabels?.[photos.length + i] ?? `Foto ${photos.length + i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4 justify-center rounded-lg"
              style={{ background: 'var(--bg-base)', border: '2px dashed var(--border)' }}>
              <Camera size={16} style={{ color: 'var(--border)' }} />
              <span className="text-[11px] th-text-m">Sin fotos capturadas</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdditionalPhotoDetail({ submission, assets, editMode = false, pendingEdits = {}, onFieldChange, onPhotoUpload, onPhotoDelete }) {
  const raw     = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const notes   = raw.notes || ''
  const photos  = raw.photos || {}

  // Mapear assets de Supabase → { [acronym]: [{ public_url, label }] }
  // Construir mapa de assets por acrónimo — soporta DOS formatos de asset_type:
  //
  // Formato nuevo (PTI Inspect v2.5.x):
  //   photos:{ACRONYM}:{index_0based}  → ej: photos:ACC:0
  //
  // Formato legacy (PTI Inspect versiones anteriores):
  //   {SITIO}_{ACRONYM}_{FECHA}_({index_1based})  → ej: SITIO1_ACC_230326_(1)
  //
  const PHOTO_ACRONYMS = new Set(PHOTO_CATEGORIES.map(c => c.id))

  const assetMapRaw = {}  // { [acronym]: { [idx]: asset } }
  if (assets) {
    for (const a of assets) {
      if (!a.public_url) continue
      const type  = a.asset_type || a.type || ''
      let acronym = null
      let idx     = 0

      if (type.startsWith('photos:')) {
        // Formato nuevo: photos:ACC:0
        const parts = type.split(':')
        acronym = parts[1]?.toUpperCase() || null
        idx     = parseInt(parts[2] ?? '0')
      } else {
        // Formato legacy: SITIO1_ACC_230326_(3)
        // Buscar el acrónimo conocido entre los segmentos separados por _
        for (const seg of type.split('_')) {
          if (PHOTO_ACRONYMS.has(seg.toUpperCase())) {
            acronym = seg.toUpperCase()
            break
          }
        }
        // Extraer índice del número entre paréntesis al final: (1) → 0
        const idxMatch = type.match(/\((\d+)\)$/)
        idx = idxMatch ? parseInt(idxMatch[1]) - 1 : 0
      }

      if (acronym && PHOTO_ACRONYMS.has(acronym)) {
        if (!assetMapRaw[acronym]) assetMapRaw[acronym] = {}
        assetMapRaw[acronym][idx] = a
      }
    }
  }
  // Convertir a arrays densos ordenados por índice (sin huecos undefined)
  const assetMap = {}
  for (const [acronym, byIdx] of Object.entries(assetMapRaw)) {
    assetMap[acronym] = Object.keys(byIdx)
      .map(Number)
      .sort((a, b) => a - b)
      .map(i => byIdx[i])
  }

  // Progreso global
  const completed = PHOTO_CATEGORIES.filter(cat => {
    const catPhotos = assetMap[cat.id] || []
    const fromData  = (photos[cat.id] || []).filter(Boolean)
    const count     = Math.max(catPhotos.filter(p => p?.public_url).length, fromData.length)
    return count >= cat.minPhotos
  }).length

  const pct = Math.round((completed / PHOTO_CATEGORIES.length) * 100)

  const notesKey     = 'notes'
  const curNotes     = notesKey in pendingEdits ? pendingEdits[notesKey] : notes
  const notesChanged = notesKey in pendingEdits && pendingEdits[notesKey] !== notes

  return (
    <div className="space-y-3">

      {/* Progreso global */}
      <div className="rounded-xl px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold th-text-p">Progreso del reporte</span>
          <span className="text-[12px] font-bold" style={{ color: pct === 100 ? '#16a34a' : '#0284C7' }}>
            {completed}/{PHOTO_CATEGORIES.length} categorías · {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#0284C7' }} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PHOTO_CATEGORIES.map(cat => {
            const catAssets = assetMap[cat.id] || []
            const fromData  = (photos[cat.id] || []).filter(Boolean)
            const count     = Math.max(catAssets.filter(p => p?.public_url).length, fromData.length)
            const ok        = count >= cat.minPhotos
            return (
              <span key={cat.id}
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: ok ? '#f0fdf4' : 'var(--bg-base)',
                  color: ok ? '#16a34a' : 'var(--text-muted)',
                  border: `1px solid ${ok ? '#86efac' : 'var(--border)'}`,
                }}>
                {cat.id}
              </span>
            )
          })}
        </div>
      </div>

      {/* Categorías */}
      {PHOTO_CATEGORIES.map((cat, i) => {
        const catAssets = assetMap[cat.id] || []
        // Mezclar assets de Supabase con los del payload (base64 del inspector)
        // Filter out placeholder values — only use real URLs (http/https)
        const fromData  = (photos[cat.id] || [])
          .map(url => (url && typeof url === 'string' && url.startsWith('http')) ? { public_url: url } : null)
        const merged    = catAssets.length > 0 ? catAssets : fromData.filter(Boolean)
        return (
          <CategoryPanel
            key={cat.id}
            cat={cat}
            photos={merged}
            editMode={editMode}
            pendingEdits={pendingEdits}
            onChange={onFieldChange}
            index={i}
            onPhotoUpload={onPhotoUpload}
            onPhotoDelete={onPhotoDelete}
          />
        )
      })}

      {/* Observaciones */}
      <div className="rounded-xl px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider th-text-m mb-2">Observaciones</div>
        {editMode ? (
          <textarea rows={3}
            className={inpCls(notesChanged)}
            value={curNotes}
            placeholder="Notas, condiciones especiales, aclaraciones..."
            onChange={e => onFieldChange?.(notesKey, e.target.value)} />
        ) : (
          <p className={`text-[12px] th-text-p leading-relaxed ${!curNotes ? 'th-text-m italic' : ''}`}>
            {curNotes || 'Sin observaciones'}
          </p>
        )}
      </div>
    </div>
  )
}
