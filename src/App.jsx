import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
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

export default function App() {
  const isAuthed = useAuthStore((s) => s.isAuthed)

  return (
    <Routes>
      <Route path="/login" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Shell><Dashboard /></Shell>
          </RequireAuth>
        }
      />

      <Route
        path="/submissions"
        element={
          <RequireAuth>
            <Shell><Submissions /></Shell>
          </RequireAuth>
        }
      />

      <Route
        path="/submissions/:submissionId"
        element={
          <RequireAuth>
            <Shell><SubmissionDetail /></Shell>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
