import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Submissions from './pages/Submissions'
import SubmissionDetail from './pages/SubmissionDetail'
import Companies from './pages/admin/Companies'
import Users from './pages/admin/Users'
import Permissions from './pages/admin/Permissions'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'
import Shell from './components/layout/Shell'
import Spinner from './components/ui/Spinner'

function RequireAuth({ children }) {
  const { isAuthed, isLoading } = useAuthStore()
  const location = useLocation()
  if (isLoading) return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <Spinner size={18}/>
    </div>
  )
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function RequireAdmin({ children }) {
  const user = useAuthStore(s => s.user)
  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function Page({ children }) {
  return <RequireAuth><Shell>{children}</Shell></RequireAuth>
}

function AdminPage({ children }) {
  return <RequireAuth><RequireAdmin><Shell>{children}</Shell></RequireAdmin></RequireAuth>
}

export default function App() {
  const { isAuthed, isLoading, init } = useAuthStore()
  const themeInit = useThemeStore((s) => s.init)

  useEffect(() => {
    themeInit()
    init()   // Inicializa Supabase Auth y carga perfil
  }, [])

  if (isLoading) return (
    <div className="min-h-[100dvh] flex items-center justify-center th-bg-base">
      <Spinner size={20}/>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />

      {/* Rutas principales */}
      <Route path="/dashboard"                    element={<Page><Dashboard /></Page>} />
      <Route path="/orders"                       element={<Page><Orders /></Page>} />
      <Route path="/orders/:orderId"              element={<Page><OrderDetail /></Page>} />
      <Route path="/submissions"                  element={<Page><Submissions /></Page>} />
      <Route path="/submissions/:submissionId"    element={<Page><SubmissionDetail /></Page>} />

      {/* Rutas de administración — solo admin */}
      <Route path="/admin/users"                  element={<AdminPage><Users /></AdminPage>} />
      <Route path="/admin/companies"              element={<AdminPage><Companies /></AdminPage>} />
      <Route path="/admin/permissions"            element={<AdminPage><Permissions /></AdminPage>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
