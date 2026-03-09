import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { AlertCircle } from 'lucide-react'
import { APP_VERSION } from '../version'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const submit = (e) => { e.preventDefault(); setError(''); const r = login({ username, password }); r?.ok ? navigate('/dashboard') : setError(r?.message || 'Credenciales inválidas') }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-[340px]">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center"><span className="text-white font-bold text-[9px]">PTI</span></div>
          <span className="text-base font-semibold text-gray-900">TeleInspect</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Iniciar sesión</h1>
        <p className="text-sm text-gray-500 mb-6">Panel de auditoría de inspecciones</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-shadow" />
          </div>
          {error && <div className="flex items-center gap-2 text-sm text-danger"><AlertCircle size={14}/>{error}</div>}
          <button type="submit" className="w-full h-9 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-md transition-colors">Continuar</button>
        </form>
        <p className="mt-8 text-center text-[10px] text-gray-300">v{APP_VERSION}</p>
      </div>
    </div>
  )
}
