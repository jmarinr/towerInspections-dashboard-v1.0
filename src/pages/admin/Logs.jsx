import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Filter, X, ShieldAlert, LogIn, LogOut, UserPlus, UserCog, FileEdit, AlertCircle, Info } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'

// ── Configuración de tipos de evento ─────────────────────────────────────────
const EVENT_META = {
  'auth.login':            { label:'Login',                icon: LogIn,       color:'#16a34a', bg:'#f0fdf4' },
  'auth.login_failed':     { label:'Login fallido',        icon: ShieldAlert, color:'#dc2626', bg:'#fef2f2' },
  'auth.logout':           { label:'Logout',               icon: LogOut,      color:'#7a8fa0', bg:'#f1f5f9' },
  'user.created':          { label:'Usuario creado',       icon: UserPlus,    color:'#0284C7', bg:'#e0f2fe' },
  'user.updated':          { label:'Usuario modificado',   icon: UserCog,     color:'#d97706', bg:'#fef3c7' },
  'user.deactivated':      { label:'Usuario desactivado',  icon: UserCog,     color:'#dc2626', bg:'#fef2f2' },
  'submission.received':   { label:'Formulario recibido',  icon: FileEdit,    color:'#7c3aed', bg:'#f5f3ff' },
  'submission.finalized':  { label:'Formulario finalizado',icon: FileEdit,    color:'#16a34a', bg:'#f0fdf4' },
  'submission.edited':     { label:'Formulario editado',   icon: FileEdit,    color:'#d97706', bg:'#fef3c7' },
  'visit.received':        { label:'Visita recibida',      icon: AlertCircle, color:'#0284C7', bg:'#e0f2fe' },
  'visit.status_changed':  { label:'Visita actualizada',   icon: AlertCircle, color:'#7a8fa0', bg:'#f1f5f9' },
  'system.error':          { label:'Error del sistema',    icon: AlertCircle, color:'#dc2626', bg:'#fef2f2' },
}

const SEVERITY_META = {
  info:     { label:'Info',     color:'#0284C7', bg:'#e0f2fe' },
  warning:  { label:'Alerta',   color:'#b45309', bg:'#fef9c3' },
  error:    { label:'Error',    color:'#dc2626', bg:'#fef2f2' },
  critical: { label:'Crítico',  color:'#7f1d1d', bg:'#fecaca' },
}

function EventBadge({ event_type }) {
  const m = EVENT_META[event_type] || { label: event_type, icon: Info, color:'#7a8fa0', bg:'#f1f5f9' }
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}>
      <Icon size={11}/>
      {m.label}
    </span>
  )
}

function SeverityDot({ severity }) {
  const m = SEVERITY_META[severity] || SEVERITY_META.info
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

function MetaDrawer({ log, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}
      style={{ background:'rgba(0,0,0,0.3)' }}>
      <div className="h-full w-full max-w-md overflow-y-auto animate-slide-in"
        style={{ background:'var(--bg-card)', borderLeft:'1px solid var(--border)' }}
        onClick={e=>e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between sticky top-0 z-10"
          style={{ background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
          <div>
            <h2 className="text-[14px] font-semibold th-text-p">Detalle del evento</h2>
            <p className="text-[11px] th-text-m mt-0.5">
              {new Date(log.created_at).toLocaleString('es', { dateStyle:'full', timeStyle:'medium' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg th-text-m"
            style={{ background:'var(--bg-base)' }}><X size={15}/></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex gap-3 flex-wrap">
            <EventBadge event_type={log.event_type}/>
            <SeverityDot severity={log.severity}/>
          </div>

          <div>
            <div className="text-[11px] font-semibold th-text-m uppercase tracking-wide mb-1">Mensaje</div>
            <div className="text-[13px] th-text-p leading-relaxed">{log.message}</div>
          </div>

          {[
            ['Usuario',    log.user_email],
            ['Rol',        log.user_role],
            ['IP',         log.ip_address],
            ['Empresa',    log.company_id],
          ].map(([label, val]) => val ? (
            <div key={label}>
              <div className="text-[11px] font-semibold th-text-m uppercase tracking-wide mb-1">{label}</div>
              <div className="text-[12px] th-text-p font-mono">{val}</div>
            </div>
          ) : null)}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <div className="text-[11px] font-semibold th-text-m uppercase tracking-wide mb-2">Metadata</div>
              <div className="rounded-lg p-3 text-[11px] font-mono leading-relaxed th-text-s overflow-auto"
                style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>
                {JSON.stringify(log.metadata, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 50

export default function Logs() {
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(0)
  const [selected,  setSelected]  = useState(null)

  // Filtros
  const [search,       setSearch]       = useState('')
  const [filterType,   setFilterType]   = useState('all')
  const [filterSev,    setFilterSev]    = useState('all')
  const [filterUser,   setFilterUser]   = useState('')

  const load = useCallback(async (pg = 0) => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 15000)
    try {
      let q = supabase
        .from('system_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE - 1)

      if (filterType !== 'all') q = q.eq('event_type', filterType)
      if (filterSev  !== 'all') q = q.eq('severity', filterSev)
      if (filterUser)           q = q.ilike('user_email', `%${filterUser}%`)
      if (search)               q = q.ilike('message', `%${search}%`)

      const { data, count } = await q
      setLogs(data || [])
      setTotal(count || 0)
    } catch { /* silencioso */ } finally {
      clearTimeout(t)
      setLoading(false)
    }
  }, [filterType, filterSev, filterUser, search])

  useEffect(() => { setPage(0); load(0) }, [filterType, filterSev, filterUser])

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); load(0) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { load(page) }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fmtDate = (ts) => {
    const d = new Date(ts)
    const today = new Date()
    const isToday = d.toDateString() === today.toDateString()
    return isToday
      ? d.toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
      : d.toLocaleString('es', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
  }

  const hasSuspicious = logs.some(l =>
    l.event_type === 'auth.login_failed' || l.severity === 'error' || l.severity === 'critical'
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold th-text-p">Logs del sistema</h1>
          <p className="text-[12px] th-text-m mt-0.5">
            {total.toLocaleString()} evento{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => load(page)}
          className="h-9 px-3 rounded-lg text-[12px] th-text-s flex items-center gap-1.5 transition-colors"
          style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--row-hover-bg)'}
          onMouseLeave={e=>e.currentTarget.style.background='var(--bg-base)'}>
          <RefreshCw size={13}/>Actualizar
        </button>
      </div>

      {/* Alerta de actividad sospechosa */}
      {hasSuspicious && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg text-[12px]"
          style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b' }}>
          <ShieldAlert size={15} style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <strong>Actividad sospechosa detectada</strong> en los resultados actuales —
            hay intentos de login fallidos o errores del sistema. Revisa los eventos marcados en rojo.
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 th-text-m pointer-events-none"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar en mensajes..."
            className="w-full h-9 pl-8 pr-3 text-[12px] rounded-lg th-text-p th-bg-card"
            style={{ border:'1px solid var(--border)', outline:'none' }}
            onFocus={e=>{e.target.style.borderColor='#0284C7'}}
            onBlur={e=>{e.target.style.borderColor='var(--border)'}}/>
        </div>

        <input value={filterUser} onChange={e=>setFilterUser(e.target.value)}
          placeholder="Filtrar por usuario..."
          className="h-9 px-3 text-[12px] rounded-lg th-text-p th-bg-card"
          style={{ border:'1px solid var(--border)', outline:'none', minWidth:160 }}
          onFocus={e=>{e.target.style.borderColor='#0284C7'}}
          onBlur={e=>{e.target.style.borderColor='var(--border)'}}/>

        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          className="h-9 px-3 text-[12px] rounded-lg th-text-s th-bg-card"
          style={{ border:'1px solid var(--border)', outline:'none' }}>
          <option value="all">Todos los eventos</option>
          {Object.entries(EVENT_META).map(([k,v])=>(
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select value={filterSev} onChange={e=>setFilterSev(e.target.value)}
          className="h-9 px-3 text-[12px] rounded-lg th-text-s th-bg-card"
          style={{ border:'1px solid var(--border)', outline:'none' }}>
          <option value="all">Todas las severidades</option>
          {Object.entries(SEVERITY_META).map(([k,v])=>(
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {(filterType !== 'all' || filterSev !== 'all' || filterUser || search) && (
          <button onClick={()=>{ setSearch(''); setFilterType('all'); setFilterSev('all'); setFilterUser('') }}
            className="h-9 px-3 text-[12px] rounded-lg th-text-m flex items-center gap-1.5"
            style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>
            <X size={12}/>Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={16}/></div>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden"
            style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <table className="w-full text-[12px]" style={{ borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border-light)' }}>
                  {['Fecha / hora','Evento','Severidad','Usuario','IP','Mensaje'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold th-text-m uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const isAlert = log.severity === 'error' || log.severity === 'critical' || log.event_type === 'auth.login_failed'
                  return (
                    <tr key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom: i < logs.length-1 ? '1px solid var(--border-light)' : 'none',
                        background: isAlert ? 'rgba(239,68,68,.03)' : '',
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--row-hover-bg)'}
                      onMouseLeave={e=>e.currentTarget.style.background=isAlert?'rgba(239,68,68,.03)':''}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-[11px] th-text-m">{fmtDate(log.created_at)}</span>
                      </td>
                      <td className="px-4 py-3"><EventBadge event_type={log.event_type}/></td>
                      <td className="px-4 py-3"><SeverityDot severity={log.severity}/></td>
                      <td className="px-4 py-3 th-text-s max-w-[150px]">
                        <div className="truncate">{log.user_email || <span className="th-text-m">—</span>}</div>
                        {log.user_role && <div className="text-[10px] th-text-m">{log.user_role}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] th-text-m">{log.ip_address || '—'}</span>
                      </td>
                      <td className="px-4 py-3 th-text-s max-w-[280px]">
                        <div className="truncate">{log.message}</div>
                      </td>
                    </tr>
                  )
                })}
                {!logs.length && (
                  <tr><td colSpan="6" className="px-4 py-16 text-center text-[13px] th-text-m">
                    Sin eventos registrados con los filtros actuales
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-[12px] th-text-m">
              <span>{(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page+1)*PAGE_SIZE, total).toLocaleString()} de {total.toLocaleString()}</span>
              <div className="flex gap-1">
                <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
                  className="h-8 px-3 rounded-lg disabled:opacity-40 transition-colors"
                  style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>← Anterior</button>
                <span className="h-8 px-3 rounded-lg flex items-center"
                  style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  {page+1} / {totalPages}
                </span>
                <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}
                  className="h-8 px-3 rounded-lg disabled:opacity-40 transition-colors"
                  style={{ background:'var(--bg-base)', border:'1px solid var(--border)' }}>Siguiente →</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Drawer de detalle */}
      {selected && <MetaDrawer log={selected} onClose={()=>setSelected(null)}/>}
    </div>
  )
}
