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
    <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <span className="font-black text-lg">PTI</span>
          </div>
          <h1 className="text-xl font-bold text-white">TeleInspect</h1>
          <p className="text-sm text-gray-500 mt-1">Panel de Auditoría</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Usuario</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ingrese su usuario"
                className="w-full px-3.5 py-2.5 text-[13px] bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all" autoFocus />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingrese su PIN"
                className="w-full px-3.5 py-2.5 text-[13px] bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all" />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-[12px] text-red-400">{error}</span>
              </div>
            )}
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[13px] py-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
              <LogIn size={15} /> Iniciar sesión
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] text-gray-600 mt-6">Phoenix Tower International</p>
      </div>
    </div>
  )
}
