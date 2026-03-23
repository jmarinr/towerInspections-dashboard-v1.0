import { useState, useEffect } from 'react'
import React from 'react'
import { Plus, Pencil, MapPin, ToggleLeft, ToggleRight, X, Check, Trash2,
         ChevronDown, ChevronRight, Building2, Search } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { waitForSdkReady } from '../../lib/sdkReady'
import Spinner from '../../components/ui/Spinner'
import { useAdminStore } from '../../store/useAdminStore'
import { q } from '../../lib/dbUtils'

// ── Modal región ──────────────────────────────────────────────────────────────
function RegionModal({ region, onSave, onClose }) {
  const [name, setName] = useState(region?.name || '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const isNew = !region?.id

  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleDelete = async () => {
    if (!region?.id) return
    if (!window.confirm(`¿Eliminar la región "${region.name}"? Esto también eliminará todos sus sitios.`)) return
    setSaving(true)
    await waitForSdkReady(5000)
    try {
      await q(supabase.from('sites').delete().eq('region_id', region.id))
      const { error: err } = await q(supabase.from('regions').delete().eq('id', region.id))
      if (err) { setError(err.message); return }
      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    await waitForSdkReady(5000)
    try {
      const { error: err } = await q(isNew
        ? supabase.from('regions').insert({ name: name.trim() })
        : supabase.from('regions').update({ name: name.trim() }).eq('id', region.id))
      if (err) { setError(err.message); return }
      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div data-modal="open" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4" style={{ background:'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col max-h-[80dvh] sm:max-h-[85dvh]" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <h2 className="text-[15px] font-semibold th-text-p">{isNew ? 'Nueva región' : 'Editar región'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg th-text-m" style={{ background:'var(--bg-base)' }}><X size={15}/></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          {error && <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background:'rgba(239,68,68,0.08)', color:'#dc2626', border:'1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <div>
            <label className="block text-[11px] font-semibold th-text-m uppercase tracking-wider mb-1.5">Nombre de la región <span style={{ color:'#dc2626' }}>*</span></label>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="Ej: Región Central"
              className="w-full px-3 py-2 text-[13px] rounded-lg th-text-p"
              style={{ border:'1px solid var(--border)', background:'var(--bg-input)', outline:'none' }}
              onKeyDown={e=>e.key==='Enter'&&save()} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop:'1px solid var(--border-light)' }}>
          {!isNew && (
            <button onClick={handleDelete} disabled={saving}
              className="h-9 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 mr-auto disabled:opacity-50"
              style={{ color:'#dc2626', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={13}/>Eliminar región
            </button>
          )}
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] th-text-s" style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>Cancelar</button>
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 flex items-center gap-1.5" style={{ background:'#0284C7' }}>
            {saving ? <><Spinner size={13}/>Guardando…</> : <><Check size={13}/>{isNew ? 'Crear' : 'Guardar'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal sitio ───────────────────────────────────────────────────────────────
function SiteModal({ site, regionId, onSave, onClose }) {
  const [form, setForm] = useState({
    site_id:  site?.site_id  || '',
    name:     site?.name     || '',
    lat:      site?.lat      ?? '',
    lng:      site?.lng      ?? '',
    height_m: site?.height_m ?? '',
    province: site?.province || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const isNew = !site?.id
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleDelete = async () => {
    if (!site?.id) return
    if (!window.confirm(`¿Eliminar el sitio "${site.name}" (${site.site_id})?`)) return
    setSaving(true)
    await waitForSdkReady(5000)
    try {
      const { error: err } = await q(supabase.from('sites').delete().eq('id', site.id))
      if (err) { setError(err.message); return }
      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!form.site_id.trim()) { setError('El ID de sitio es obligatorio'); return }
    if (!form.name.trim())    { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    await waitForSdkReady(5000)
    try {
      const payload = {
        region_id: regionId,
        site_id:   form.site_id.trim().toUpperCase(),
        name:      form.name.trim(),
        lat:       form.lat      !== '' ? parseFloat(form.lat)      : null,
        lng:       form.lng      !== '' ? parseFloat(form.lng)      : null,
        height_m:  form.height_m !== '' ? parseFloat(form.height_m) : null,
        province:  form.province.trim() || null,
      }
      const { error: err } = await q(isNew
        ? supabase.from('sites').insert(payload)
        : supabase.from('sites').update(payload).eq('id', site.id))
      if (err) { setError(err.message); return }
      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-[13px] rounded-lg th-text-p'
  const inputSty = { border:'1px solid var(--border)', background:'var(--bg-input)', outline:'none' }
  const lbl = txt => <label className="block text-[11px] font-semibold th-text-m uppercase tracking-wider mb-1">{txt}</label>

  return (
    <div data-modal="open" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4" style={{ background:'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl max-h-[80dvh] sm:max-h-[85dvh] flex flex-col" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom:'1px solid var(--border)' }}>
          <h2 className="text-[15px] font-semibold th-text-p">{isNew ? 'Nuevo sitio' : 'Editar sitio'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg th-text-m" style={{ background:'var(--bg-base)' }}><X size={15}/></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background:'rgba(239,68,68,0.08)', color:'#dc2626', border:'1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              {lbl('ID Sitio *')}
              <input className={inputCls} style={inputSty} value={form.site_id} onChange={e=>f('site_id',e.target.value)} placeholder="PA-CC-1036" />
            </div>
            <div>
              {lbl('Provincia')}
              <input className={inputCls} style={inputSty} value={form.province} onChange={e=>f('province',e.target.value)} placeholder="Coclé" />
            </div>
          </div>
          <div>
            {lbl('Nombre del sitio *')}
            <input className={inputCls} style={inputSty} value={form.name} onChange={e=>f('name',e.target.value)} placeholder="PENONOME CENTRO A" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              {lbl('Latitud')}
              <input type="number" step="any" className={inputCls} style={inputSty} value={form.lat} onChange={e=>f('lat',e.target.value)} placeholder="8.514" />
            </div>
            <div>
              {lbl('Longitud')}
              <input type="number" step="any" className={inputCls} style={inputSty} value={form.lng} onChange={e=>f('lng',e.target.value)} placeholder="-80.359" />
            </div>
            <div>
              {lbl('Altura (m)')}
              <input type="number" step="any" className={inputCls} style={inputSty} value={form.height_m} onChange={e=>f('height_m',e.target.value)} placeholder="24" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop:'1px solid var(--border-light)' }}>
          {!isNew && (
            <button onClick={handleDelete} disabled={saving}
              className="h-9 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 mr-auto disabled:opacity-50"
              style={{ color:'#dc2626', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={13}/>Eliminar sitio
            </button>
          )}
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] th-text-s" style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>Cancelar</button>
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 flex items-center gap-1.5" style={{ background:'#0284C7' }}>
            {saving ? <><Spinner size={13}/>Guardando…</> : <><Check size={13}/>{isNew ? 'Crear sitio' : 'Guardar'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de región con lista de sitios ────────────────────────────────────────
function RegionCard({ region, onEditRegion, onRefresh }) {
  const [open,       setOpen]       = useState(false)
  const [siteModal,  setSiteModal]  = useState(null) // null | 'new' | site-obj
  const [search,     setSearch]     = useState('')

  const sites = region.sites || []
  const filtered = sites.filter(s =>
    !search ||
    s.site_id.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.province||'').toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (site) => {
    const { error } = await q(supabase.from('sites').update({ active: !site.active }).eq('id', site.id))
    if (!error) onRefresh()
  }

  const companies = region.company_regions || []

  return (
    <div className="rounded-xl overflow-hidden" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderLeft:'3px solid #0284C7' }}>
      {/* Header región */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open ? <ChevronDown size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/> : <ChevronRight size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>}
          <MapPin size={14} style={{ color:'#0284C7', flexShrink:0 }}/>
          <span className="font-semibold text-[14px] th-text-p">{region.name}</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md flex-shrink-0"
            style={{ background:'#0284C714', color:'#0284C7' }}>
            {sites.length} sitio{sites.length!==1?'s':''}
          </span>
        </button>

        {/* Empresas asociadas */}
        <div className="hidden md:flex items-center gap-1">
          {companies.slice(0,3).map(cr=>(
            <span key={cr.company_id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background:'var(--bg-base)', border:'1px solid var(--border)', color:'var(--text-secondary)' }}>
              <Building2 size={9}/>{cr.companies?.org_code}
            </span>
          ))}
          {companies.length>3&&<span className="text-[10px] th-text-m">+{companies.length-3}</span>}
          {companies.length===0&&<span className="text-[10px] th-text-m italic">Sin empresas</span>}
        </div>

        {/* Estado y acciones */}
        <button onClick={()=>onEditRegion(region)}
          className="p-1.5 rounded-lg th-text-m transition-colors"
          style={{ border:'1px solid var(--border)' }}
          title="Editar región">
          <Pencil size={13}/>
        </button>
        <button onClick={()=>setOpen(o=>!o)}
          className="hidden md:flex h-7 px-2.5 rounded-lg items-center gap-1 text-[11px] font-semibold text-white"
          style={{ background:'#0284C7' }}
          title="Agregar sitio">
          {open ? null : null}
        </button>
      </div>

      {/* Lista de sitios expandible */}
      {open && (
        <div style={{ borderTop:'1px solid var(--border-light)' }}>
          {/* Barra de búsqueda + botón agregar */}
          <div className="flex items-center gap-2 px-4 py-2.5"
            style={{ background:'var(--bg-base)', borderBottom:'1px solid var(--border-light)' }}>
            <div className="relative flex-1 max-w-xs">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 th-text-m pointer-events-none"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Buscar sitio…"
                className="w-full h-7 pl-7 pr-2 text-[12px] rounded-lg th-text-p"
                style={{ border:'1px solid var(--border)', background:'var(--bg-card)', outline:'none' }}/>
            </div>
            <span className="text-[11px] th-text-m">{filtered.length} de {sites.length}</span>
            <button onClick={()=>setSiteModal('new')}
              className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-white flex items-center gap-1 ml-auto"
              style={{ background:'#0284C7' }}>
              <Plus size={11}/>Agregar sitio
            </button>
          </div>

          {/* Tabla de sitios */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[360px]" style={{ borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-base)', borderBottom:'1px solid var(--border-light)' }}>
                  {[{l:'ID Sitio',x:''},{l:'Nombre',x:''},{l:'Provincia',x:'hidden sm:table-cell'},{l:'Coords',x:'hidden md:table-cell'},{l:'Altura (m)',x:'hidden md:table-cell'},{l:'Estado',x:'hidden sm:table-cell'},{l:'',x:''}].map(({l,x})=>(
                    <th key={l} className={`px-3 py-2 text-left text-[10px] font-semibold th-text-m uppercase tracking-wider ${x}`}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-[12px] th-text-m italic">Sin sitios que coincidan</td></tr>
                ) : filtered.map((s,i)=>(
                  <tr key={s.id} style={{ borderTop:i>0?'1px solid var(--border-light)':'none' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--row-hover-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background:'#0284C714', color:'#0284C7' }}>{s.site_id}</span>
                    </td>
                    <td className="px-3 py-2 th-text-p font-medium max-w-[180px] truncate">{s.name}</td>
                    <td className="px-3 py-2 th-text-s hidden sm:table-cell">{s.province||'—'}</td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {s.lat&&s.lng
                        ? <span className="font-mono text-[10px] th-text-m">{Number(s.lat).toFixed(4)}, {Number(s.lng).toFixed(4)}</span>
                        : <span className="text-[10px] th-text-m italic">Sin coords</span>}
                    </td>
                    <td className="px-3 py-2 font-mono th-text-s hidden md:table-cell">{s.height_m??'—'}</td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <button onClick={()=>toggleActive(s)} className="flex items-center gap-1 text-[11px] font-semibold"
                        style={{ color:s.active?'#16a34a':'var(--text-muted)' }}>
                        {s.active ? <><ToggleRight size={14}/>Activo</> : <><ToggleLeft size={14}/>Inactivo</>}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={()=>setSiteModal(s)} className="p-1 rounded th-text-m"
                        style={{ border:'1px solid var(--border)' }}>
                        <Pencil size={11}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {siteModal && (
        <SiteModal
          site={siteModal==='new'?null:siteModal}
          regionId={region.id}
          onSave={()=>{ setSiteModal(null); onRefresh() }}
          onClose={()=>setSiteModal(null)}
        />
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Regions() {
  const regions           = useAdminStore(s => s.regions)
  const loading           = useAdminStore(s => s.regionsLoading)
  const storeError        = useAdminStore(s => s.regionsError)
  const loadRegions       = useAdminStore(s => s.loadRegions)
  const invalidateRegions = useAdminStore(s => s.invalidateRegions)
  const invalidateCompanies = useAdminStore(s => s.invalidateCompanies)

  const [regionModal, setRegionModal] = useState(null) // null | 'new' | region-obj

  useEffect(() => { loadRegions() }, [])

  const onRefresh = () => { invalidateRegions(); loadRegions(true) }

  const onSaveRegion = () => {
    setRegionModal(null)
    invalidateRegions()
    invalidateCompanies()
    loadRegions(true)
  }

  const totalSites = regions.reduce((acc, r) => acc + (r.sites?.length || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold th-text-p">Regiones</h1>
          <p className="text-[12px] th-text-m mt-0.5">
            {regions.length} región{regions.length!==1?'es':''} · {totalSites} sitio{totalSites!==1?'s':''} en total
          </p>
        </div>
        <button onClick={()=>setRegionModal('new')}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 flex-shrink-0"
          style={{ background:'#0284C7' }}>
          <Plus size={14}/>Nueva región
        </button>
      </div>

      {storeError && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-[13px]"
          style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626' }}>
          <span>⚠️ {storeError}</span>
          <button onClick={onRefresh} className="px-3 py-1 rounded-lg text-[12px] font-semibold"
            style={{ background:'#dc2626', color:'#fff' }}>Reintentar</button>
        </div>
      )}
      {loading && regions.length===0 ? (
        <div className="flex justify-center py-16"><Spinner size={16}/></div>
      ) : regions.length===0 ? (
        <div className="rounded-xl py-16 text-center" style={{ border:'1px dashed var(--border)' }}>
          <MapPin size={24} className="mx-auto mb-3 th-text-m"/>
          <p className="text-[13px] font-semibold th-text-m">Sin regiones registradas</p>
          <p className="text-[12px] th-text-m mt-1">Crea una región para empezar a agregar sitios.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {regions.map(r=>(
            <RegionCard
              key={r.id}
              region={r}
              onEditRegion={region=>setRegionModal(region)}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {regionModal && (
        <RegionModal
          region={regionModal==='new'?null:regionModal}
          onSave={onSaveRegion}
          onClose={()=>setRegionModal(null)}
        />
      )}
    </div>
  )
}
