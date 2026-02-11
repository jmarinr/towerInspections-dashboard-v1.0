import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import Button from '../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // small delay for UX
    await new Promise((r) => setTimeout(r, 300))

    const result = login({ username, password: pin })
    setLoading(false)

    if (result.ok) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-4">
            <Shield size={28} className="text-accent" />
          </div>
          <h1 className="text-white font-extrabold text-xl tracking-tight">PTI Admin Panel</h1>
          <p className="text-white/50 text-sm mt-1">Panel de supervisión de inspecciones</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-soft space-y-4">
          <div>
            <label className="block text-xs font-bold text-primary/60 mb-1.5">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: supervisor1"
              autoComplete="username"
              className="w-full rounded-2xl border border-primary/12 bg-surface px-4 py-3 text-sm text-primary placeholder:text-primary/35 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary/60 mb-1.5">PIN</label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-primary/12 bg-surface px-4 py-3 pr-12 text-sm text-primary placeholder:text-primary/35 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary/70 transition-colors"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-danger text-xs font-bold bg-danger-light rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full py-3" disabled={loading || !username || !pin}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>

          <div className="text-center text-[11px] text-primary/40 mt-2">
            Solo supervisores y testing tienen acceso
          </div>
        </form>

        <div className="text-center text-white/30 text-[11px] mt-6">
          PTI Inspect · Admin Panel v2.0
        </div>
      </div>
    </div>
  )
}
