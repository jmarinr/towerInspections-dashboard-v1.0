import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Submissions from './pages/Submissions'
import SubmissionDetail from './pages/SubmissionDetail'
import { useAuthStore } from './store/useAuthStore'
import Shell from './components/layout/Shell'

function RequireAuth({ children }) {
  const isAuthed = useAuthStore((s) => s.isAuthed)
  const location = useLocation()
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function Page({ children }) {
  return <RequireAuth><Shell>{children}</Shell></RequireAuth>
}

export default function App() {
  const isAuthed = useAuthStore((s) => s.isAuthed)

  return (
    <Routes>
      <Route path="/login" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />

      <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
      <Route path="/orders" element={<Page><Orders /></Page>} />
      <Route path="/orders/:orderId" element={<Page><OrderDetail /></Page>} />
      <Route path="/submissions" element={<Page><Submissions /></Page>} />
      <Route path="/submissions/:submissionId" element={<Page><SubmissionDetail /></Page>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
