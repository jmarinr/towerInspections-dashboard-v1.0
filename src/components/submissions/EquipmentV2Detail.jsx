/**
 * EquipmentV2Detail.jsx — Inventario de Equipos v2
 * Soporta modo lectura y modo edición (editMode + pendingEdits + onFieldChange)
 *
 * Claves de edición usadas (separador |||):
 *   siteInfo  →  siteInfo|||proveedor, siteInfo|||direccion, etc.
 *   torre     →  torre|||{rowIdx}|||orientacion, torre|||{rowIdx}|||alto, etc.
 *   piso      →  piso|||{cIdx}|||nombreCliente, piso|||{cIdx}|||gab|||{gIdx}|||largo
 *   carrier   →  carrier|||{cIdx}|||nombre, carrier|||{cIdx}|||item|||{rIdx}|||orientacion
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Package, Building2, Radio, MapPin, Grid3x3, Camera, Upload, Trash2, AlertCircle } from 'lucide-react'

const v   = (x) => (x !== undefined && x !== null && x !== '') ? String(x) : null
const vd  = (x) => v(x) ?? '—'

// ── Opciones del app ──────────────────────────────────────────────────────────
const ORIENT_OPTS  = ['Cara 1','Cara 2','Cara 3','Pierna A','Pierna B','Pierna C','Mástil']
const TIPO_OPTS    = ['RF','RRU','MW','Omni','Herraje Vacío','Soporte Vacío','Otro']
const TIPO_SITIO_OPTS  = ['Rooftop','Rawland']
const TIPO_EST_OPTS    = ['Autosoportada','Arriostrada','Monopolo','Otro']
const TIPO_CLI_OPTS    = [{ value:'ancla', label:'Ancla' }, { value:'colo', label:'Colo' }]

// Campos de siteInfo que nunca se editan
const SITE_READONLY = new Set(['idSitio','nombreSitio','tipoVisita','numeroOrden',
  'fechaInicio','fechaTermino','latitud','longitud','coordenadas','fecha','hora'])

// ── Helpers de edición ────────────────────────────────────────────────────────
const inpCls = (changed) =>
  `w-full text-[11px] border rounded px-1.5 py-1 outline-none transition-all bg-white dark:bg-slate-800
   ${changed
     ? 'border-sky-500 ring-1 ring-sky-500/20'
     : 'border-[var(--border)] focus:border-sky-500'}`

function EditCell({ fieldKey, value, type = 'text', options, pendingEdits, onChange, minW = 70 }) {
  const cur     = fieldKey in pendingEdits ? pendingEdits[fieldKey] : (value ?? '')
  const changed = fieldKey in pendingEdits && String(pendingEdits[fieldKey]) !== String(value ?? '')
  if (type === 'select') {
    return (
      <select className={inpCls(changed)} style={{ minWidth: minW }}
        value={cur} onChange={e => onChange(fieldKey, e.target.value)}>
        <option value="">—</option>
        {(options || []).map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }
  return (
    <input type={type === 'number' ? 'number' : 'text'} step="any"
      className={inpCls(changed)} style={{ minWidth: minW }}
      value={cur} onChange={e => onChange(fieldKey, e.target.value)} />
  )
}

// ── Panel colapsable ──────────────────────────────────────────────────────────
function Panel({ icon: Icon, title, badge, accent = '#0284C7', ghostNum, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background:'var(--bg-card)', border:'1px solid var(--border)', boxShadow:'var(--shadow-card)', borderLeft:`3px solid ${accent}` }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left relative overflow-hidden"
        style={{ borderBottom: open ? '1px solid var(--border-light)' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {ghostNum && (
          <span className="absolute right-12 text-[52px] font-black leading-none select-none pointer-events-none"
            style={{ color: accent, opacity: 0.06, top:'-6px' }}>{ghostNum}</span>
        )}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background:`${accent}18`, color: accent }}>
          {Icon && <Icon size={13} strokeWidth={2} />}
        </div>
        <span className="font-semibold text-[13px] flex-1" style={{ color:'var(--text-primary)' }}>{title}</span>
        {badge && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mr-1"
            style={{ background:`${accent}14`, color: accent }}>{badge}</span>
        )}
        {open
          ? <ChevronDown size={13} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />
          : <ChevronRight size={13} strokeWidth={2} style={{ color:'var(--text-muted)', flexShrink:0 }} />}
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  )
}

// ── Datos del sitio ───────────────────────────────────────────────────────────
function SiteInfoGrid({ info, editMode, pendingEdits, onChange }) {
  if (!info) return null

  // Parsear coordenadas
  let lat = v(info.latitud), lng = v(info.longitud)
  if (!lat && info.coordenadas) {
    const parts = String(info.coordenadas).split(',').map(p => p.trim())
    if (parts.length >= 2) { lat = parts[0]; lng = parts[1] }
    else lat = info.coordenadas
  }

  // Campos con su configuración de edición
  const fieldDefs = [
    { key:'numeroOrden',  label:'N° Orden',       ro:true },
    { key:'idSitio',      label:'ID Sitio',        ro:true },
    { key:'nombreSitio',  label:'Nombre Sitio',    ro:true },
    { key:'tipoVisita',   label:'Tipo de Visita',  ro:true },
    { key:'proveedor',    label:'Proveedor',       ro:false, type:'text' },
    { key:'fechaInicio',  label:'Fecha Inicio',    ro:true, val: v(info.fechaInicio||info.fecha) },
    { key:'fechaTermino', label:'Fecha Término',   ro:true },
    { key:'alturaMts',    label:'Altura (m)',       ro:false, type:'number' },
    { key:'tipoSitio',    label:'Tipo Sitio',       ro:false, type:'select', opts: TIPO_SITIO_OPTS },
    { key:'tipoEstructura', label:'Tipo Estructura', ro:false, type:'select', opts: TIPO_EST_OPTS },
    { key:'direccion',    label:'Dirección',        ro:false, type:'text' },
    { key:'__lat__',      label:'Latitud',          ro:true,  val: lat },
    { key:'__lng__',      label:'Longitud',         ro:true,  val: lng },
  ].filter(f => {
    const val = f.val !== undefined ? f.val : v(info[f.key])
    return val !== null
  })

  const monoKeys = new Set(['__lat__','__lng__','alturaMts','fechaInicio','fechaTermino'])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
      {fieldDefs.map(f => {
        const rawVal = f.val !== undefined ? f.val : (info[f.key] ?? '')
        const edKey  = `siteInfo|||${f.key}`
        const isEditable = editMode && !f.ro

        if (isEditable) {
          const curVal = edKey in pendingEdits ? pendingEdits[edKey] : String(rawVal || '')
          const changed = edKey in pendingEdits && pendingEdits[edKey] !== String(rawVal || '')
          return (
            <div key={f.key}>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] mb-1"
                style={{ color:'var(--text-muted)' }}>{f.label}</div>
              {f.type === 'select' ? (
                <select className={inpCls(changed)}
                  value={curVal} onChange={e => onChange(edKey, e.target.value)}>
                  <option value="">Seleccione…</option>
                  {(f.opts||[]).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} step="any"
                  className={inpCls(changed)}
                  value={curVal} onChange={e => onChange(edKey, e.target.value)} />
              )}
            </div>
          )
        }

        const display = f.val !== undefined ? (f.val || '—') : vd(info[f.key])
        return (
          <div key={f.key}>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] mb-1"
              style={{ color:'var(--text-muted)' }}>{f.label}</div>
            <div className={`text-[13px] font-medium ${monoKeys.has(f.key) ? 'font-mono' : ''}`}
              style={{ color:'var(--text-primary)' }}>{display}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tabla de inventario (Torre / Carrier items) ───────────────────────────────
function InventoryTable({ items, accent = '#DC2626', editMode, pendingEdits, onChange, keyPrefix }) {
  const empty = !items || items.length === 0

  const calcArea = (alto, ancho, tipoEquipo) => {
    if (tipoEquipo === 'MW') {
      const d = parseFloat(alto)
      return Number.isFinite(d) && d > 0 ? (Math.PI * Math.pow(d/2, 2)).toFixed(4) : '—'
    }
    const a = parseFloat(alto), b = parseFloat(ancho)
    return Number.isFinite(a) && Number.isFinite(b) ? (a * b).toFixed(4) : '—'
  }

  const TH = ({ children, center }) => (
    <th className={`px-3 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.07em] whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}
      style={{ color:'var(--text-muted)', borderBottom:`2px solid ${accent}`, background:'var(--bg-base)' }}>
      {children}
    </th>
  )
  const dash = <span style={{ color:'var(--text-muted)' }}>—</span>

  const td = 'px-2 py-2'

  return (
    <div className="overflow-x-auto rounded-xl" style={{ border:'1px solid var(--border)' }}>
      <table className="min-w-[900px] w-full text-[12px] border-collapse">
        <thead>
          <tr>
            <TH>Altura (m)</TH><TH>Orientación</TH><TH>Tipo Antena / Equipo</TH>
            <TH center>Cant.</TH><TH center>Alto</TH><TH center>Diám.</TH>
            <TH center>Ancho</TH><TH center>Prof.</TH>
            <TH center>Área M²</TH><TH>Carrier</TH><TH>Comentario</TH>
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr><td colSpan={11} className="px-4 py-8 text-center text-[12px] italic" style={{ color:'var(--text-muted)' }}>Sin equipos registrados</td></tr>
          ) : items.map((row, i) => {
            const isMW   = row.tipoEquipo === 'MW'
            const pk     = (field) => `${keyPrefix}|||${i}|||${field}`
            const cur    = (field) => pk(field) in pendingEdits ? pendingEdits[pk(field)] : (row[field] ?? '')
            const isMWc  = (pendingEdits[pk('tipoEquipo')] ?? row.tipoEquipo) === 'MW'

            if (editMode) {
              return (
                <tr key={i} style={{ borderTop:'1px solid var(--border-light)', background: i%2===0?'var(--bg-card)':'var(--bg-base)' }}>
                  <td className={td}>
                    <EditCell fieldKey={pk('alturaMts')} value={row.alturaMts} type="number" pendingEdits={pendingEdits} onChange={onChange} minW={60} />
                  </td>
                  <td className={td}>
                    <EditCell fieldKey={pk('orientacion')} value={row.orientacion} type="select" options={ORIENT_OPTS} pendingEdits={pendingEdits} onChange={onChange} minW={90} />
                  </td>
                  <td className={td}>
                    <EditCell fieldKey={pk('tipoEquipo')} value={row.tipoEquipo} type="select" options={TIPO_OPTS} pendingEdits={pendingEdits} onChange={onChange} minW={90} />
                  </td>
                  <td className={td}>
                    <EditCell fieldKey={pk('cantidad')} value={row.cantidad} type="number" pendingEdits={pendingEdits} onChange={onChange} minW={50} />
                  </td>
                  {/* Alto — solo no-MW */}
                  <td className={td}>
                    {!isMWc
                      ? <EditCell fieldKey={pk('alto')} value={row.alto} type="number" pendingEdits={pendingEdits} onChange={onChange} minW={55} />
                      : <span className="text-center block text-[10px]" style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Diám. — solo MW */}
                  <td className={td}>
                    {isMWc
                      ? <EditCell fieldKey={pk('alto')} value={row.alto} type="number" pendingEdits={pendingEdits} onChange={onChange} minW={55} />
                      : <span className="text-center block text-[10px]" style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Ancho — solo no-MW */}
                  <td className={td}>
                    {!isMWc
                      ? <EditCell fieldKey={pk('ancho')} value={row.ancho} type="number" pendingEdits={pendingEdits} onChange={onChange} minW={55} />
                      : <span className="text-center block text-[10px]" style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Prof. — solo no-MW */}
                  <td className={td}>
                    {!isMWc
                      ? <EditCell fieldKey={pk('profundidad')} value={row.profundidad} type="number" pendingEdits={pendingEdits} onChange={onChange} minW={55} />
                      : <span className="text-center block text-[10px]" style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Área — calculada, readonly */}
                  <td className="px-3 py-2 text-center">
                    <span className="text-[11px] font-mono font-semibold" style={{ color:'var(--text-muted)' }}>
                      {calcArea(cur('alto'), cur('ancho'), cur('tipoEquipo') || row.tipoEquipo)}
                    </span>
                  </td>
                  <td className={td}>
                    <EditCell fieldKey={pk('carrier')} value={row.carrier} type="text" pendingEdits={pendingEdits} onChange={onChange} minW={70} />
                  </td>
                  <td className={td}>
                    <EditCell fieldKey={pk('comentario')} value={row.comentario} type="text" pendingEdits={pendingEdits} onChange={onChange} minW={90} />
                  </td>
                </tr>
              )
            }

            return (
              <tr key={i} style={{ background: i%2===0?'var(--bg-card)':'var(--bg-base)', borderTop:'1px solid var(--border-light)' }}>
                <td className="px-3 py-2.5 font-mono font-bold text-[12px]" style={{ color: accent }}>{vd(row.alturaMts)}</td>
                <td className="px-3 py-2.5" style={{ color:'var(--text-secondary)' }}>{vd(row.orientacion)}</td>
                <td className="px-3 py-2.5 font-medium" style={{ color:'var(--text-primary)' }}>{vd(row.tipoEquipo)}</td>
                <td className="px-3 py-2.5 text-center font-mono" style={{ color:'var(--text-secondary)' }}>{vd(row.cantidad)}</td>
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color:'var(--text-secondary)' }}>{isMW ? dash : vd(row.alto)}</td>
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color:'var(--text-secondary)' }}>{isMW ? vd(row.alto) : dash}</td>
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color:'var(--text-secondary)' }}>{isMW ? dash : vd(row.ancho)}</td>
                <td className="px-3 py-2.5 text-center font-mono text-[11px]" style={{ color:'var(--text-secondary)' }}>{isMW ? dash : vd(row.profundidad)}</td>
                <td className="px-3 py-2.5 text-center font-mono text-[11px] font-semibold" style={{ color:'var(--text-muted)' }}>
                  {calcArea(row.alto, row.ancho, row.tipoEquipo)}
                </td>
                <td className="px-3 py-2.5">
                  {v(row.carrier) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{ background:`${accent}12`, color: accent }}>{row.carrier}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[11px] max-w-[120px] truncate" style={{ color:'var(--text-muted)' }}>{vd(row.comentario)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Photo grid ────────────────────────────────────────────────────────────────
function PhotoGrid({ photos, showEmpty = false, editMode = false, onUpload, onDelete }) {
  // photos: array of [label, url, assetType]
  const real = photos.filter(([, url]) => url)
  // In editMode always show all slots so user can upload/delete
  const toRender = (editMode || showEmpty) ? photos : real
  if (!toRender.length && !editMode) return null

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Camera size={11} style={{ color:'var(--text-muted)' }} />
        <span className="text-[9.5px] font-bold uppercase tracking-[0.08em]" style={{ color:'var(--text-muted)' }}>
          Registro fotográfico
        </span>
        {real.length < photos.length && !editMode && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-1"
            style={{ background:'var(--bg-base)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
            {real.length}/{photos.length} fotos
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {toRender.map(([label, url, assetType], i) => (
          <div key={i} className="space-y-1.5">
            <div className="text-[10px] font-medium truncate" style={{ color:'var(--text-muted)' }}>{label}</div>
            <div className="relative group aspect-video rounded-xl overflow-hidden flex items-center justify-center"
              style={{ border: url ? '1px solid var(--border)' : '2px dashed var(--border)', background:'var(--bg-base)' }}>

              {/* Photo or placeholder */}
              {url
                ? <img src={url} alt={label} className="w-full h-full object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling.style.display = 'flex'
                    }} />
                : null}

              {/* Broken URL fallback */}
              {url
                ? <div style={{ display:'none' }} className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <AlertCircle size={16} style={{ color:'var(--text-muted)' }} />
                    <span className="text-[9px]" style={{ color:'var(--text-muted)' }}>No disponible</span>
                  </div>
                : <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                    <Grid3x3 size={16} style={{ color:'var(--border)' }} />
                    <span className="text-[9px]" style={{ color:'var(--text-muted)' }}>Sin foto</span>
                  </div>}

              {/* Edit mode controls — always visible on mobile/touch */}
              {editMode && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-1.5"
                  style={{ background:'rgba(0,0,0,0.55)' }}>
                  <label className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                    style={{ background:'white' }} title={url ? 'Reemplazar foto' : 'Subir foto'}>
                    <Upload size={13} style={{ color:'#0284C7' }} />
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f && assetType) onUpload?.(f, assetType)
                        e.target.value = ''
                      }} />
                  </label>
                  {url && (
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background:'white' }} title="Eliminar foto"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar foto "${label}"? Esta acción no se puede deshacer.`)) {
                          onDelete?.(assetType)
                        }
                      }}>
                      <Trash2 size={13} style={{ color:'#EF4444' }} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background:'var(--border)' }} />
      <span className="text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color:'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background:'var(--border)' }} />
    </div>
  )
}

// ── Cliente en piso ───────────────────────────────────────────────────────────
function FloorClientCard({ cliente, index, editMode, pendingEdits, onChange }) {
  const isAncla = (pendingEdits[`piso|||${index}|||tipoCliente`] ?? cliente.tipoCliente) === 'ancla'
  const accent  = isAncla ? '#0EA5E9' : '#7C3AED'
  const label   = isAncla ? 'Cliente Ancla' : 'Cliente Colo'

  const pk = (f) => `piso|||${index}|||${f}`
  const gpk = (gi, f) => `piso|||${index}|||gab|||${gi}|||${f}`

  return (
    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--border)', borderLeft:`3px solid ${accent}` }}>
      <div className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ background:'var(--bg-base)', borderBottom:'1px solid var(--border-light)' }}>
        <span className="text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
          style={{ background:`${accent}14`, color: accent }}>{label}</span>
        {editMode ? (
          <select className={inpCls(false)} style={{ maxWidth:120 }}
            value={pendingEdits[pk('tipoCliente')] ?? cliente.tipoCliente ?? 'colo'}
            onChange={e => onChange(pk('tipoCliente'), e.target.value)}>
            {TIPO_CLI_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : null}
        {!editMode && cliente.nombreCliente && (
          <span className="text-[13px] font-semibold" style={{ color:'var(--text-primary)' }}>{cliente.nombreCliente}</span>
        )}
        {editMode && (
          <input className={inpCls(pk('nombreCliente') in pendingEdits)} style={{ maxWidth:200 }}
            value={pendingEdits[pk('nombreCliente')] ?? (cliente.nombreCliente || '')}
            onChange={e => onChange(pk('nombreCliente'), e.target.value)}
            placeholder="Nombre del cliente" />
        )}
        <span className="ml-auto text-[10px] font-mono" style={{ color:'var(--text-muted)' }}>#{index+1}</span>
      </div>

      <div className="px-4 py-3 space-y-3" style={{ background:'var(--bg-card)' }}>
        {editMode ? (
          <div className="flex gap-6 flex-wrap">
            {[
              ['Área Arrendada', pk('areaArrendada'), cliente.areaArrendada, 'number'],
              ['Área en Uso',    pk('areaEnUso'),     cliente.areaEnUso,     'number'],
              ['Placa Equipos',  pk('placaEquipos'),  cliente.placaEquipos,  'text'],
            ].map(([lbl, key, val, type]) => (
              <div key={key}>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.07em] mb-1" style={{ color:'var(--text-muted)' }}>{lbl}</div>
                <input type={type} className={inpCls(key in pendingEdits)} style={{ width:100 }}
                  value={pendingEdits[key] ?? (val || '')}
                  onChange={e => onChange(key, e.target.value)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-6">
            {[['Área Arrendada', cliente.areaArrendada], ['Área en Uso', cliente.areaEnUso], ['Placa Equipos', cliente.placaEquipos]]
              .filter(([, val]) => v(val)).map(([lbl, val]) => (
                <div key={lbl}>
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.07em] mb-0.5" style={{ color:'var(--text-muted)' }}>{lbl}</div>
                  <div className="text-[13px] font-mono font-semibold" style={{ color:'var(--text-primary)' }}>{val}</div>
                </div>
            ))}
          </div>
        )}

        {/* Gabinetes */}
        {cliente.gabinetes && cliente.gabinetes.length > 0 && (
          <div className="overflow-x-auto rounded-lg" style={{ border:'1px solid var(--border)' }}>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  {['Gabinete','Largo','Ancho','Alto','Foto #'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9.5px] font-bold uppercase tracking-[0.07em]"
                      style={{ color:'var(--text-muted)', borderBottom:`2px solid ${accent}`, background:'var(--bg-base)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cliente.gabinetes.map((g, gi) => (
                  <tr key={gi} style={{ background: gi%2===0?'var(--bg-card)':'var(--bg-base)', borderTop:'1px solid var(--border-light)' }}>
                    {editMode ? (
                      <>
                        {[['gabinete','text'],['largo','number'],['ancho','number'],['alto','number'],['fotoRef','text']].map(([f, type]) => (
                          <td key={f} className="px-2 py-1.5">
                            <EditCell fieldKey={gpk(gi,f)} value={g[f]} type={type}
                              pendingEdits={pendingEdits} onChange={onChange} minW={f==='gabinete'?80:50} />
                          </td>
                        ))}
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium" style={{ color:'var(--text-primary)' }}>{vd(g.gabinete)}</td>
                        <td className="px-3 py-2 font-mono text-[10px]" style={{ color:'var(--text-secondary)' }}>{vd(g.largo)}</td>
                        <td className="px-3 py-2 font-mono text-[10px]" style={{ color:'var(--text-secondary)' }}>{vd(g.ancho)}</td>
                        <td className="px-3 py-2 font-mono text-[10px]" style={{ color:'var(--text-secondary)' }}>{vd(g.alto)}</td>
                        <td className="px-3 py-2 text-[10px]" style={{ color:'var(--text-muted)' }}>{vd(g.fotoRef)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Carrier card ──────────────────────────────────────────────────────────────
const CA = '#7C3AED'
function CarrierCard({ carrier, index, assetPhotoMap, editMode, pendingEdits, onChange, onPhotoUpload, onPhotoDelete }) {
  const pk    = (f) => `carrier|||${index}|||${f}`
  const name  = pendingEdits[pk('nombre')] ?? (carrier.nombre || `Carrier ${index + 1}`)
  const f1    = assetPhotoMap?.[`carrier:${index}:foto1`] || carrier.foto1
  const f2    = assetPhotoMap?.[`carrier:${index}:foto2`] || carrier.foto2
  const f3    = assetPhotoMap?.[`carrier:${index}:foto3`] || carrier.foto3

  return (
    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid var(--border)', borderLeft:`3px solid ${CA}` }}>
      <div className="flex items-center gap-3 px-4 py-2.5"
        style={{ background:'var(--bg-base)', borderBottom:'1px solid var(--border-light)' }}>
        <Radio size={12} style={{ color: CA }} />
        {editMode ? (
          <input className={inpCls(pk('nombre') in pendingEdits)} style={{ maxWidth:220 }}
            value={pendingEdits[pk('nombre')] ?? (carrier.nombre || '')}
            onChange={e => onChange(pk('nombre'), e.target.value)}
            placeholder="Nombre del carrier" />
        ) : (
          <span className="font-bold text-[13px]" style={{ color:'var(--text-primary)' }}>{name}</span>
        )}
        <span className="ml-auto text-[10px] font-mono" style={{ color:'var(--text-muted)' }}>Carrier #{index+1}</span>
      </div>
      <div className="p-4 space-y-4" style={{ background:'var(--bg-card)' }}>
        <InventoryTable
          items={carrier.items} accent={CA}
          editMode={editMode} pendingEdits={pendingEdits} onChange={onChange}
          keyPrefix={`carrier|||${index}|||item`}
        />
        <PhotoGrid
          editMode={editMode}
          onUpload={onPhotoUpload}
          onDelete={onPhotoDelete}
          photos={[
            [`Foto 1 — ${name}`, f1, `carrier:${index}:foto1`],
            [`Foto 2 — ${name}`, f2, `carrier:${index}:foto2`],
            [`Foto 3 — ${name}`, f3, `carrier:${index}:foto3`],
          ]}
        />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EquipmentV2Detail({ submission, assets, editMode = false, pendingEdits = {}, onFieldChange, onPhotoUpload, onPhotoDelete }) {
  const raw      = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const siteInfo = raw.siteInfo  || {}
  const torre    = raw.torre     || {}
  const piso     = raw.piso      || {}
  const fotos    = raw.fotos     || {}
  const carriers = raw.carriers  || []

  const assetPhotoMap = {}
  if (assets) assets.forEach(a => {
    const key = a.asset_type || a.type || a.meta?.field || ''
    const url = a.public_url || a.storage_url || a.url
    if (key && url) assetPhotoMap[key] = url
  })

  const fD = assetPhotoMap['equipmentV2:fotoDistribucionTorre'] || fotos.fotoDistribucionTorre
  const fT = assetPhotoMap['equipmentV2:fotoTorreCompleta']     || fotos.fotoTorreCompleta
  const fC = assetPhotoMap['equipmentV2:fotoCroquisEdificio']   || fotos.fotoCroquisEdificio
  const fP = assetPhotoMap['equipmentV2:fotoPlanoPlanta']       || fotos.fotoPlanoPlanta

  const ep = editMode ? pendingEdits : {}
  const oc = editMode ? onFieldChange : () => {}

  return (
    <div className="space-y-3">

      <Panel icon={MapPin} title="Datos del Sitio" accent="#0284C7" ghostNum="01">
        <SiteInfoGrid info={siteInfo} editMode={editMode} pendingEdits={ep} onChange={oc} />
      </Panel>

      <Panel icon={Package} title="Inventario de Equipos en Torre" accent="#DC2626" ghostNum="02">
        <div className="space-y-4">
          <InventoryTable items={torre.items} accent="#DC2626"
            editMode={editMode} pendingEdits={ep} onChange={oc}
            keyPrefix="torre|||item" />
          {(fD || fT || fC || editMode) && (
            <>
              <Divider label="Registro fotográfico" />
              <PhotoGrid
                editMode={editMode}
                onUpload={onPhotoUpload}
                onDelete={onPhotoDelete}
                photos={[
                  ['Distribución en torre', fD, 'equipmentV2:fotoDistribucionTorre'],
                  ['Torre completa',        fT, 'equipmentV2:fotoTorreCompleta'],
                  ['Croquis del edificio',  fC, 'equipmentV2:fotoCroquisEdificio'],
                ]}
              />
            </>
          )}
        </div>
      </Panel>

      {(piso.clientes?.length > 0 || fP) && (
        <Panel icon={Building2} title="Inventario de Equipos en Piso" accent="#0EA5E9" ghostNum="03">
          <div className="space-y-3">
            {(piso.clientes || []).map((c, i) => (
              <FloorClientCard key={i} cliente={c} index={i}
                editMode={editMode} pendingEdits={ep} onChange={oc} />
            ))}
            {(fP || editMode) && (
              <>
                <Divider label="Plano de planta y equipos" />
                <PhotoGrid
                  editMode={editMode}
                  onUpload={onPhotoUpload}
                  onDelete={onPhotoDelete}
                  photos={[['Plano de planta', fP, 'equipmentV2:fotoPlanoPlanta']]}
                />
              </>
            )}
          </div>
        </Panel>
      )}

      {carriers.length > 0 && (
        <Panel icon={Radio} title="Carriers" badge={`${carriers.length} carrier${carriers.length!==1?'s':''}`} accent="#7C3AED" ghostNum="04">
          <div className="space-y-3">
            {carriers.map((c, i) => (
              <CarrierCard key={i} carrier={c} index={i} assetPhotoMap={assetPhotoMap}
                editMode={editMode} pendingEdits={ep} onChange={oc}
                onPhotoUpload={onPhotoUpload} onPhotoDelete={onPhotoDelete} />
            ))}
          </div>
        </Panel>
      )}

    </div>
  )
}
