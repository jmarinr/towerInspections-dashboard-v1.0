import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { LogIn, AlertCircle } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const result = login({ username, password })
    if (result?.ok) navigate('/dashboard')
    else setError(result?.message || 'Credenciales inválidas')
  }

  return (
    <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sidebar text-white flex items-center justify-center mx-auto mb-4 shadow-elevated">
            <span className="font-black text-lg">PTI</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">TeleInspect</h1>
          <p className="text-[13px] text-gray-400 mt-1">Panel de Supervisión</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                className="w-full px-3 py-2.5 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                className="w-full px-3 py-2.5 text-[13px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <span className="text-[12px] text-red-700">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-sidebar hover:bg-teal-800 text-white font-semibold text-[13px] py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <LogIn size={15} /> Iniciar sesión
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Phoenix Tower International · Panel de Supervisión
        </p>
      </div>
    </div>
  )
}
