import React, { useState, useEffect } from 'react'
import { Plus, Pencil, X, Check, UserCircle, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { waitForSdkReady, getTokenFromStorage } from '../../lib/sdkReady'
import { q } from '../../lib/dbUtils'
import { useAuthStore } from '../../store/useAuthStore'
import { LOG } from '../../lib/logEvent'
import { useAdminStore } from '../../store/useAdminStore'
import Spinner from '../../components/ui/Spinner'

const ROLE_META = {
  admin:      { label:'Admin',      bg:'#0f172a', color:'#e0f2fe' },
  supervisor: { label:'Supervisor', bg:'#e0f2fe', color:'#0369a1' },
  inspector:  { label:'Inspector',  bg:'#f0fdf4', color:'#166534' },
}

function RoleBadge({ role }) {
  const m = ROLE_META[role] || { label:role, bg:'#f1f5f9', color:'#64748b' }
  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full"
      style={{ background:m.bg, color:m.color }}>{m.label}</span>
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

// Componente de campo definido a nivel de módulo — nunca se remonta al tipear
function FieldLabel({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold th-text-m uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function UserModal({ user, companies, onSave, onClose }) {
  const isNew = !user?.id
  const currentUser = useAuthStore(s => s.user)

  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const [form, setForm] = useState({
    email:         user?.email         || '',
    full_name:     user?.full_name     || '',
    role:          user?.role          || 'inspector',
    company_id:    user?.company_id    || '',
    supervisor_id: user?.supervisor_id || '',
    active:        user?.active        ?? true,
    password:      '',
  })
  const [supervisors, setSupervisors] = useState([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  // Cargar supervisores de la empresa seleccionada
  useEffect(() => {
    if (!form.company_id) { setSupervisors([]); return }
    supabase.from('app_users')
      .select('id, full_name')
      .eq('company_id', form.company_id)
      .eq('role', 'supervisor')
      .eq('active', true)
      .then(({ data }) => setSupervisors(data || []))
  }, [form.company_id])

  const save = async () => {
    if (!form.email.trim() || !form.full_name.trim()) { setError('Email y nombre son obligatorios'); return }
    if (isNew && !form.password) { setError('La contraseña es obligatoria para usuarios nuevos'); return }
    setSaving(true); setError('')

    try {
      // Esperar a que el SDK termine _recoverAndRefresh() si el usuario
      // acaba de regresar de otro tab. Máximo 5s de espera.
      await waitForSdkReady(5000)

      if (isNew) {
        // ── Obtener token para la Edge Function ────────────────────────
        // waitForSdkReady() garantiza que el lock del SDK está libre aquí.
        // Ahora sí es seguro llamar getSession() — resolverá instantáneamente
        // con el token fresco que el SDK acaba de escribir en localStorage.
        let token = null
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          token = sessionData?.session?.access_token || null
        } catch { /* continuar, el fetch fallará con error claro */ }

        if (!token) {
          setError('Tu sesión expiró. Cierra sesión e inicia de nuevo.')
          return
        }

        // Llamada directa a la Edge Function con fetch nativo.
        // NO usar supabase.functions.invoke() — pasa por el SDK que puede
        // estar bloqueado por el lock interno de _recoverAndRefresh().
        // fetch() va directo a la red, sin intermediarios, sin lock.
        let edgeResponse
        try {
          const controller = new AbortController()
          const timeoutId  = setTimeout(() => controller.abort(), 20000)
          edgeResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/create-user`,
            {
              method:  'POST',
              signal:  controller.signal,
              headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey':        SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({
                email:         form.email.trim(),
                password:      form.password,
                full_name:     form.full_name.trim(),
                role:          form.role,
                company_id:    form.company_id    || null,
                supervisor_id: form.role === 'inspector' && form.supervisor_id ? form.supervisor_id : null,
                active:        form.active,
              }),
            }
          )
          clearTimeout(timeoutId)
        } catch (e) {
          const msg = e.name === 'AbortError'
            ? 'Tiempo de espera agotado. Verifica tu conexión.'
            : 'Error al conectar con el servidor.'
          setError(msg)
          return
        }

        if (!edgeResponse.ok) {
          let errMsg = 'Error al crear usuario'
          try {
            const body = await edgeResponse.json()
            errMsg = body?.error || errMsg
          } catch { /* usar mensaje default */ }
          setError(errMsg)
          return
        }

        try { LOG.userCreated(form.email, form.role, currentUser?.email) } catch (_) {}

      } else {
        // Detectar si se desactivó el usuario
        const wasDeactivated = user.active && !form.active

        // Update con timeout para evitar que se quede colgado
        const { error: err } = await q(supabase.from('app_users').update({
          full_name:     form.full_name.trim(),
          role:          form.role,
          company_id:    form.company_id || null,
          supervisor_id: form.role === 'inspector' && form.supervisor_id ? form.supervisor_id : null,
          active:        form.active,
        }).eq('id', user.id))
        if (err) { setError(err.message); return }

        try {
          if (wasDeactivated) LOG.userDeactivated(user.email, currentUser?.email)
          else LOG.userUpdated(user.email, { role: form.role, active: form.active }, currentUser?.email)
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

  return (
    <div data-modal="open" className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md max-h-[80dvh] sm:max-h-[85dvh] flex flex-col"
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
            </select>
          </FieldLabel>

          <FieldLabel label="Empresa">
            <select value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value,supervisor_id:''}))}
              style={{ ...INPUT_STYLE, height:36 }}>
              <option value="">— Sin empresa (admin global) —</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name} ({c.org_code})</option>)}
            </select>
          </FieldLabel>

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
  const currentUser = useAuthStore(s => s.user)
  const users        = useAdminStore(s => s.users)
  const companies    = useAdminStore(s => s.companies)
  const loading      = useAdminStore(s => s.usersLoading || s.companiesLoading)
  const storeError   = useAdminStore(s => s.usersError || s.companiesError)
  const loadUsers    = useAdminStore(s => s.loadUsers)
  const loadCompanies = useAdminStore(s => s.loadCompanies)
  const invalidateUsers = useAdminStore(s => s.invalidateUsers)
  const invalidateCompanies = useAdminStore(s => s.invalidateCompanies)

  const [modal,     setModal]     = useState(null)
  const [filterRole,    setFilterRole]    = useState('all')
  const [filterCompany, setFilterCompany] = useState('all')

  useEffect(() => { loadUsers(); loadCompanies() }, [])

  const filtered = users.filter(u =>
    (filterRole    === 'all' || u.role       === filterRole)    &&
    (filterCompany === 'all' || u.company_id === filterCompany)
  )

  const initials = name => name?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || '?'
  const avColors = { admin:['#0f172a','#e0f2fe'], supervisor:['#e0f2fe','#0369a1'], inspector:['#f0fdf4','#166534'] }

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
          <button onClick={()=>{ invalidateUsers(); invalidateCompanies(); loadUsers(true); loadCompanies(true) }}
            className="px-3 py-1 rounded-lg text-[12px] font-semibold"
            style={{ background:'#dc2626', color:'#fff' }}>Reintentar</button>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={16}/></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[380px]" style={{ borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border-light)' }}>
                {[{l:'Usuario',c:''},{l:'Rol',c:''},{l:'Empresa',c:'hidden sm:table-cell'},{l:'Supervisor',c:'hidden md:table-cell'},{l:'Estado',c:''},{l:'',c:''}].map(({l,c})=>(
                  <th key={l} className={`px-4 py-3 text-left text-[11px] font-semibold th-text-m uppercase tracking-wider ${c}`}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u,i)=>{
                const [avBg, avTxt] = avColors[u.role] || ['#f1f5f9','#64748b']
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
                    <td className="px-4 py-3 text-[12px] th-text-s hidden md:table-cell">
                      {u.supervisor_id
                        ? users.find(x=>x.id===u.supervisor_id)?.full_name || '—'
                        : <span className="th-text-m">—</span>}
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
          onSave={()=>{ setModal(null); invalidateUsers(); invalidateCompanies(); loadUsers(true); loadCompanies(true) }}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  )
}
