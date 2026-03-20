import { useState, useEffect } from 'react'
import { Save, Info } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'

// Definición de permisos agrupados por categoría
const PERMISSION_GROUPS = [
  {
    label: 'Dashboard',
    permissions: [
      { key:'dashboard.view', label:'Ver panel principal', desc:'Acceder al dashboard con KPIs y actividad reciente' },
    ]
  },
  {
    label: 'Formularios / Submissions',
    permissions: [
      { key:'submissions.view_all',      label:'Ver formularios de todas las empresas', desc:'Solo relevante para admin global' },
      { key:'submissions.edit',          label:'Editar campos de formularios',           desc:'Modificar datos con registro de auditoría' },
      { key:'submissions.export_pdf',    label:'Exportar PDF',                           desc:'Generar y descargar reportes en PDF' },
      { key:'submissions.export_photos', label:'Descargar fotos',                        desc:'Descargar paquete ZIP de fotografías' },
    ]
  },
  {
    label: 'Visitas',
    permissions: [
      { key:'visits.view', label:'Ver visitas / órdenes de trabajo', desc:'Módulo de Site Visits' },
    ]
  },
  {
    label: 'Auditoría',
    permissions: [
      { key:'audit.view', label:'Ver historial de ediciones', desc:'Registro de cambios con usuario y justificación' },
    ]
  },
  {
    label: 'Administración del sistema',
    permissions: [
      { key:'admin.companies',   label:'Gestionar empresas',             desc:'Crear, editar, activar/desactivar empresas' },
      { key:'admin.users',       label:'Gestionar usuarios',             desc:'Crear, editar, asignar roles' },
      { key:'admin.permissions', label:'Configurar permisos',            desc:'Esta pantalla — modificar la matriz de permisos' },
    ]
  },
]

const ROLES = [
  { key:'admin',      label:'Admin',      color:'#0f172a', light:'#e0f2fe' },
  { key:'supervisor', label:'Supervisor', color:'#0284C7', light:'#e0f2fe' },
  { key:'inspector',  label:'Inspector',  color:'#16a34a', light:'#f0fdf4' },
]

// Permisos que SIEMPRE son forzados y no se pueden cambiar
const LOCKED = new Set([
  'admin:dashboard.view',
  'admin:submissions.view_all',
  'admin:submissions.edit',
  'admin:submissions.export_pdf',
  'admin:submissions.export_photos',
  'admin:visits.view',
  'admin:audit.view',
  'admin:admin.companies',
  'admin:admin.users',
  'admin:admin.permissions',
  'inspector:dashboard.view',
  'inspector:submissions.view_all',
  'inspector:submissions.edit',
  'inspector:admin.companies',
  'inspector:admin.users',
  'inspector:admin.permissions',
])

function Checkbox({ checked, locked, onChange }) {
  return (
    <button
      onClick={locked ? undefined : onChange}
      disabled={locked}
      className="w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0"
      style={{
        background:  checked ? '#0284C7' : 'var(--bg-input)',
        border:      checked ? '2px solid #0284C7' : '1.5px solid var(--border)',
        cursor:      locked ? 'not-allowed' : 'pointer',
        opacity:     locked ? 0.45 : 1,
      }}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

export default function Permissions() {
  // { 'admin:dashboard.view': true, 'supervisor:submissions.edit': false, ... }
  const [matrix,  setMatrix]  = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [tooltip, setTooltip] = useState(null) // key del permiso con tooltip visible

  const load = async () => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 15000)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); clearTimeout(t); return }
      const { data } = await supabase.from('role_permissions').select('role, permission, enabled')
      const m = {}
      ;(data || []).forEach(r => { m[`${r.role}:${r.permission}`] = r.enabled })
      setMatrix(m)
    } catch { /* silencioso */ } finally {
      clearTimeout(t)
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const toggle = (role, perm) => {
    const k = `${role}:${perm}`
    if (LOCKED.has(k)) return
    setMatrix(prev => ({ ...prev, [k]: !prev[k] }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    const upserts = []
    for (const [k, enabled] of Object.entries(matrix)) {
      const [role, ...rest] = k.split(':')
      const permission = rest.join(':')
      upserts.push({ role, permission, enabled, updated_at: new Date().toISOString() })
    }
    const { error } = await supabase.from('role_permissions').upsert(upserts, { onConflict:'role,permission' })
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(()=>setSaved(false), 3000) }
  }

  const get = (role, perm) => matrix[`${role}:${perm}`] ?? false
  const isLocked = (role, perm) => LOCKED.has(`${role}:${perm}`)

  if (loading) return <div className="flex justify-center py-20"><Spinner size={16}/></div>

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold th-text-p">Permisos por rol</h1>
          <p className="text-[12px] th-text-m mt-0.5">Activa o desactiva funcionalidades por rol. Los cambios aplican de inmediato a todos los usuarios con ese rol.</p>
        </div>
        <button onClick={save} disabled={saving}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 transition-all"
          style={{ background: saved ? '#16a34a' : '#0284C7' }}>
          {saving ? <><Spinner size={13}/>Guardando…</> : saved ? <>✓ Guardado</> : <><Save size={13}/>Guardar cambios</>}
        </button>
      </div>

      {/* Nota */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg text-[11px]"
        style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8' }}>
        <Info size={13} style={{ flexShrink:0, marginTop:1 }}/>
        <span>Los permisos marcados con candado (grisados) son fijos del sistema y no se pueden cambiar. El rol <strong>Admin</strong> siempre tiene acceso total. El rol <strong>Inspector</strong> no accede al dashboard.</span>
      </div>

      {/* Tabla de permisos */}
      <div className="rounded-xl overflow-hidden" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>

        {/* Header de roles */}
        <div className="grid border-b" style={{ gridTemplateColumns:'1fr repeat(3, 100px)', borderColor:'var(--border)' }}>
          <div className="px-5 py-3 text-[11px] font-semibold th-text-m uppercase tracking-wider">Funcionalidad</div>
          {ROLES.map(r => (
            <div key={r.key} className="py-3 text-center">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background:r.light, color:r.color }}>
                {r.label}
              </span>
            </div>
          ))}
        </div>

        {/* Grupos y filas */}
        {PERMISSION_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {/* Separador de grupo */}
            <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-wider th-text-m"
              style={{ background:'var(--bg-base)', borderTop: gi>0 ? '1px solid var(--border-light)' : 'none' }}>
              {group.label}
            </div>

            {group.permissions.map((perm, pi) => (
              <div key={perm.key}
                className="grid items-center"
                style={{
                  gridTemplateColumns:'1fr repeat(3, 100px)',
                  borderTop:'1px solid var(--border-light)',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--row-hover-bg)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>

                {/* Label + descripción */}
                <div className="px-5 py-3 flex items-center gap-2">
                  <div>
                    <div className="text-[12px] font-medium th-text-p">{perm.label}</div>
                    <div className="text-[10px] th-text-m mt-0.5">{perm.desc}</div>
                  </div>
                </div>

                {/* Checkboxes por rol */}
                {ROLES.map(role => {
                  const locked  = isLocked(role.key, perm.key)
                  const checked = get(role.key, perm.key)
                  return (
                    <div key={role.key} className="flex items-center justify-center py-3"
                      title={locked ? 'Este permiso no se puede modificar' : ''}>
                      <Checkbox
                        checked={checked}
                        locked={locked}
                        onChange={() => toggle(role.key, perm.key)}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 text-[11px] th-text-m flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background:'#0284C7', border:'2px solid #0284C7' }}>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          Habilitado
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ background:'var(--bg-input)', border:'1.5px solid var(--border)' }}></div>
          Deshabilitado
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded opacity-45" style={{ background:'var(--bg-input)', border:'1.5px solid var(--border)' }}></div>
          Fijo del sistema (no editable)
        </div>
      </div>
    </div>
  )
}
