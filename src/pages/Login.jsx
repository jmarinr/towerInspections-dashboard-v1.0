import { useState } from 'react'
import { Shield, ArrowRight } from 'lucide-react'
import Input from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import { useAuthStore } from '../store/useAuthStore.js'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login({ username, password })
    setLoading(false)
    if (!res.ok) return setError(res.message || 'No se pudo iniciar sesión')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-[100dvh] grid place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3 justify-center">
          <div className="w-12 h-12 rounded-3xl bg-primary text-white flex items-center justify-center shadow-soft">
            <Shield size={20} />
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold text-primary leading-tight">Proyecto PTI Admin Panel</div>
            <div className="text-xs text-primary/60">v1.1.0 · Acceso Supervisor</div>
          </div>
        </div>

        <Card className="p-5">
          <div className="mb-4">
            <div className="text-sm font-extrabold text-primary">Iniciar sesión</div>
            <div className="text-xs text-primary/60 mt-1">
              Credenciales temporales: <span className="font-bold">111111 / 111111</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: 111111"
              autoComplete="username"
            />
            <Input
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              type="password"
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-2xl bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger font-bold">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Validando…' : 'Entrar'} <ArrowRight size={18} />
            </Button>
          </form>
        </Card>

        <div className="mt-4 text-center text-[11px] text-primary/55">
          Demo UI (sin backend). Luego conectamos a API para consultar órdenes, fotos e informe.
        </div>
      </div>
    </div>
  )
}
