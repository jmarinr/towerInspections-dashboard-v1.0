import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FolderOpen, LogOut, RefreshCw, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSubmissionsStore } from '../../store/useSubmissionsStore'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/orders', icon: FolderOpen, label: 'Visitas' },
  { to: '/submissions', icon: ClipboardList, label: 'Formularios' },
]

function SidebarLink({ to, icon: Icon, label }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
        }`
      }>
      <Icon size={18} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Shell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const load = useSubmissionsStore((s) => s.load)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const handleRefresh = () => load(true)

  const pageTitle = location.pathname.startsWith('/dashboard') ? 'Inicio'
    : location.pathname.startsWith('/orders') ? 'Visitas'
    : location.pathname.startsWith('/submissions') ? 'Formularios'
    : 'TeleInspect'

  return (
    <div className="min-h-[100dvh]">
      {/* DESKTOP */}
      <div className="hidden lg:grid lg:grid-cols-[220px_1fr] min-h-[100dvh]">
        <aside className="bg-sidebar flex flex-col border-r border-gray-800">
          {/* Brand */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <span className="text-white font-black text-[11px]">PTI</span>
              </div>
              <div>
                <div className="text-white font-semibold text-[13px] leading-tight">TeleInspect</div>
                <div className="text-gray-500 text-[10px]">Auditoría</div>
              </div>
            </div>
          </div>

          <nav className="px-3 flex-1 space-y-0.5 mt-2">
            <div className="text-[9px] font-semibold text-gray-600 uppercase tracking-[0.15em] px-3 mb-2">Menú</div>
            {NAV_ITEMS.map(item => <SidebarLink key={item.to} {...item} />)}
          </nav>

          {/* User */}
          <div className="px-3 pb-4 border-t border-gray-800 pt-3 mx-3 mt-2 space-y-1">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-gray-300 text-[11px] font-medium truncate">{user?.name || 'Usuario'}</div>
                <div className="text-gray-600 text-[9px] truncate">{user?.roleLabel || 'Supervisor'}</div>
              </div>
            </div>
            <button onClick={handleRefresh} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all">
              <RefreshCw size={13} /> Actualizar
            </button>
            <button onClick={() => { logout(); navigate('/login') }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-all">
              <LogOut size={13} /> Salir
            </button>
          </div>
        </aside>

        <main className="bg-surface overflow-y-auto">
          <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-8 py-3.5 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <h1 className="text-[15px] font-semibold text-gray-800">{pageTitle}</h1>
              <button onClick={handleRefresh} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors" title="Actualizar">
                <RefreshCw size={14} />
              </button>
            </div>
          </header>
          <div className="p-6 lg:p-8 animate-fadeIn">{children}</div>
        </main>
      </div>

      {/* MOBILE */}
      <div className="lg:hidden">
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                <Menu size={18} />
              </button>
              <span className="text-sm font-semibold text-gray-800">{pageTitle}</span>
            </div>
            <button onClick={handleRefresh} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        <main className="p-4 pb-20 bg-surface min-h-[calc(100dvh-57px)] animate-fadeIn">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 px-2 py-1.5 z-50">
          <div className="grid grid-cols-3 gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all ${
                      isActive ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'
                    }`
                  }>
                  <Icon size={18} strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col animate-slideIn">
              <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <span className="text-white font-black text-xs">PTI</span>
                  </div>
                  <span className="text-white font-semibold text-sm">TeleInspect</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <nav className="px-3 flex-1 space-y-0.5">
                {NAV_ITEMS.map(item => (
                  <NavLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:bg-white/5'}`}>
                    <item.icon size={18} strokeWidth={1.8} />{item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="px-4 pb-5 border-t border-gray-800 pt-3 mx-2">
                <button onClick={() => { logout(); navigate('/login'); setMobileMenuOpen(false) }} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400/70 hover:bg-red-500/10">
                  <LogOut size={18} /> Salir
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
