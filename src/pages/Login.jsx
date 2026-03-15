import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { AlertCircle, Shield } from 'lucide-react'
import { APP_VERSION } from '../version'

// ─── Animación SVG de infraestructura de telecomunicaciones ──────────────────
function TelecomAnimation() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      pointerEvents: 'none', opacity: 0.18,
    }}>
      <svg
        width="100%" height="100%"
        viewBox="0 0 480 520"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Ondas de radio */}
          <style>{`
            @keyframes pulse-ring {
              0%   { r: 4;  opacity: .9; }
              100% { r: 48; opacity: 0; }
            }
            @keyframes pulse-ring2 {
              0%   { r: 4;  opacity: .9; }
              100% { r: 72; opacity: 0; }
            }
            @keyframes data-flow {
              0%   { stroke-dashoffset: 200; opacity: 0; }
              10%  { opacity: 1; }
              90%  { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes node-blink {
              0%, 100% { opacity: .6; }
              50%       { opacity: 1; }
            }
            @keyframes tower-glow {
              0%, 100% { filter: drop-shadow(0 0 2px #00b4a0); }
              50%       { filter: drop-shadow(0 0 8px #00b4a0); }
            }
            @keyframes signal-arc {
              0%   { stroke-dashoffset: 60; opacity: 0; }
              15%  { opacity: .8; }
              85%  { opacity: .8; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            .t1-pulse { animation: pulse-ring 2.8s ease-out infinite; }
            .t1-pulse2 { animation: pulse-ring 2.8s ease-out infinite .9s; }
            .t2-pulse { animation: pulse-ring 3.2s ease-out infinite .4s; }
            .t2-pulse2 { animation: pulse-ring 3.2s ease-out infinite 1.3s; }
            .t3-pulse { animation: pulse-ring2 3.8s ease-out infinite 1.1s; }
            .t3-pulse2 { animation: pulse-ring2 3.8s ease-out infinite 2.2s; }
            .line1 { stroke-dasharray: 200; animation: data-flow 3.5s linear infinite; }
            .line2 { stroke-dasharray: 200; animation: data-flow 3.5s linear infinite 1.2s; }
            .line3 { stroke-dasharray: 200; animation: data-flow 3.8s linear infinite 0.6s; }
            .line4 { stroke-dasharray: 200; animation: data-flow 4s linear infinite 2s; }
            .nd { animation: node-blink 2s ease-in-out infinite; }
            .nd2 { animation: node-blink 2s ease-in-out infinite .7s; }
            .nd3 { animation: node-blink 2.4s ease-in-out infinite 1.4s; }
            .twr { animation: tower-glow 3s ease-in-out infinite; }
            .arc1 { stroke-dasharray: 60; animation: signal-arc 2.2s ease-in-out infinite; }
            .arc2 { stroke-dasharray: 60; animation: signal-arc 2.2s ease-in-out infinite .7s; }
            .arc3 { stroke-dasharray: 90; animation: signal-arc 2.6s ease-in-out infinite 1.3s; }
            .arc4 { stroke-dasharray: 90; animation: signal-arc 2.6s ease-in-out infinite 2s; }
            .arc5 { stroke-dasharray: 120; animation: signal-arc 3s ease-in-out infinite .4s; }
            .arc6 { stroke-dasharray: 120; animation: signal-arc 3s ease-in-out infinite 1.8s; }
          `}</style>
        </defs>

        {/* ── Torre 1 — izquierda media ─────────────────────────────── */}
        <g className="twr" transform="translate(90, 280)">
          {/* Base */}
          <line x1="-22" y1="100" x2="0" y2="0" stroke="#00b4a0" strokeWidth="1.5"/>
          <line x1="22"  y1="100" x2="0" y2="0" stroke="#00b4a0" strokeWidth="1.5"/>
          <line x1="-22" y1="100" x2="22" y2="100" stroke="#00b4a0" strokeWidth="1.5"/>
          {/* Celosías */}
          <line x1="-16" y1="75"  x2="16"  y2="55"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="16"  y1="75"  x2="-16" y2="55"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="-10" y1="50"  x2="10"  y2="30"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="10"  y1="50"  x2="-10" y2="30"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          {/* Mástil */}
          <line x1="0" y1="0" x2="0" y2="-28" stroke="#00b4a0" strokeWidth="2"/>
          {/* Antenas laterales */}
          <line x1="-8" y1="-8" x2="-20" y2="-22" stroke="#2dd4bf" strokeWidth="1.2"/>
          <line x1="8"  y1="-8" x2="20"  y2="-22" stroke="#2dd4bf" strokeWidth="1.2"/>
          <circle cx="-20" cy="-22" r="2" fill="#2dd4bf"/>
          <circle cx="20"  cy="-22" r="2" fill="#2dd4bf"/>
          {/* Punta */}
          <circle cx="0" cy="-30" r="3" fill="#00b4a0"/>
        </g>

        {/* Ondas Torre 1 */}
        <circle className="t1-pulse" cx="90" cy="252" fill="none" stroke="#00b4a0" strokeWidth="0.8"/>
        <circle className="t1-pulse2" cx="90" cy="252" fill="none" stroke="#00b4a0" strokeWidth="0.8"/>

        {/* Arcos de señal Torre 1 */}
        <path className="arc1" d="M 68 238 A 26 26 0 0 1 112 238" fill="none" stroke="#00b4a0" strokeWidth="1.2" strokeLinecap="round"/>
        <path className="arc2" d="M 56 226 A 40 40 0 0 1 124 226" fill="none" stroke="#00b4a0" strokeWidth="0.9" strokeLinecap="round"/>

        {/* ── Torre 2 — derecha alta ────────────────────────────────── */}
        <g className="twr" transform="translate(360, 180)">
          <line x1="-28" y1="130" x2="0" y2="0" stroke="#00b4a0" strokeWidth="1.5"/>
          <line x1="28"  y1="130" x2="0" y2="0" stroke="#00b4a0" strokeWidth="1.5"/>
          <line x1="-28" y1="130" x2="28"  y2="130" stroke="#00b4a0" strokeWidth="1.5"/>
          {/* Celosías */}
          <line x1="-20" y1="100" x2="20"  y2="75"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="20"  y1="100" x2="-20" y2="75"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="-14" y1="70"  x2="14"  y2="48"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="14"  y1="70"  x2="-14" y2="48"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="-8"  y1="42"  x2="8"   y2="22"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="8"   y1="42"  x2="-8"  y2="22"  stroke="#00b4a0" strokeWidth="0.8" opacity=".6"/>
          <line x1="0"   y1="0"   x2="0"   y2="-38" stroke="#00b4a0" strokeWidth="2"/>
          <line x1="-10" y1="-10" x2="-24" y2="-28" stroke="#2dd4bf" strokeWidth="1.2"/>
          <line x1="10"  y1="-10" x2="24"  y2="-28" stroke="#2dd4bf" strokeWidth="1.2"/>
          <circle cx="-24" cy="-28" r="2.5" fill="#2dd4bf"/>
          <circle cx="24"  cy="-28" r="2.5" fill="#2dd4bf"/>
          <circle cx="0" cy="-40" r="3.5" fill="#00b4a0"/>
          {/* Luz de balizamiento */}
          <circle cx="0" cy="-40" r="5" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity=".5"
            style={{ animation: 'node-blink 1.2s ease-in-out infinite' }}/>
        </g>

        {/* Ondas Torre 2 */}
        <circle className="t2-pulse" cx="360" cy="142" fill="none" stroke="#00b4a0" strokeWidth="0.8"/>
        <circle className="t2-pulse2" cx="360" cy="142" fill="none" stroke="#00b4a0" strokeWidth="0.8"/>

        {/* Arcos de señal Torre 2 */}
        <path className="arc3" d="M 326 122 A 40 40 0 0 1 394 122" fill="none" stroke="#00b4a0" strokeWidth="1.2" strokeLinecap="round"/>
        <path className="arc4" d="M 308 106 A 58 58 0 0 1 412 106" fill="none" stroke="#00b4a0" strokeWidth="0.9" strokeLinecap="round"/>

        {/* ── Torre 3 — centro baja (monopolo) ─────────────────────── */}
        <g transform="translate(230, 370)">
          <rect x="-4" y="-80" width="8" height="80" fill="none" stroke="#00b4a0" strokeWidth="1.8"/>
          {/* Brazos antena */}
          <line x1="-4" y1="-68" x2="-22" y2="-80" stroke="#2dd4bf" strokeWidth="1.2"/>
          <line x1="4"  y1="-68" x2="22"  y2="-80" stroke="#2dd4bf" strokeWidth="1.2"/>
          <line x1="-4" y1="-48" x2="-18" y2="-58" stroke="#2dd4bf" strokeWidth="1.2"/>
          <line x1="4"  y1="-48" x2="18"  y2="-58" stroke="#2dd4bf" strokeWidth="1.2"/>
          <circle cx="-22" cy="-80" r="2" fill="#2dd4bf"/>
          <circle cx="22"  cy="-80" r="2" fill="#2dd4bf"/>
          <circle cx="-18" cy="-58" r="2" fill="#2dd4bf"/>
          <circle cx="18"  cy="-58" r="2" fill="#2dd4bf"/>
          {/* Base monopolo */}
          <rect x="-10" y="0" width="20" height="8" rx="2" fill="none" stroke="#00b4a0" strokeWidth="1.2"/>
          {/* Punta */}
          <line x1="0" y1="-80" x2="0" y2="-94" stroke="#00b4a0" strokeWidth="1.5"/>
          <circle cx="0" cy="-96" r="2.5" fill="#00b4a0"/>
        </g>

        {/* Ondas Torre 3 */}
        <circle className="t3-pulse" cx="230" cy="275" fill="none" stroke="#2dd4bf" strokeWidth="0.6"/>
        <circle className="t3-pulse2" cx="230" cy="275" fill="none" stroke="#2dd4bf" strokeWidth="0.6"/>

        {/* Arcos señal Torre 3 */}
        <path className="arc5" d="M 184 258 A 50 50 0 0 1 276 258" fill="none" stroke="#2dd4bf" strokeWidth="1" strokeLinecap="round"/>
        <path className="arc6" d="M 164 240 A 70 70 0 0 1 296 240" fill="none" stroke="#2dd4bf" strokeWidth="0.7" strokeLinecap="round"/>

        {/* ── Líneas de datos entre torres ──────────────────────────── */}
        {/* Torre1 → Torre3 */}
        <line className="line1" x1="108" y1="255" x2="222" y2="278"
          stroke="#00b4a0" strokeWidth="0.8" strokeDasharray="6 4"/>
        {/* Torre3 → Torre2 */}
        <line className="line2" x1="238" y1="276" x2="342" y2="148"
          stroke="#00b4a0" strokeWidth="0.8" strokeDasharray="6 4"/>
        {/* Torre1 → Torre2 diagonal */}
        <line className="line3" x1="108" y1="250" x2="334" y2="148"
          stroke="#2dd4bf" strokeWidth="0.6" strokeDasharray="4 6"/>

        {/* ── Nodos de red (estaciones base, repetidoras) ───────────── */}
        {/* Nodo A */}
        <g className="nd" transform="translate(160, 430)">
          <rect x="-10" y="-8" width="20" height="16" rx="3" fill="none" stroke="#2dd4bf" strokeWidth="1"/>
          <line x1="0" y1="-8" x2="0" y2="-20" stroke="#2dd4bf" strokeWidth="1"/>
          <circle cx="0" cy="-22" r="2" fill="#2dd4bf"/>
        </g>

        {/* Nodo B */}
        <g className="nd2" transform="translate(310, 420)">
          <rect x="-10" y="-8" width="20" height="16" rx="3" fill="none" stroke="#2dd4bf" strokeWidth="1"/>
          <line x1="0" y1="-8" x2="0" y2="-20" stroke="#2dd4bf" strokeWidth="1"/>
          <circle cx="0" cy="-22" r="2" fill="#2dd4bf"/>
        </g>

        {/* Nodo C — pequeño relay */}
        <g className="nd3" transform="translate(70, 400)">
          <circle cx="0" cy="0" r="6" fill="none" stroke="#00b4a0" strokeWidth="1"/>
          <circle cx="0" cy="0" r="2.5" fill="#00b4a0"/>
        </g>

        {/* Nodo D */}
        <g className="nd" transform="translate(410, 360)">
          <circle cx="0" cy="0" r="6" fill="none" stroke="#00b4a0" strokeWidth="1"/>
          <circle cx="0" cy="0" r="2.5" fill="#00b4a0"/>
        </g>

        {/* ── Líneas de conexión a nodos ────────────────────────────── */}
        <line className="line4" x1="100" y1="270" x2="155" y2="415"
          stroke="#2dd4bf" strokeWidth="0.6" strokeDasharray="4 5"/>
        <line className="line1" x1="222" y1="290" x2="305" y2="408"
          stroke="#2dd4bf" strokeWidth="0.6" strokeDasharray="4 5"/>
        <line className="line2" x1="350" y1="180" x2="405" y2="350"
          stroke="#00b4a0" strokeWidth="0.6" strokeDasharray="4 5"/>

        {/* ── Grid de fondo sutil ───────────────────────────────────── */}
        {[0,60,120,180,240,300,360,420,480].map(x => (
          <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="520"
            stroke="#2dd4bf" strokeWidth="0.3" opacity=".15"/>
        ))}
        {[0,60,120,180,240,300,360,420,480,520].map(y => (
          <line key={`gy${y}`} x1="0" y1={y} x2="480" y2={y}
            stroke="#2dd4bf" strokeWidth="0.3" opacity=".15"/>
        ))}

        {/* ── Puntos de intersección de grid ───────────────────────── */}
        {[0,60,120,180,240,300,360,420,480].map(x =>
          [0,60,120,180,240,300,360,420,480,520].map(y => (
            <circle key={`gd${x}${y}`} cx={x} cy={y} r="1" fill="#2dd4bf" opacity=".2"/>
          ))
        )}
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

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

        {/* ── Panel izquierdo — navy con animación ─────────────────────── */}
        <div className="hidden md:flex flex-col justify-between p-10 flex-1"
          style={{ background: '#0d2137', position: 'relative' }}>

          {/* Animación de fondo */}
          <TelecomAnimation />

          {/* Contenido sobre la animación */}
          <div style={{ position: 'relative', zIndex: 1 }}>
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
          </div>

          {/* Tagline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 className="text-white font-semibold text-[22px] leading-snug mb-2">
              Inspecciones de campo,<br />centralizadas y en tiempo real
            </h1>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Plataforma de gestión y auditoría para supervisores de Phoenix Tower International
            </p>

            {/* Stats */}
            <div className="flex gap-6 mt-8">
              {[
                { num: '5',    lbl: 'Países activos' },
                { num: '6',    lbl: 'Tipos de formulario' },
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

          {/* Version + HenkanCX */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10 }}>v{APP_VERSION}</p>
            <a href="https://henkancx.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
              by HenkanCX
            </a>
          </div>
        </div>

        {/* ── Panel derecho — formulario ──────────────────────────────── */}
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
                onFocus={e => e.target.style.borderColor = '#00b4a0'}
                onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
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
                onFocus={e => e.target.style.borderColor = '#00b4a0'}
                onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
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
