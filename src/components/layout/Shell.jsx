import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FolderOpen, LogOut, RefreshCw, Menu, X, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSubmissionsStore } from '../../store/useSubmissionsStore'
import { APP_VERSION } from '../../version'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/orders',    icon: FolderOpen,      label: 'Visitas' },
  { to: '/submissions', icon: ClipboardList, label: 'Formularios' },
]

export default function Shell({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const logout    = useAuthStore((s) => s.logout)
  const user      = useAuthStore((s) => s.user)
  const load      = useSubmissionsStore((s) => s.load)
  const [mob, setMob] = useState(false)
  const refresh   = () => load(true)

  const pageTitle = NAV.find(n => location.pathname.startsWith(n.to))?.label || ''

  const navLink = (active) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
      active
        ? 'bg-white/10 text-white'
        : 'text-slate-400 hover:text-white hover:bg-white/6'
    }`

  const Sidebar = () => (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-[#0F172A] h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-[10px] tracking-wide">PTI</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-white leading-tight">TeleInspect</div>
          <div className="text-[10px] text-slate-500 leading-tight">Auditoría</div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/6 mb-3" />

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-0.5">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => navLink(isActive)}>
            <n.icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
            {n.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mx-4 h-px bg-white/6 mt-3 mb-3" />
      <div className="px-3 pb-5 space-y-1">
        {/* User pill */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-300 text-[9px] font-bold uppercase">
              {(user?.name || 'U')[0]}
            </span>
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
    <div className="min-h-[100dvh] bg-[#F1F5F9]">

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex min-h-[100dvh]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-12 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0">
            <span className="text-[14px] font-semibold text-slate-800">{pageTitle}</span>
            <button onClick={refresh}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <RefreshCw size={13} />
            </button>
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
        <header className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-white sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <button onClick={() => setMob(true)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md">
              <Menu size={18} />
            </button>
            <span className="text-[14px] font-semibold text-slate-800">{pageTitle}</span>
          </div>
          <button onClick={refresh} className="p-1.5 text-slate-400">
            <RefreshCw size={13} />
          </button>
        </header>
        <main className="flex-1 px-4 py-5 pb-20 animate-fade-in">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 grid grid-cols-3 z-50">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`
              }>
              <n.icon size={17} strokeWidth={1.8} />{n.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile drawer */}
        {mob && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMob(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0F172A] flex flex-col animate-slide-in shadow-2xl">
              <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/8">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <span className="text-white font-bold text-[9px]">PTI</span>
                  </div>
                  <span className="text-[13px] font-semibold text-white">TeleInspect</span>
                </div>
                <button onClick={() => setMob(false)} className="text-slate-400 hover:text-white p-1">
                  <X size={17} />
                </button>
              </div>
              <nav className="px-3 pt-3 flex-1 space-y-0.5">
                {NAV.map(n => (
                  <NavLink key={n.to} to={n.to} onClick={() => setMob(false)}
                    className={({ isActive }) => navLink(isActive)}>
                    <n.icon size={15} />{n.label}
                  </NavLink>
                ))}
              </nav>
              <div className="px-3 pb-5 border-t border-white/8 pt-3 mt-2 space-y-1">
                <button onClick={() => { logout(); navigate('/login'); setMob(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-slate-400 hover:text-red-400">
                  <LogOut size={14} />Salir
                </button>
                <div className="text-[9px] text-slate-600 px-3 pt-1">v{APP_VERSION}</div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
