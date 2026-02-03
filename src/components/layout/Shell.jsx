import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, LogOut, Shield } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore.js'

function SidebarLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-sm transition-all ${
          isActive ? 'bg-accent text-primary shadow-soft' : 'text-primary/80 hover:bg-primary/5'
        }`
      }
    >
      <div className="w-9 h-9 rounded-2xl bg-white/60 border border-primary/10 flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>{label}</div>
    </NavLink>
  )
}

export default function Shell({ children }) {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user)

  return (
    <div className="min-h-[100dvh]">
      {/* Desktop/tablet layout */}
      <div className="hidden md:grid md:grid-cols-[280px_1fr] min-h-[100dvh]">
        <aside className="bg-white border-r border-primary/10 p-4">
          <div className="flex items-center gap-3 px-2 py-2 mb-4">
            <div className="w-11 h-11 rounded-3xl bg-primary text-white flex items-center justify-center shadow-soft">
              <Shield size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-primary leading-tight">Módulo de Inspecciones HenkanCX -Admin Panel</div>
              <div className="text-xs text-primary/60 truncate">Supervisor · {user?.username}</div>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <SidebarLink to="/orders" icon={ClipboardList} label="Órdenes" />
          </nav>

          <div className="mt-6 pt-4 border-t border-primary/10">
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-sm text-danger hover:bg-danger/5 transition-all"
            >
              <div className="w-9 h-9 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
                <LogOut size={18} />
              </div>
              <div>Salir</div>
            </button>
          </div>
        </aside>

        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <header className="bg-primary sticky top-0 z-50">
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <div className="text-white font-extrabold leading-tight">Módulo de Inspecciones HenkanCX -Admin Panel</div>
              <div className="text-white/70 text-xs">Supervisor · {user?.username}</div>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="w-11 h-11 rounded-2xl bg-white/10 text-white flex items-center justify-center active:scale-95 transition-all"
              aria-label="Salir"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="p-3 pb-24">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-primary/10 p-2 z-50">
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `h-12 rounded-2xl flex items-center justify-center gap-2 font-extrabold ${
                  isActive ? 'bg-accent text-primary shadow-soft' : 'bg-primary/5 text-primary/80'
                }`
              }
            >
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `h-12 rounded-2xl flex items-center justify-center gap-2 font-extrabold ${
                  isActive ? 'bg-accent text-primary shadow-soft' : 'bg-primary/5 text-primary/80'
                }`
              }
            >
              <ClipboardList size={18} /> Órdenes
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  )
}
