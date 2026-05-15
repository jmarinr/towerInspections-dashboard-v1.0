import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, X, Check, ToggleLeft, ToggleRight, Trash2, AlertTriangle, Globe, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

import { q } from '../../lib/dbUtils'
import { useAuthStore } from '../../store/useAuthStore'
import { LOG } from '../../lib/logEvent'
import { useAdminStore } from '../../store/useAdminStore'
import Spinner from '../../components/ui/Spinner'

const ROLE_META = {
  admin:      { label:'Admin',      bg:'#0f172a', color:'#e0f2fe' },
  supervisor: { label:'Supervisor', bg:'#e0f2fe', color:'#0369a1' },
  inspector:  { label:'Inspector',  bg:'#f0fdf4', color:'#166534' },
  viewer:     { label:'Viewer',     bg:'#faf5ff', color:'#7e22ce' },
}

function RoleBadge({ role }) {
  const m = ROLE_META[role] || { label:role, bg:'#f1f5f9', color:'#64748b' }
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full"
      style={{ background:m.bg, color:m.color }}>{m.label}</span>
  )
}

function ScopeBadge({ user, regionCount, totalCompanyRegions }) {
  // admin / inspector → no aplica
  if (!user || user.role === 'admin' || user.role === 'inspector') return null

  if (user.scope === 'global') {
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1"
        style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid rgba(239,68,68,0.25)' }}>
        <Globe size={10}/>GLOBAL
      </span>
    )
  }
  if (regionCount === 0) {
    return (
      <span className="text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1"
        style={{ background:'#f0fdf4', color:'#166534' }}>
        <MapPin size={10}/>Todas las regiones
      </span>
    )
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1"
      style={{ background:'#0284C714', color:'#0369a1' }}>
      <MapPin size={10}/>{regionCount} de {totalCompanyRegions} regiones
    </span>
  )
}

// ── Constantes fuera del componente — evitan recreación en cada render ────────
const INPUT_STYLE = {
  border:'1px solid var(--border)', outline:'none',
  width:'100%', borderRadius:8, padding:'0 12px', height:36,
  fontSize:13, background:'var(--bg-input)', color:'var(--text-primary)', fontFamily:'inherit'
}
const onFocusIn  = e => { e.target.style.borderColor='#0284C7'; e.target.style.boxShadow='0 0 0 3px rgba(2,132,199,.15)' }
const onFocusOut = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }

function FieldLabel({ label, children, hint }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold th-text-m uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] th-text-m">{hint}</p>}
    </div>
  )
}

function UserModal({ user, companies, allRegions, onSave, onClose }) {
  const isNew = !user?.id
  const currentUser = useAuthStore(s => s.user)

  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Estado del formulario — v4.13.0 incluye scope y region_ids
  const initialRegionIds = Array.isArray(user?.app_user_regions)
    ? user.app_user_regions.map(r => r.region_id).filter(Boolean)
    : []
  const inferredScope = user?.scope || (user?.company_id ? 'scoped' : 'global')

  const [form, setForm] = useState({
    email:         user?.email         || '',
    full_name:     user?.full_name     || '',
    role:          user?.role          || 'inspector',
    company_id:    user?.company_id    || '',
    supervisor_id: user?.supervisor_id || '',
    active:        user?.active        ?? true,
    scope:         inferredScope,                       // 'global' | 'scoped'
    region_ids:    initialRegionIds,                    // uuid[]
    password:      '',
  })
  const [supervisors, setSupervisors] = useState([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  // ── Regiones disponibles según empresa seleccionada ────────────────────────
  // Las regiones del usuario solo pueden estar dentro de company_regions de su empresa.
  const selectedCompany = useMemo(
    () => companies.find(c => c.id === form.company_id) || null,
    [companies, form.company_id]
  )
  const availableRegions = useMemo(() => {
    if (!selectedCompany?.company_regions) return []
    const ids = selectedCompany.company_regions.map(cr => cr.region_id)
    return allRegions.filter(r => r.active && ids.includes(r.id))
  }, [selectedCompany, allRegions])

  // Si cambia la empresa, limpiar regiones que ya no pertenezcan a la nueva.
  useEffect(() => {
    if (!form.company_id) {
      if (form.region_ids.length > 0) setForm(f => ({ ...f, region_ids: [] }))
      return
    }
    const valid = new Set(availableRegions.map(r => r.id))
    const filtered = form.region_ids.filter(id => valid.has(id))
    if (filtered.length !== form.region_ids.length) {
      setForm(f => ({ ...f, region_ids: filtered }))
    }
  }, [form.company_id, availableRegions])

  // Si cambia el rol, ajustar scope coherente.
  useEffect(() => {
    if (form.role === 'admin') {
      // admin: scope no aplica, company_id puede ser null
      return
    }
    if (form.role === 'inspector') {
      // inspector siempre scoped con empresa
      if (form.scope !== 'scoped') setForm(f => ({ ...f, scope: 'scoped' }))
      return
    }
    // supervisor/viewer: si no hay empresa → debería ser global
    if ((form.role === 'supervisor' || form.role === 'viewer')) {
      if (form.scope === 'global' && form.company_id) {
        setForm(f => ({ ...f, company_id: '', region_ids: [], supervisor_id: '' }))
      }
    }
  }, [form.role])

  // Cargar supervisores de la empresa seleccionada (para inspectores).
  useEffect(() => {
    if (!form.company_id) { setSupervisors([]); return }
    supabase.from('app_users')
      .select('id, full_name')
      .eq('company_id', form.company_id)
      .eq('role', 'supervisor')
      .eq('active', true)
      .then(({ data }) => setSupervisors(data || []))
  }, [form.company_id])

  const toggleRegion = id => setForm(f => ({
    ...f,
    region_ids: f.region_ids.includes(id) ? f.region_ids.filter(x => x !== id) : [...f.region_ids, id],
  }))

  // ── Validaciones UX antes de guardar ──────────────────────────────────────
  const validate = () => {
    if (!form.email.trim() || !form.full_name.trim()) return 'Email y nombre son obligatorios'
    if (isNew && !form.password) return 'La contraseña es obligatoria para usuarios nuevos'

    if (form.role === 'inspector' && !form.company_id) {
      return 'Inspector debe tener una empresa asignada'
    }

    if (form.role === 'supervisor' || form.role === 'viewer') {
      if (form.scope === 'scoped') {
        if (!form.company_id) return `Un ${form.role} con acceso por empresa debe tener una empresa asignada`
        if (selectedCompany && (!selectedCompany.company_regions || selectedCompany.company_regions.length === 0)) {
          return `La empresa "${selectedCompany.name}" no tiene regiones asignadas. Asigna regiones a la empresa primero, en la sección Empresas.`
        }
      } else if (form.scope === 'global') {
        if (form.company_id) return 'Un usuario con acceso global no puede tener empresa'
        if (form.region_ids.length > 0) return 'Un usuario con acceso global no puede tener regiones asignadas'
      }
    }
    return null
  }

  const save = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSaving(true); setError('')

    try {
      const payload = {
        email:         form.email.trim(),
        full_name:     form.full_name.trim(),
        role:          form.role,
        company_id:    form.scope === 'global' ? null : (form.company_id || null),
        supervisor_id: form.role === 'inspector' && form.supervisor_id ? form.supervisor_id : null,
        active:        form.active,
        scope:         (form.role === 'admin' || form.role === 'inspector') ? 'scoped' : form.scope,
        region_ids:    (form.role === 'supervisor' || form.role === 'viewer' || form.role === 'inspector') && form.scope === 'scoped'
                         ? form.region_ids
                         : [],
      }

      if (isNew) {
        let token = null
        try {
          const { data } = await supabase.auth.getSession()
          token = data?.session?.access_token || null
        } catch { /* continuar */ }

        if (!token) {
          setError('Tu sesión expiró. Cierra sesión e inicia de nuevo.')
          return
        }

        let invokeRes
        try {
          invokeRes = await Promise.race([
            supabase.functions.invoke('create-user', {
              body: {
                email:         payload.email,
                password:      form.password,
                full_name:     payload.full_name,
                role:          payload.role,
                company_id:    payload.company_id,
                supervisor_id: payload.supervisor_id,
                active:        payload.active,
                scope:         payload.scope,
                region_ids:    payload.region_ids,
              },
              headers: { Authorization: `Bearer ${token}` },
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Tiempo de espera agotado (20s).')), 20000)
            )
          ])
        } catch (e) {
          setError(e.message || 'Error al conectar con el servidor.')
          return
        }

        if (invokeRes.error) {
          let errMsg = 'Error al crear usuario'
          try {
            const body = await invokeRes.error.context.json()
            errMsg = body?.error || errMsg
          } catch {
            errMsg = invokeRes.error.message || errMsg
          }
          setError(errMsg)
          return
        }

        try { LOG.userCreated(payload.email, payload.role, currentUser?.email) } catch (_) {}
      } else {
        // UPDATE existente: 1) app_users  2) reset app_user_regions
        const wasDeactivated = user.active && !form.active

        const { error: updErr } = await q(supabase.from('app_users').update({
          full_name:     payload.full_name,
          role:          payload.role,
          company_id:    payload.company_id,
          supervisor_id: payload.supervisor_id,
          active:        payload.active,
          scope:         payload.scope,
        }).eq('id', user.id))
        if (updErr) { setError(updErr.message); return }

        // Sincronizar app_user_regions: borrar todas y reinsertar las nuevas.
        // Usar delete por user_id + insert masivo es atómico desde el punto de
        // vista del usuario porque la UI espera onSave().
        const { error: delErr } = await q(
          supabase.from('app_user_regions').delete().eq('user_id', user.id)
        )
        if (delErr) { setError(`Error al limpiar regiones: ${delErr.message}`); return }

        if (payload.scope === 'scoped' && payload.region_ids.length > 0) {
          const rows = payload.region_ids.map(region_id => ({ user_id: user.id, region_id }))
          const { error: insErr } = await q(
            supabase.from('app_user_regions').insert(rows)
          )
          if (insErr) { setError(`Error al asignar regiones: ${insErr.message}`); return }
        }

        try {
          if (wasDeactivated) LOG.userDeactivated(user.email, currentUser?.email)
          else LOG.userUpdated(user.email, { role: payload.role, active: payload.active, scope: payload.scope, region_count: payload.region_ids.length }, currentUser?.email)
        } catch (_) {}
      }

      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user?.id) return
    if (!window.confirm(`¿Eliminar a ${user.full_name}? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    try {
      // app_user_regions cae por CASCADE al borrar app_users
      const { error: err } = await q(supabase.from('app_users').delete().eq('id', user.id))
      if (err) { setError(err.message); return }
      try { LOG.userUpdated(user.email, { deleted: true }, currentUser?.email) } catch (_) {}
      onSave()
    } catch (e) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const showScopeToggle  = form.role === 'supervisor' || form.role === 'viewer'
  const showCompanyField = form.role === 'inspector' || (showScopeToggle && form.scope === 'scoped')
  const showRegionsField = showCompanyField && form.role !== 'admin' && !!form.company_id

  const companyHasNoRegions = selectedCompany && (!selectedCompany.company_regions || selectedCompany.company_regions.length === 0)

  return (
    <div data-modal="open" className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md max-h-[85dvh] flex flex-col"
        style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}
        onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl"
          style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
          <h2 className="text-[15px] font-semibold th-text-p">{isNew ? 'Nuevo usuario' : 'Editar usuario'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg th-text-m" style={{ background:'var(--bg-base)' }}><X size={15}/></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="text-[12px] text-bad px-3 py-2 rounded-lg" style={{ background:'#fef2f2', border:'1px solid #fecaca' }}>{error}</div>}

          <FieldLabel label="Nombre completo">
            <input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))}
              placeholder="Ej: Juan Pérez" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onFocusOut}/>
          </FieldLabel>

          <FieldLabel label="Correo electrónico">
            <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
              placeholder="usuario@email.com" readOnly={!isNew}
              style={{ ...INPUT_STYLE, opacity: isNew ? 1 : 0.7 }} onFocus={onFocusIn} onBlur={onFocusOut}/>
          </FieldLabel>

          {isNew && (
            <FieldLabel label="Contraseña inicial">
              <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                placeholder="Mínimo 6 caracteres" style={INPUT_STYLE} onFocus={onFocusIn} onBlur={onFocusOut}/>
            </FieldLabel>
          )}

          <FieldLabel label="Rol">
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
              style={{ ...INPUT_STYLE, height:36 }}>
              <option value="supervisor">Supervisor</option>
              <option value="inspector">Inspector</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </FieldLabel>

          {/* ── Toggle scope (solo supervisor/viewer) ─────────────────────── */}
          {showScopeToggle && (
            <FieldLabel label="Alcance de acceso">
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, scope: 'scoped' }))}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold transition-colors"
                  style={{
                    background: form.scope === 'scoped' ? '#0284C7' : 'var(--bg-base)',
                    color:      form.scope === 'scoped' ? '#fff' : 'var(--text-secondary)',
                    border:     form.scope === 'scoped' ? '1px solid #0284C7' : '1px solid var(--border)',
                  }}>
                  <MapPin size={13}/>Por empresa
                </button>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, scope: 'global', company_id: '', region_ids: [], supervisor_id: '' }))}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold transition-colors"
                  style={{
                    background: form.scope === 'global' ? '#dc2626' : 'var(--bg-base)',
                    color:      form.scope === 'global' ? '#fff' : 'var(--text-secondary)',
                    border:     form.scope === 'global' ? '1px solid #dc2626' : '1px solid var(--border)',
                  }}>
                  <Globe size={13}/>Global
                </button>
              </div>
              {form.scope === 'global' && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg text-[12px]"
                  style={{ background:'#fef2f2', border:'1px solid rgba(239,68,68,0.25)', color:'#991b1b' }}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-[1px]"/>
                  <span>Este usuario verá <b>toda</b> la información del sistema. Úsalo solo para perfiles supervisores generales.</span>
                </div>
              )}
            </FieldLabel>
          )}

          {/* ── Selector de empresa ──────────────────────────────────────── */}
          {showCompanyField && (
            <FieldLabel label="Empresa" hint={form.role === 'inspector' ? 'El inspector verá sitios de las regiones asignadas a esta empresa.' : 'El usuario solo verá datos de esta empresa.'}>
              <select value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value,supervisor_id:''}))}
                style={{ ...INPUT_STYLE, height:36 }}>
                <option value="">— Selecciona una empresa —</option>
                {companies.map(c=>(
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.org_code})
                    {(!c.company_regions || c.company_regions.length === 0) ? ' — sin regiones' : ''}
                  </option>
                ))}
              </select>
              {companyHasNoRegions && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg text-[12px]"
                  style={{ background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e' }}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-[1px]"/>
                  <span>Esta empresa no tiene regiones asignadas. <b>Asigna regiones a la empresa</b> en la sección Empresas antes de crear este usuario.</span>
                </div>
              )}
            </FieldLabel>
          )}

          {/* ── Multi-select de regiones ─────────────────────────────────── */}
          {showRegionsField && availableRegions.length > 0 && (
            <FieldLabel label="Regiones asignadas"
              hint={form.region_ids.length === 0 ? 'Vacío = ve todas las regiones de la empresa.' : `${form.region_ids.length} región${form.region_ids.length!==1?'es':''} seleccionada${form.region_ids.length!==1?'s':''}.`}>
              <div className="rounded-lg overflow-hidden" style={{ border:'1px solid var(--border)', maxHeight:180, overflowY:'auto' }}>
                {availableRegions.map((r, i) => {
                  const sel = form.region_ids.includes(r.id)
                  return (
                    <button key={r.id} type="button" onClick={() => toggleRegion(r.id)}
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
            </FieldLabel>
          )}

          {/* ── Supervisor asignado (solo inspector) ─────────────────────── */}
          {form.role === 'inspector' && (
            <FieldLabel label="Supervisor asignado">
              <select value={form.supervisor_id} onChange={e=>setForm(f=>({...f,supervisor_id:e.target.value}))}
                style={{ ...INPUT_STYLE, height:36 }}>
                <option value="">— Sin supervisor —</option>
                {supervisors.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </FieldLabel>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[13px] th-text-p">Usuario activo</span>
            <button onClick={()=>setForm(f=>({...f,active:!f.active}))}>
              {form.active
                ? <ToggleRight size={24} style={{ color:'#0284C7' }}/>
                : <ToggleLeft  size={24} className="th-text-m"/>}
            </button>
          </div>
        </div>
        <div className="px-5 py-4 flex gap-2 justify-end flex-shrink-0" style={{ borderTop:'1px solid var(--border)' }}>
          {!isNew && (
            <button onClick={handleDelete} disabled={saving}
              className="h-9 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 mr-auto disabled:opacity-50 transition-colors"
              style={{ color:'#dc2626', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)' }}
              title="Eliminar usuario">
              <Trash2 size={13}/>Eliminar
            </button>
          )}
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] th-text-s"
            style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>Cancelar</button>
          <button onClick={save} disabled={saving}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
            style={{ background:'#0284C7' }}>
            {saving ? <><Spinner size={13}/>Guardando…</> : <><Check size={13}/>Guardar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const currentUser   = useAuthStore(s => s.user)
  const users         = useAdminStore(s => s.users)
  const companies     = useAdminStore(s => s.companies)
  const regions       = useAdminStore(s => s.regions)
  const loading       = useAdminStore(s => s.usersLoading || s.companiesLoading)
  const storeError    = useAdminStore(s => s.usersError || s.companiesError)
  const loadUsers     = useAdminStore(s => s.loadUsers)
  const loadCompanies = useAdminStore(s => s.loadCompanies)
  const loadRegions   = useAdminStore(s => s.loadRegions)
  const invalidateUsers     = useAdminStore(s => s.invalidateUsers)
  const invalidateCompanies = useAdminStore(s => s.invalidateCompanies)
  const invalidateRegions   = useAdminStore(s => s.invalidateRegions)

  const [modal,     setModal]     = useState(null)
  const [filterRole,    setFilterRole]    = useState('all')
  const [filterCompany, setFilterCompany] = useState('all')

  useEffect(() => { loadUsers(); loadCompanies(); loadRegions() }, [])

  const filtered = users.filter(u =>
    (filterRole    === 'all' || u.role       === filterRole)    &&
    (filterCompany === 'all' || u.company_id === filterCompany)
  )

  const initials = name => name?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || '?'
  const avColors = { admin:['#0f172a','#e0f2fe'], supervisor:['#e0f2fe','#0369a1'], inspector:['#f0fdf4','#166534'], viewer:['#faf5ff','#7e22ce'] }

  // Helper: dado un user, cuántas regiones tiene asignadas y cuántas tiene su empresa
  const getRegionCounts = (u) => {
    const assigned = Array.isArray(u.app_user_regions) ? u.app_user_regions.length : 0
    const company = companies.find(c => c.id === u.company_id)
    const total = company?.company_regions?.length || 0
    return { assigned, total }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold th-text-p">Usuarios</h1>
          <p className="text-[12px] th-text-m mt-0.5">{filtered.length} usuario{filtered.length!==1?'s':''}</p>
        </div>
        <button onClick={()=>setModal('new')}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5"
          style={{ background:'#0284C7' }}>
          <Plus size={14}/>Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
          className="h-9 px-3 text-[12px] rounded-lg th-text-s th-bg-card"
          style={{ border:'1px solid var(--border)', outline:'none' }}>
          <option value="all">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="inspector">Inspector</option>
          <option value="viewer">Viewer</option>
        </select>
        <select value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}
          className="h-9 px-3 text-[12px] rounded-lg th-text-s th-bg-card"
          style={{ border:'1px solid var(--border)', outline:'none' }}>
          <option value="all">Todas las empresas</option>
          {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {storeError && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-[13px]"
          style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626' }}>
          <span>⚠️ {storeError}</span>
          <button onClick={()=>{ invalidateUsers(); invalidateCompanies(); invalidateRegions(); loadUsers(true); loadCompanies(true); loadRegions(true) }}
            className="px-3 py-1 rounded-lg text-[12px] font-semibold"
            style={{ background:'#dc2626', color:'#fff' }}>Reintentar</button>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={16}/></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[420px]" style={{ borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border-light)' }}>
                {[{l:'Usuario',c:''},{l:'Rol',c:''},{l:'Empresa',c:'hidden sm:table-cell'},{l:'Alcance',c:'hidden md:table-cell'},{l:'Estado',c:''},{l:'',c:''}].map(({l,c})=>(
                  <th key={l} className={`px-4 py-3 text-left text-[11px] font-semibold th-text-m uppercase tracking-wider ${c}`}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u,i)=>{
                const [avBg, avTxt] = avColors[u.role] || ['#f1f5f9','#64748b']
                const { assigned, total } = getRegionCounts(u)
                return (
                  <tr key={u.id}
                    style={{ borderBottom: i<filtered.length-1?'1px solid var(--border-light)':'none' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--row-hover-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                          style={{ background:avBg, color:avTxt }}>
                          {initials(u.full_name)}
                        </div>
                        <div>
                          <div className="font-semibold th-text-p text-[12px]">{u.full_name}</div>
                          <div className="text-[10px] th-text-m">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role}/></td>
                    <td className="px-4 py-3 text-[12px] th-text-s hidden sm:table-cell">{u.companies?.name || <span className="th-text-m">—</span>}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <ScopeBadge user={u} regionCount={assigned} totalCompanyRegions={total}/>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full"
                        style={u.active ? {background:'#f0fdf4',color:'#166534'} : {background:'var(--bg-base)',color:'var(--text-muted)'}}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== currentUser?.id && (
                        <button onClick={()=>setModal(u)}
                          className="p-1.5 rounded-lg th-text-m transition-colors"
                          style={{ background:'var(--bg-base)' }}
                          onMouseEnter={e=>e.currentTarget.style.color='#0284C7'}
                          onMouseLeave={e=>e.currentTarget.style.color=''}>
                          <Pencil size={13}/>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-[13px] th-text-m">Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          companies={companies}
          allRegions={regions}
          onSave={()=>{ setModal(null); invalidateUsers(); invalidateCompanies(); invalidateRegions(); loadUsers(true); loadCompanies(true); loadRegions(true) }}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  )
}
