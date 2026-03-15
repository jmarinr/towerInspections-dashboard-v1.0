import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FolderOpen, LogOut, RefreshCw, Menu, X, Sun, Moon, Wifi, WifiOff, AlertCircle, Users, Building2, ShieldCheck } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSubmissionsStore } from '../../store/useSubmissionsStore'
import { useThemeStore } from '../../store/useThemeStore'
import { APP_VERSION } from '../../version'

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Inicio' },
  { to: '/orders',      icon: FolderOpen,      label: 'Visitas' },
  { to: '/submissions', icon: ClipboardList,   label: 'Formularios' },
]

const NAV_ADMIN = [
  { to: '/admin/users',       icon: Users,       label: 'Usuarios' },
  { to: '/admin/companies',   icon: Building2,   label: 'Empresas' },
  { to: '/admin/permissions', icon: ShieldCheck, label: 'Permisos' },
]

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  return (
    <button
      onClick={toggle}
      title={theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: 'var(--text-muted)', background: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  )
}

// ── Realtime status badge ──────────────────────────────────────────────────
function RealtimeBadge() {
  const status = useSubmissionsStore((s) => s.realtimeStatus)
  const lastEvent = useSubmissionsStore((s) => s.lastRealtimeEvent)
  const [flash, setFlash] = useState(false)

  // Parpadear brevemente cuando llega un evento nuevo
  useEffect(() => {
    if (!lastEvent) return
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 1800)
    return () => clearTimeout(t)
  }, [lastEvent?.ts])

  const label = {
    connected:    'En vivo',
    connecting:   'Conectando',
    disconnected: 'Sin conexión',
    error:        'Error',
  }[status] ?? status

  const icon = status === 'connected'
    ? <Wifi size={11} />
    : status === 'error'
    ? <AlertCircle size={11} />
    : <WifiOff size={11} />

  const colors = {
    connected:    { bg: flash ? 'rgba(34,197,94,.18)' : 'rgba(34,197,94,.10)', color: '#16a34a' },
    connecting:   { bg: 'rgba(251,191,36,.10)', color: '#b45309' },
    disconnected: { bg: 'rgba(156,163,175,.10)', color: 'var(--text-muted)' },
    error:        { bg: 'rgba(239,68,68,.10)',   color: '#dc2626' },
  }[status] ?? {}

  return (
    <div
      title={`Realtime: ${label}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 600, padding: '2px 7px',
        borderRadius: 100, transition: 'background .4s',
        ...colors,
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}


function SideNavLink({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
      style={({ isActive }) => isActive
        ? { background: 'var(--sidebar-nav-active-bg)', color: 'var(--sidebar-nav-active-text)' }
        : { color: 'var(--sidebar-nav-text)' }
      }
      onMouseEnter={e => {
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
        if (!isActive) {
          e.currentTarget.style.background = 'var(--sidebar-nav-hover-bg)'
          e.currentTarget.style.color = 'var(--sidebar-action-hover)'
        }
      }}
      onMouseLeave={e => {
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
        if (isActive) {
          e.currentTarget.style.background = 'var(--sidebar-nav-active-bg)'
          e.currentTarget.style.color = 'var(--sidebar-nav-active-text)'
        } else {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--sidebar-nav-text)'
        }
      }}
    >
      <Icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
      {label}
    </NavLink>
  )
}

// ── Reusable sidebar content ─────────────────────────────────────────────────
function SidebarContent({ user, onRefresh, onLogout, onNavClick }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
          style={{ background: 'var(--accent)' }}>
          <span className="text-white font-bold text-[10px] tracking-wide">PTI</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold leading-tight" style={{ color: 'var(--sidebar-title)' }}>
            TeleInspect
          </div>
          <div className="text-[10px] leading-tight" style={{ color: 'var(--sidebar-sub)' }}>
            Auditoría
          </div>
        </div>
      </div>

      <div className="mx-4 h-px mb-3" style={{ background: 'var(--sidebar-divider)' }} />

      {/* Nav principal */}
      <nav className="px-3 flex-1 space-y-0.5">
        {NAV.map(n => (
          <SideNavLink key={n.to} to={n.to} icon={n.icon} label={n.label} onClick={onNavClick} />
        ))}
      </nav>

      {/* Nav admin — solo visible para admins */}
      {user?.role === 'admin' && (
        <>
          <div className="mx-4 h-px mt-2 mb-2" style={{ background: 'var(--sidebar-divider)' }} />
          <div className="px-4 mb-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Administración
            </span>
          </div>
          <nav className="px-3 space-y-0.5">
            {NAV_ADMIN.map(n => (
              <SideNavLink key={n.to} to={n.to} icon={n.icon} label={n.label} onClick={onNavClick} />
            ))}
          </nav>
        </>
      )}

      <div className="mx-4 h-px mt-3 mb-3" style={{ background: 'var(--sidebar-divider)' }} />

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-1">
        {/* User card */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'var(--sidebar-user-bg)' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(2,132,199,0.2)' }}>
            <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--accent)' }}>{(user?.name || 'U')[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium truncate" style={{ color: 'var(--sidebar-user-name)' }}>
              {user?.name || 'Usuario'}
            </div>
            <div className="text-[9px] truncate" style={{ color: 'var(--sidebar-user-role)' }}>
              {user?.role || ''}
            </div>
          </div>
        </div>

        {/* Refresh */}
        <button onClick={onRefresh}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors"
          style={{ color: 'var(--sidebar-action-text)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-nav-hover-bg)'; e.currentTarget.style.color = 'var(--sidebar-action-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-action-text)' }}>
          <RefreshCw size={13} />Actualizar
        </button>

        {/* Logout */}
        <button onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors"
          style={{ color: 'var(--sidebar-action-text)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'var(--sidebar-action-red)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-action-text)' }}>
          <LogOut size={13} />Salir
        </button>

        <div className="px-3 pt-1 text-[9px]" style={{ color: 'var(--sidebar-version)' }}>v{APP_VERSION}</div>
      </div>
    </div>
  )
}

export default function Shell({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const logout               = useAuthStore((s) => s.logout)
  const user                 = useAuthStore((s) => s.user)
  const load                 = useSubmissionsStore((s) => s.load)
  const subscribeRealtime    = useSubmissionsStore((s) => s.subscribeRealtime)
  const unsubscribeRealtime  = useSubmissionsStore((s) => s.unsubscribeRealtime)
  const { init }  = useThemeStore()
  const [mob, setMob] = useState(false)

  useEffect(() => { init() }, [])

  // Iniciar Realtime al montar el shell (usuario ya autenticado)
  useEffect(() => {
    subscribeRealtime()
    return () => { unsubscribeRealtime() }
  }, [])

  const refresh     = useCallback(() => load(true), [load])
  const handleLogout = useCallback(() => {
    unsubscribeRealtime()
    logout()
    navigate('/login')
  }, [logout, navigate, unsubscribeRealtime])

  const pageTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || ''

  const sidebarStyle = {
    background:  'var(--sidebar-bg)',
    borderRight: '1px solid var(--sidebar-border)',
  }

  return (
    <div className="min-h-[100dvh] th-bg-base">

      {/* ── DESKTOP ─────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex min-h-[100dvh]">
        <aside className="w-[220px] flex-shrink-0 h-screen sticky top-0" style={sidebarStyle}>
          <SidebarContent user={user} onRefresh={refresh} onLogout={handleLogout} />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 px-6 flex items-center justify-between flex-shrink-0"
            style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)' }}>
            <span className="text-[14px] font-semibold th-text-p">{pageTitle}</span>
            <div className="flex items-center gap-2">
              <RealtimeBadge />
              <ThemeToggle />
              <button onClick={refresh}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <RefreshCw size={13} />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1160px] mx-auto px-6 py-6 animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col min-h-[100dvh]">
        <header className="h-12 px-4 flex items-center justify-between sticky top-0 z-50"
          style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setMob(true)} className="p-1.5 rounded-md th-text-m">
              <Menu size={18} />
            </button>
            <span className="text-[14px] font-semibold th-text-p">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <RealtimeBadge />
            <ThemeToggle />
            <button onClick={refresh} className="p-1.5 th-text-m"><RefreshCw size={13} /></button>
            {/* Logout visible directo en mobile */}
            <button
              onClick={() => { if (window.confirm('¿Cerrar sesión?')) handleLogout() }}
              className="p-1.5 rounded-md transition-colors"
              title="Cerrar sesión"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-20 animate-fade-in">{children}</main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 h-14 grid grid-cols-3 z-50"
          style={{ background: 'var(--header-bg)', borderTop: '1px solid var(--border)' }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
              style={({ isActive }) => isActive ? { color: 'var(--accent)' } : { color: 'var(--text-muted)' }}>
              <n.icon size={17} strokeWidth={1.8} />{n.label}
            </NavLink>
          ))}
        </nav>

        {/* Drawer */}
        {mob && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={() => setMob(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 shadow-2xl animate-slide-in" style={sidebarStyle}>
              <div className="px-4 pt-4 pb-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--sidebar-divider)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent)' }}>
                    <span className="text-white font-bold text-[9px]">PTI</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--sidebar-title)' }}>TeleInspect</div>
                    <div className="text-[10px]" style={{ color: 'var(--sidebar-sub)' }}>Auditoría</div>
                  </div>
                </div>
                <button onClick={() => setMob(false)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--sidebar-action-text)', background: 'var(--sidebar-user-bg)' }}>
                  <X size={16} />
                </button>
              </div>
              <SidebarContent
                user={user}
                onRefresh={() => { refresh(); setMob(false) }}
                onLogout={() => { handleLogout(); setMob(false) }}
                onNavClick={() => setMob(false)}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
