import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import ReportView from './pages/ReportView.jsx'
import { useAuthStore } from './store/useAuthStore.js'
import Shell from './components/layout/Shell.jsx'

function RequireAuth({ children }) {
  const isAuthed = useAuthStore(s => s.isAuthed)
  const location = useLocation()
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  const isAuthed = useAuthStore(s => s.isAuthed)

  return (
    <Routes>
      <Route path="/login" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/"
        element={<Navigate to={isAuthed ? "/dashboard" : "/login"} replace />}
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Shell>
              <Dashboard />
            </Shell>
          </RequireAuth>
        }
      />

      <Route
        path="/orders"
        element={
          <RequireAuth>
            <Shell>
              <Orders />
            </Shell>
          </RequireAuth>
        }
      />

      <Route
        path="/orders/:orderId"
        element={
          <RequireAuth>
            <Shell>
              <OrderDetail />
            </Shell>
          </RequireAuth>
        }
      />

      <Route
        path="/orders/:orderId/report"
        element={
          <RequireAuth>
            <ReportView />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
