import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { AlertCircle, Shield } from 'lucide-react'
import { APP_VERSION } from '../version'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword]  = useState('')
  const [error, setError]        = useState('')
  const [loading, setLoading]    = useState(false)
  const login    = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Pequeño delay para que el botón no parpadee en credenciales rápidas
    setTimeout(() => {
      const r = login({ username, password })
      if (r?.ok) {
        navigate('/dashboard')
      } else {
        setError(r?.message || 'Credenciales inválidas')
        setLoading(false)
      }
    }, 180)
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: '#f0f4f8' }}>

      {/* Card contenedor */}
      <div className="w-full max-w-[820px] rounded-2xl overflow-hidden flex shadow-elevated"
        style={{ minHeight: 480 }}>

        {/* ── Panel izquierdo — navy ───────────────────────────────────────── */}
        <div className="hidden md:flex flex-col justify-between p-10 flex-1"
          style={{ background: '#0d2137' }}>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#00b4a0' }}>
              <span className="text-white font-bold text-[11px] tracking-wide">PTI</span>
            </div>
            <div>
              <div className="text-white font-semibold text-[15px] leading-tight">TeleInspect</div>
              <div className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Panel de supervisión
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <h1 className="text-white font-semibold text-[22px] leading-snug mb-2">
              Inspecciones de campo,<br />centralizadas y en tiempo real
            </h1>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Plataforma de gestión y auditoría para supervisores de Phoenix Tower International
            </p>

            {/* Stats */}
            <div className="flex gap-6 mt-8">
              {[
                { num: '5', lbl: 'Países activos' },
                { num: '6', lbl: 'Tipos de formulario' },
                { num: '100%', lbl: 'Auditable' },
              ].map(({ num, lbl }) => (
                <div key={lbl} style={{ borderTop: '2px solid rgba(0,180,160,0.4)', paddingTop: 10 }}>
                  <div className="text-white font-semibold text-[20px]">{num}</div>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5"
                    style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '.06em' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Version */}
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.18)' }}>v{APP_VERSION}</p>
        </div>

        {/* ── Panel derecho — formulario ───────────────────────────────────── */}
        <div className="flex flex-col justify-center p-8 md:p-10 w-full md:w-[340px] flex-shrink-0"
          style={{ background: '#ffffff' }}>

          {/* Logo mobile only */}
          <div className="flex items-center gap-2.5 mb-8 md:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#00b4a0' }}>
              <span className="text-white font-bold text-[10px]">PTI</span>
            </div>
            <span className="font-semibold text-[15px]" style={{ color: '#0d2137' }}>TeleInspect</span>
          </div>

          <h2 className="font-semibold text-[20px] mb-1" style={{ color: '#0d2137' }}>
            Bienvenido
          </h2>
          <p className="text-[13px] mb-7" style={{ color: '#7a8fa0' }}>
            Ingresa tus credenciales para continuar
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-[12px] px-3 py-2.5 rounded-lg mb-4"
              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#7a8fa0',
                textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                style={{
                  height: 38, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e2e8f0', fontSize: 13,
                  color: '#0d2137', background: '#f8fafc',
                  outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s',
                }}
                onFocus={e  => e.target.style.borderColor = '#00b4a0'}
                onBlur={e   => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#7a8fa0',
                textTransform: 'uppercase', letterSpacing: '.05em' }}>
                PIN
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  height: 38, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e2e8f0', fontSize: 13,
                  color: '#0d2137', background: '#f8fafc',
                  outline: 'none', fontFamily: 'inherit', transition: 'border-color .15s',
                }}
                onFocus={e  => e.target.style.borderColor = '#00b4a0'}
                onBlur={e   => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 40, borderRadius: 8, border: 'none',
                background: loading ? '#7a8fa0' : '#00b4a0',
                color: '#ffffff', fontWeight: 600, fontSize: 14,
                fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background .15s, opacity .15s',
                marginTop: 4,
              }}
            >
              {loading ? 'Verificando…' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Nota de seguridad */}
          <div className="flex items-center justify-center gap-1.5 mt-6"
            style={{ fontSize: 10, color: '#7a8fa0' }}>
            <Shield size={11} />
            Sesión cifrada · Expira en 8 h
          </div>
        </div>
      </div>
    </div>
  )
}
