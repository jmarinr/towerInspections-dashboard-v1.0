import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FileText, LogOut, RefreshCw, ChevronRight, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSubmissionsStore } from '../../store/useSubmissionsStore'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'GENERAL' },
  { to: '/orders', icon: FileText, label: 'Órdenes', section: 'GENERAL' },
  { to: '/submissions', icon: ClipboardList, label: 'Formularios', section: 'GENERAL' },
]

function SidebarLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-white/65 hover:bg-white/8 hover:text-white/90'
        }`
      }
    >
      <Icon size={18} strokeWidth={1.8} />
      <span className="flex-1">{label}</span>
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

  // Current page title
  const pageTitle = location.pathname.startsWith('/dashboard') ? 'Dashboard'
    : location.pathname.startsWith('/orders') ? 'Órdenes de Visita'
    : location.pathname.startsWith('/submissions') ? 'Formularios'
    : 'PTI Admin'

  return (
    <div className="min-h-[100dvh]">
      {/* ═══ DESKTOP ═══ */}
      <div className="hidden lg:grid lg:grid-cols-[240px_1fr] min-h-[100dvh]">
        {/* Sidebar */}
        <aside className="bg-sidebar flex flex-col">
          {/* Brand */}
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <span className="text-white font-black text-sm">PTI</span>
              </div>
              <div>
                <div className="text-white font-bold text-[13px] leading-tight">TeleInspect</div>
                <div className="text-white/45 text-[10px] font-medium">Panel de Supervisión</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 flex-1 space-y-0.5">
            <div className="text-[10px] font-semibold text-white/35 uppercase tracking-widest px-3 mb-2">General</div>
            {NAV_ITEMS.map(item => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>

          {/* User footer */}
          <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3 mx-3 mt-3">
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white text-[11px] font-bold">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white/90 text-[12px] font-medium truncate">{user?.name || 'Usuario'}</div>
                <div className="text-white/40 text-[10px] truncate">{user?.roleLabel || 'Supervisor'}</div>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-white/55 hover:bg-white/8 hover:text-white/80 transition-all"
            >
              <RefreshCw size={15} strokeWidth={1.8} />
              Actualizar datos
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium text-red-300/70 hover:bg-red-500/10 hover:text-red-300 transition-all"
            >
              <LogOut size={15} strokeWidth={1.8} />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="bg-surface overflow-y-auto">
          {/* Top bar */}
          <header className="bg-white border-b border-gray-200/60 px-8 py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <h1 className="text-[15px] font-semibold text-gray-800">{pageTitle}</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                  title="Actualizar"
                >
                  <RefreshCw size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          </header>
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* ═══ MOBILE / TABLET ═══ */}
      <div className="lg:hidden">
        <header className="bg-white border-b border-gray-200/60 sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                <Menu size={18} />
              </button>
              <div>
                <div className="text-sm font-semibold text-gray-800">{pageTitle}</div>
                <div className="text-[10px] text-gray-400 font-medium">{user?.name}</div>
              </div>
            </div>
            <button onClick={handleRefresh} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        <main className="p-4 pb-20 bg-surface min-h-[calc(100dvh-57px)]">{children}</main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200/60 px-3 py-2 z-50">
          <div className="grid grid-cols-3 gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all ${
                      isActive ? 'text-teal-700 bg-teal-50' : 'text-gray-400 hover:text-gray-600'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Mobile slide-out menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar flex flex-col animate-slideIn">
              <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <span className="text-white font-black text-xs">PTI</span>
                  </div>
                  <span className="text-white font-bold text-sm">TeleInspect</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-white/50 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <nav className="px-3 flex-1 space-y-0.5">
                {NAV_ITEMS.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/8'
                      }`
                    }
                  >
                    <item.icon size={18} strokeWidth={1.8} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="px-3 pb-5 border-t border-white/10 pt-3 mx-3">
                <button
                  onClick={() => { logout(); navigate('/login'); setMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-300/70 hover:bg-red-500/10"
                >
                  <LogOut size={18} strokeWidth={1.8} />
                  Cerrar sesión
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
