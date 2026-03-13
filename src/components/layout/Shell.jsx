import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FolderOpen, LogOut, RefreshCw, Menu, X, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSubmissionsStore } from '../../store/useSubmissionsStore'
import { useThemeStore } from '../../store/useThemeStore'
import { APP_VERSION } from '../../version'

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Inicio' },
  { to: '/orders',      icon: FolderOpen,      label: 'Visitas' },
  { to: '/submissions', icon: ClipboardList,   label: 'Formularios' },
]

function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  return (
    <button
      onClick={toggle}
      title={theme === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
      className="p-1.5 rounded-lg transition-colors"
      style={{
        color: 'var(--text-muted)',
        background: 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  )
}

export default function Shell({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const logout    = useAuthStore((s) => s.logout)
  const user      = useAuthStore((s) => s.user)
  const load      = useSubmissionsStore((s) => s.load)
  const { theme, init } = useThemeStore()
  const [mob, setMob] = useState(false)

  // Apply theme on mount
  useEffect(() => { init() }, [])

  const refresh   = () => load(true)
  const pageTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || ''

  // Sidebar nav link style (always on dark sidebar)
  const sideNavLink = (active) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
      active
        ? 'bg-white/10 text-white'
        : 'text-slate-400 hover:text-white hover:bg-white/6'
    }`

  // Drawer nav link style (on light/dark card)
  const drawerNavLink = (active) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
      active
        ? 'text-indigo-600'
        : ''
    }`

  const Sidebar = () => (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full" style={{ background: 'var(--bg-sidebar)' }}>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-white font-bold text-[10px] tracking-wide">PTI</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-white leading-tight">TeleInspect</div>
          <div className="text-[10px] text-slate-500 leading-tight">Auditoría</div>
        </div>
      </div>

      <div className="mx-4 h-px mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-0.5">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => sideNavLink(isActive)}>
            <n.icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-4 h-px mt-3 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-300 text-[9px] font-bold uppercase">{(user?.name || 'U')[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-slate-300 truncate">{user?.name || 'Usuario'}</div>
            <div className="text-[9px] text-slate-500 truncate">{user?.role || ''}</div>
          </div>
        </div>
        <button onClick={refresh}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-slate-400 hover:text-slate-200 hover:bg-white/6 transition-colors">
          <RefreshCw size={13} />Actualizar
        </button>
        <button onClick={() => { logout(); navigate('/login') }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-slate-400 hover:text-red-400 hover:bg-red-500/8 transition-colors">
          <LogOut size={13} />Salir
        </button>
        <div className="px-3 pt-1 text-[9px] text-slate-600">v{APP_VERSION}</div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-[100dvh] th-bg-base">

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex min-h-[100dvh]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 px-6 flex items-center justify-between flex-shrink-0"
            style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--header-border)' }}>
            <span className="text-[14px] font-semibold th-text-p">{pageTitle}</span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button onClick={refresh}
                className="p-1.5 rounded-lg transition-colors th-text-m hover:th-text-s"
                style={{ color: 'var(--text-muted)' }}>
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

      {/* ── MOBILE ── */}
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
            <ThemeToggle />
            <button onClick={refresh} className="p-1.5 th-text-m"><RefreshCw size={13} /></button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-20 animate-fade-in">{children}</main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 h-14 grid grid-cols-3 z-50"
          style={{ background: 'var(--header-bg)', borderTop: '1px solid var(--border)' }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors
                ${isActive ? 'text-indigo-500' : ''}`
              }
              style={({ isActive }) => isActive ? {} : { color: 'var(--text-muted)' }}>
              <n.icon size={17} strokeWidth={1.8} />{n.label}
            </NavLink>
          ))}
        </nav>

        {/* Drawer */}
        {mob && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMob(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col animate-slide-in shadow-2xl"
              style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>

              <div className="px-4 pt-4 pb-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <span className="text-white font-bold text-[9px]">PTI</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold th-text-p">TeleInspect</div>
                    <div className="text-[10px] th-text-m">Auditoría</div>
                  </div>
                </div>
                <button onClick={() => setMob(false)}
                  className="p-1.5 rounded-md th-text-m hover:th-text-p transition-colors"
                  style={{ background: 'var(--bg-base)' }}>
                  <X size={16} />
                </button>
              </div>

              <nav className="px-3 pt-3 flex-1 space-y-0.5">
                {NAV.map(n => (
                  <NavLink key={n.to} to={n.to} onClick={() => setMob(false)}
                    className={({ isActive }) => drawerNavLink(isActive)}
                    style={({ isActive }) => isActive
                      ? { background: 'var(--accent-light)', color: 'var(--accent-text)' }
                      : { color: 'var(--text-secondary)' }
                    }
                    onMouseEnter={e => { if (!e.currentTarget.classList.contains('text-indigo-600')) e.currentTarget.style.background = 'var(--bg-base)' }}
                    onMouseLeave={e => { if (!e.currentTarget.classList.contains('text-indigo-600')) e.currentTarget.style.background = 'transparent' }}>
                    <n.icon size={15} strokeWidth={1.8} className="flex-shrink-0" />{n.label}
                  </NavLink>
                ))}
              </nav>

              <div className="px-3 pb-5 space-y-1 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 px-3 py-2.5 mt-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 text-[10px] font-bold uppercase">{(user?.name || 'U')[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold th-text-p truncate">{user?.name || 'Usuario'}</div>
                    <div className="text-[10px] th-text-m">{user?.role || ''}</div>
                  </div>
                </div>
                <button onClick={() => { logout(); navigate('/login'); setMob(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors th-text-m hover:text-red-500"
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-base)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <LogOut size={14} />Salir
                </button>
                <div className="text-[9px] th-text-m px-3 pt-1">v{APP_VERSION}</div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
