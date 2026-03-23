import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Building2, Check, X, ToggleLeft, ToggleRight, MapPin, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'
import { useAdminStore } from '../../store/useAdminStore'
import { q } from '../../lib/dbUtils'

const COUNTRIES = ['CR','PA','MX','CO','PR','GT','SV','HN','NI','DO']
const onFocusIn  = e => { e.target.style.borderColor='#0284C7'; e.target.style.boxShadow='0 0 0 3px rgba(2,132,199,.15)' }
const onFocusOut = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }

function CompanyModal({ company, allRegions, onSave, onClose }) {
  const initialRegions = company?.company_regions?.map(cr => cr.region_id) || []
  const [form, setForm] = useState({
    name:     company?.name     || '',
    org_code: company?.org_code || '',
    country:  company?.country  || 'CR',
    active:   company?.active   ?? true,
  })
  const [selectedRegions, setSelectedRegions] = useState(initialRegions)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const isNew = !company?.id

  const toggleRegion = id => setSelectedRegions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const save = async () => {
    if (!form.name.trim() || !form.org_code.trim()) { setError('Nombre y código son obligatorios'); return }
    setSaving(true); setError('')
    try {
      const payload = { name: form.name.trim(), org_code: form.org_code.trim().toUpperCase(), country: form.country, active: form.active }
      let companyId = company?.id
      if (isNew) {
        const { data, error: err } = await q(supabase.from('companies').insert(payload).select('id').single())
        if (err) { setError(err.message); return }
        companyId = data.id
      } else {
        const { error: err } = await q(supabase.from('companies').update(payload).eq('id', companyId))
        if (err) { setError(err.message); return }
      }
      const { error: delErr } = await q(supabase.from('company_regions').delete().eq('company_id', companyId))
      if (delErr) { setError(delErr.message); return }
      if (selectedRegions.length > 0) {
        const { error: insErr } = await q(supabase.from('company_regions').insert(selectedRegions.map(region_id => ({ company_id: companyId, region_id }))))
        if (insErr) { setError(insErr.message); return }
      }
      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Escape key
  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleDelete = async () => {
    if (!company?.id) return
    if (!window.confirm(`¿Eliminar empresa "${company.name}"? Esta acción eliminará también sus asociaciones de regiones.`)) return
    setSaving(true)
    try {
      await q(supabase.from('company_regions').delete().eq('company_id', company.id))
      const { error: err } = await q(supabase.from('companies').delete().eq('id', company.id))
      if (err) { setError(err.message); return }
      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }} onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
          <h2 className="text-[15px] font-semibold th-text-p">{isNew ? 'Nueva empresa' : 'Editar empresa'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg th-text-m" style={{ background:'var(--bg-base)' }}><X size={15}/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background:'rgba(239,68,68,0.08)', color:'#dc2626', border:'1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          {[
            { label:'Nombre de la empresa', key:'name', placeholder:'Ej: PTI Costa Rica' },
            { label:'Código org (org_code)', key:'org_code', placeholder:'Ej: PTI-CR', mono:true },
          ].map(({ label, key, placeholder, mono }) => (
            <div key={key}>
              <label className="block text-[11px] font-semibold th-text-m uppercase tracking-wide mb-1.5">{label}</label>
              <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={placeholder}
                className="w-full rounded-lg px-3 py-2 text-[13px] th-text-p th-bg-input"
                style={{ border:'1px solid var(--border)', fontFamily:mono?'var(--font-mono)':'inherit', outline:'none' }}
                onFocus={onFocusIn} onBlur={onFocusOut}/>
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold th-text-m uppercase tracking-wide mb-1.5">País</label>
            <select value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}
              className="w-full rounded-lg px-3 py-2 text-[13px] th-text-p th-bg-input"
              style={{ border:'1px solid var(--border)', outline:'none' }}>
              {COUNTRIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold th-text-m uppercase tracking-wide mb-1.5">
              Regiones / Sitios asociados <span className="normal-case font-normal">(selecciona uno o varios)</span>
            </label>
            {allRegions.filter(r=>r.active).length === 0 ? (
              <div className="px-3 py-3 rounded-lg text-[12px] th-text-m text-center" style={{ border:'1px dashed var(--border)' }}>
                No hay regiones activas. Crea una en la sección Regiones primero.
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden" style={{ border:'1px solid var(--border)', maxHeight:180, overflowY:'auto' }}>
                {allRegions.filter(r=>r.active).map((r,i) => {
                  const sel = selectedRegions.includes(r.id)
                  return (
                    <button key={r.id} type="button" onClick={()=>toggleRegion(r.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                      style={{ borderTop:i>0?'1px solid var(--border-light)':'none', background:sel?'rgba(2,132,199,0.06)':'transparent' }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ border:sel?'2px solid #0284C7':'2px solid var(--border)', background:sel?'#0284C7':'transparent' }}>
                        {sel && <Check size={10} color="white" strokeWidth={3}/>}
                      </div>
                      <span className="text-[13px] th-text-p">{r.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {selectedRegions.length > 0 && (
              <p className="mt-1 text-[11px] th-text-m">{selectedRegions.length} región{selectedRegions.length!==1?'es':''} seleccionada{selectedRegions.length!==1?'s':''}</p>
            )}
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[13px] th-text-p">Estado activo</span>
            <button onClick={()=>setForm(f=>({...f,active:!f.active}))}>
              {form.active ? <ToggleRight size={24} style={{ color:'#0284C7' }}/> : <ToggleLeft size={24} className="th-text-m"/>}
            </button>
          </div>
        </div>
        <div className="px-5 py-4 flex gap-2 justify-end flex-shrink-0" style={{ borderTop:'1px solid var(--border-light)' }}>
          {!isNew && (
            <button onClick={handleDelete} disabled={saving}
              className="h-9 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 mr-auto disabled:opacity-50"
              style={{ color:'#dc2626', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={13}/>Eliminar
            </button>
          )}
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] th-text-s" style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>Cancelar</button>
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 flex items-center gap-1.5" style={{ background:'#0284C7' }}>
            {saving ? <><Spinner size={13}/>Guardando…</> : <><Check size={13}/>Guardar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Companies() {
  const companies           = useAdminStore(s => s.companies)
  const regions             = useAdminStore(s => s.regions)
  const loading             = useAdminStore(s => s.companiesLoading)
  const storeError          = useAdminStore(s => s.companiesError)
  const loadCompanies       = useAdminStore(s => s.loadCompanies)
  const loadRegions         = useAdminStore(s => s.loadRegions)
  const invalidateCompanies = useAdminStore(s => s.invalidateCompanies)
  const invalidateRegions   = useAdminStore(s => s.invalidateRegions)
  const [modal, setModal]   = useState(null)

  useEffect(() => { loadCompanies(); loadRegions() }, [])

  const retry = () => { invalidateCompanies(); invalidateRegions(); loadCompanies(true); loadRegions(true) }

  const onSave = () => {
    setModal(null)
    invalidateCompanies(); invalidateRegions()
    loadCompanies(true); loadRegions(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-bold th-text-p">Empresas</h1>
          <p className="text-[12px] th-text-m mt-0.5">{companies.length} empresa{companies.length!==1?'s':''} registrada{companies.length!==1?'s':''}</p>
        </div>
        <button onClick={()=>setModal('new')} className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5" style={{ background:'#0284C7' }}>
          <Plus size={14}/>Nueva empresa
        </button>
      </div>

      {storeError && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-[13px]"
          style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626' }}>
          <span>⚠️ {storeError}</span>
          <button onClick={retry} className="px-3 py-1 rounded-lg text-[12px] font-semibold"
            style={{ background:'#dc2626', color:'#fff' }}>Reintentar</button>
        </div>
      )}
      {loading && companies.length === 0 ? (
        <div className="flex justify-center py-16"><Spinner size={16}/></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[400px]" style={{ borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border-light)' }}>
                {[{l:'Empresa',x:''},{l:'Código',x:'hidden sm:table-cell'},{l:'País',x:'hidden md:table-cell'},{l:'Regiones',x:'hidden sm:table-cell'},{l:'Estado',x:''},{l:'',x:''}].map(({l,x})=>(
                  <th key={l} className={`px-4 py-3 text-left text-[11px] font-semibold th-text-m uppercase tracking-wider ${x}`}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c,i)=>(
                <tr key={c.id}
                  style={{ borderBottom:i<companies.length-1?'1px solid var(--border-light)':'none' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--row-hover-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:'#e0f2fe' }}>
                        <Building2 size={14} style={{ color:'#0369a1' }}/>
                      </div>
                      <span className="font-semibold th-text-p">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] px-2 py-1 rounded" style={{ background:'var(--bg-base)', color:'var(--text-secondary)' }}>{c.org_code}</span>
                  </td>
                  <td className="px-4 py-3 th-text-s">{c.country}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {!c.company_regions?.length ? (
                      <span className="text-[11px] th-text-m italic">Sin regiones</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {c.company_regions.slice(0,3).map(cr=>(
                          <span key={cr.region_id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ background:'#0284C714', color:'#0284C7' }}>
                            <MapPin size={9}/>{cr.regions?.name}
                          </span>
                        ))}
                        {c.company_regions.length>3 && <span className="text-[10px] th-text-m self-center">+{c.company_regions.length-3}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full"
                      style={c.active?{background:'#f0fdf4',color:'#166534'}:{background:'var(--bg-base)',color:'var(--text-muted)'}}>
                      {c.active?'Activa':'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={()=>setModal(c)} className="p-1.5 rounded-lg th-text-m transition-colors" style={{ background:'var(--bg-base)' }}
                      onMouseEnter={e=>e.currentTarget.style.color='#0284C7'} onMouseLeave={e=>e.currentTarget.style.color=''}>
                      <Pencil size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
              {!companies.length && (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-[13px] th-text-m">Sin empresas registradas</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {modal && (
        <CompanyModal
          company={modal==='new'?null:modal}
          allRegions={regions}
          onSave={onSave}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  )
}
