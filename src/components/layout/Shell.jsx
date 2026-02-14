import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, FileText, LogOut, Shield, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSubmissionsStore } from '../../store/useSubmissionsStore'

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
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const load = useSubmissionsStore((s) => s.load)

  const handleRefresh = () => load(true)

  return (
    <div className="min-h-[100dvh]">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[260px_1fr] min-h-[100dvh]">
        <aside className="bg-white border-r border-primary/8 p-4 flex flex-col">
          <div className="flex items-center gap-3 px-2 py-2 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-soft">
              <Shield size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-primary leading-tight text-sm">PTI Admin</div>
              <div className="text-[11px] text-primary/60 truncate">{user?.roleLabel} · {user?.name}</div>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1">
            <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <SidebarLink to="/orders" icon={FileText} label="Órdenes" />
            <SidebarLink to="/submissions" icon={ClipboardList} label="Submissions" />
          </nav>

          <div className="space-y-1.5 pt-4 border-t border-primary/8">
            <button
              onClick={handleRefresh}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-sm text-primary/70 hover:bg-primary/5 transition-all"
            >
              <div className="w-9 h-9 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                <RefreshCw size={16} />
              </div>
              <div>Actualizar datos</div>
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-sm text-danger hover:bg-danger/5 transition-all"
            >
              <div className="w-9 h-9 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
                <LogOut size={16} />
              </div>
              <div>Salir</div>
            </button>
          </div>
        </aside>

        <main className="p-5 lg:p-6 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <header className="bg-primary sticky top-0 z-50">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div>
              <div className="text-white font-extrabold leading-tight text-sm">PTI Admin Panel</div>
              <div className="text-white/60 text-[11px]">{user?.roleLabel} · {user?.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center active:scale-95 transition-all"
                aria-label="Actualizar"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => { logout(); navigate('/login') }}
                className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center active:scale-95 transition-all"
                aria-label="Salir"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-3 pb-24">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-primary/8 p-2 z-50">
          <div className="grid grid-cols-3 gap-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `h-12 rounded-2xl flex items-center justify-center gap-1.5 font-extrabold text-xs ${
                  isActive ? 'bg-accent text-primary shadow-soft' : 'bg-primary/5 text-primary/70'
                }`
              }
            >
              <LayoutDashboard size={16} /> Dashboard
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `h-12 rounded-2xl flex items-center justify-center gap-1.5 font-extrabold text-xs ${
                  isActive ? 'bg-accent text-primary shadow-soft' : 'bg-primary/5 text-primary/70'
                }`
              }
            >
              <FileText size={16} /> Órdenes
            </NavLink>
            <NavLink
              to="/submissions"
              className={({ isActive }) =>
                `h-12 rounded-2xl flex items-center justify-center gap-1.5 font-extrabold text-xs ${
                  isActive ? 'bg-accent text-primary shadow-soft' : 'bg-primary/5 text-primary/70'
                }`
              }
            >
              <ClipboardList size={16} /> Formularios
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  )
}
