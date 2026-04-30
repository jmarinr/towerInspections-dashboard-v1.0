/**
 * SystemHealth.jsx
 * Panel de salud del sistema — solo visible para rol admin.
 * Muestra el estado del trigger de auto-cierre de visitas y permite
 * ejecutar el cierre retroactivo manualmente.
 */
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Activity } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Spinner from '../../components/ui/Spinner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoDate) {
  if (!isoDate) return '—'
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)   return 'hace un momento'
  if (mins  < 60)  return `hace ${mins} min`
  if (hours < 24)  return `hace ${hours}h`
  return `hace ${days}d`
}

function StatusDot({ ok, loading }) {
  if (loading) return <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-pulse" />
  return (
    <div className="relative">
      <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      {ok && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, sub, color = '#475569', accent = false, loading }) {
  return (
    <div className="rounded-2xl p-5 border th-shadow"
      style={{ background: accent ? '#1e293b' : 'var(--bg-card)', borderColor: accent ? 'transparent' : 'var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: accent ? 'rgba(255,255,255,0.08)' : `${color}18` }}>
          <Icon size={16} style={{ color: accent ? '#94a3b8' : color }} />
        </div>
      </div>
      {loading
        ? <div className="h-7 w-16 rounded bg-slate-200 animate-pulse mb-1" />
        : <div className="text-[26px] font-bold leading-none tabular-nums mb-1"
            style={{ color: accent ? '#e2e8f0' : color }}>{value}</div>}
      <div className="text-[11.5px] font-medium" style={{ color: accent ? 'rgba(226,232,240,0.5)' : 'var(--text-secondary)' }}>{label}</div>
      {sub && <div className="text-[10.5px] mt-0.5" style={{ color: accent ? 'rgba(226,232,240,0.35)' : 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function SystemHealth() {
  const [loading,     setLoading]     = useState(true)
  const [retrying,    setRetrying]    = useState(false)
  const [lastCheck,   setLastCheck]   = useState(null)
  const [inconsistent, setInconsistent] = useState([])   // visitas abiertas con 6 forms finalizados
  const [stats,       setStats]       = useState(null)   // stats generales
  const [triggerOk,   setTriggerOk]   = useState(null)   // trigger existe en DB
  const [error,       setError]       = useState(null)

  // ── Verificar trigger ───────────────────────────────────────────────────────
  const checkTrigger = useCallback(async () => {
    try {
      // Verificar que la función check_and_close_visit existe ejecutándola
      // con un UUID que no existe — si no lanza "function not found", la función existe
      const { error } = await supabase.rpc('check_and_close_visit', {
        p_visit_id: '00000000-0000-0000-0000-000000000000'
      })
      // PGRST202 = función no encontrada → trigger inactivo
      // cualquier otro error (o sin error) → función existe → trigger activo
      setTriggerOk(!error || error.code !== 'PGRST202')
    } catch {
      setTriggerOk(false)
    }
  }, [])

  // ── Cargar inconsistencias ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await checkTrigger()

      // Visitas abiertas con todos los formularios finalizados (no debería haber)
      const { data: inc, error: incErr } = await supabase
        .from('site_visits')
        .select(`
          id, order_number, site_id, site_name, started_at,
          submissions!inner(id, form_code, finalized)
        `)
        .eq('status', 'open')

      if (incErr) throw incErr

      // Filtrar en cliente: visitas donde TODOS los 6 formularios requeridos están finalizados
      const REQUIRED = new Set([
        'mantenimiento', 'preventive-maintenance',
        'mantenimiento-ejecutado', 'executed-maintenance',
        'equipment-v2', 'inventario-v2',
        'sistema-ascenso', 'safety-system',
        'additional-photo-report', 'additional-photo', 'reporte-fotos',
        'grounding-system-test', 'puesta-tierra',
      ])
      const CANONICAL = {
        'preventive-maintenance': 'mantenimiento',
        'executed-maintenance':   'mantenimiento-ejecutado',
        'inventario-v2':          'equipment-v2',
        'safety-system':          'sistema-ascenso',
        'additional-photo':       'additional-photo-report',
        'reporte-fotos':          'additional-photo-report',
        'puesta-tierra':          'grounding-system-test',
      }
      const normalize = c => CANONICAL[c] || c
      const SIX_REQUIRED = [
        'mantenimiento', 'mantenimiento-ejecutado', 'equipment-v2',
        'sistema-ascenso', 'additional-photo-report', 'grounding-system-test',
      ]

      const inconsistentVisits = (inc || []).filter(v => {
        const finalized = new Set(
          (v.submissions || [])
            .filter(s => s.finalized)
            .map(s => normalize(s.form_code))
        )
        return SIX_REQUIRED.every(code => finalized.has(code))
      })

      setInconsistent(inconsistentVisits)

      // Stats generales de visitas
      const { data: openData } = await supabase
        .from('site_visits')
        .select('id, status, closed_at')
        .order('closed_at', { ascending: false })

      const allVisits  = openData || []
      const totalOpen  = allVisits.filter(v => v.status === 'open').length
      const totalClosed = allVisits.filter(v => v.status === 'closed').length
      const lastClosed  = allVisits.find(v => v.status === 'closed' && v.closed_at)

      setStats({ totalOpen, totalClosed, lastClosed: lastClosed?.closed_at })
      setLastCheck(new Date().toISOString())
    } catch (e) {
      setError(e?.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [checkTrigger])

  // ── Cierre retroactivo manual ───────────────────────────────────────────────
  const handleRetroClose = useCallback(async () => {
    if (!inconsistent.length) return
    setRetrying(true)
    try {
      for (const visit of inconsistent) {
        await supabase.rpc('check_and_close_visit', { p_visit_id: visit.id })
      }
      await loadData()
    } catch (e) {
      setError(e?.message || 'Error al cerrar visitas')
    } finally {
      setRetrying(false)
    }
  }, [inconsistent, loadData])

  useEffect(() => { loadData() }, [loadData])

  // ── Auto-refresh cada 60s ───────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(loadData, 60000)
    return () => clearInterval(id)
  }, [loadData])

  const systemOk = !loading && inconsistent.length === 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold th-text-p">Salud del Sistema</h1>
          <p className="text-[12px] th-text-m mt-0.5">
            Monitoreo del trigger de auto-cierre · Actualiza cada 60s
            {lastCheck && <span className="ml-1.5">· Última verificación: {timeAgo(lastCheck)}</span>}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="h-9 px-3 flex items-center gap-2 rounded-lg border th-border th-bg-card text-[13px] th-text-s
            hover:bg-slate-50/40 transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Estado general del sistema */}
      <div className="rounded-2xl p-5 border th-shadow flex items-center gap-4"
        style={{
          background: loading ? 'var(--bg-card)' : systemOk ? '#f0fdf4' : '#fffbeb',
          borderColor: loading ? 'var(--border)' : systemOk ? '#bbf7d0' : '#fde68a',
        }}>
        <div className="flex-shrink-0">
          {loading
            ? <Activity size={22} className="th-text-m animate-pulse" />
            : systemOk
              ? <CheckCircle2 size={22} style={{ color: '#16a34a' }} />
              : <AlertTriangle size={22} style={{ color: '#d97706' }} />
          }
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold"
            style={{ color: loading ? 'var(--text-primary)' : systemOk ? '#15803d' : '#92400e' }}>
            {loading ? 'Verificando el estado del sistema…'
              : systemOk ? 'Sistema funcionando correctamente — sin inconsistencias'
              : `${inconsistent.length} visita${inconsistent.length !== 1 ? 's' : ''} con inconsistencia detectada${inconsistent.length !== 1 ? 's' : ''}`
            }
          </p>
          <p className="text-[11px] mt-0.5"
            style={{ color: loading ? 'var(--text-secondary)' : systemOk ? '#16a34a99' : '#d9770699' }}>
            {loading ? '' : systemOk
              ? 'El trigger on_submission_finalized está activo y no hay visitas que deberían estar cerradas'
              : 'Estas visitas tienen todos los formularios finalizados pero siguen abiertas — el trigger no las procesó'}
          </p>
        </div>
        {!loading && !systemOk && (
          <button
            onClick={handleRetroClose}
            disabled={retrying}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ background: retrying ? '#d97706aa' : '#d97706' }}>
            <Zap size={13} />
            {retrying ? 'Cerrando…' : 'Cerrar ahora'}
          </button>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={ShieldCheck} label="Trigger activo" accent
          value={loading ? '…' : triggerOk ? '✓ Activo' : '✗ Inactivo'}
          sub="on_submission_finalized" loading={loading} />
        <MetricCard icon={AlertTriangle} label="Inconsistencias" color="#d97706"
          value={loading ? '…' : inconsistent.length}
          sub="visitas abiertas completadas" loading={loading} />
        <MetricCard icon={Activity} label="Visitas abiertas" color="#475569"
          value={loading ? '…' : stats?.totalOpen ?? '—'}
          sub="en progreso actualmente" loading={loading} />
        <MetricCard icon={CheckCircle2} label="Último cierre auto" color="#0d9488"
          value={loading ? '…' : timeAgo(stats?.lastClosed)}
          sub="cierre por trigger o manual" loading={loading} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertTriangle size={14} style={{ color: '#dc2626' }} />
          <p className="text-[13px]" style={{ color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {/* Tabla de inconsistencias — solo si hay */}
      {!loading && inconsistent.length > 0 && (
        <div>
          <h2 className="text-[13px] font-semibold th-text-p mb-3">
            Visitas con inconsistencia
          </h2>
          <div className="rounded-xl border th-border overflow-hidden th-bg-card">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                  {['Orden', 'ID Sitio', 'Sitio', 'Inicio'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold th-text-m uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inconsistent.map((v, i) => (
                  <tr key={v.id}
                    style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                    <td className="px-4 py-3 font-mono font-semibold text-[12px]" style={{ color: 'var(--accent)' }}>
                      {v.order_number}
                    </td>
                    <td className="px-4 py-3 th-text-s">{v.site_id || '—'}</td>
                    <td className="px-4 py-3 th-text-p">{v.site_name || '—'}</td>
                    <td className="px-4 py-3 th-text-m text-[12px]">
                      {v.started_at ? new Date(v.started_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado OK vacío */}
      {!loading && inconsistent.length === 0 && !error && (
        <div className="rounded-xl border th-border th-bg-card px-6 py-10 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3" style={{ color: '#16a34a' }} />
          <p className="text-[13px] font-medium th-text-p">Sin inconsistencias detectadas</p>
          <p className="text-[12px] th-text-m mt-1">
            El trigger está procesando correctamente todos los cierres automáticos.
          </p>
        </div>
      )}

      {/* Nota técnica */}
      <div className="rounded-xl px-4 py-3 text-[11.5px] th-text-m space-y-1"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
        <p className="font-semibold th-text-p mb-1">¿Cómo funciona el trigger?</p>
        <p>Cada vez que un inspector finaliza un formulario, el servicio ejecuta <code className="bg-slate-100 px-1 rounded text-[11px]">on_submission_finalized</code> automáticamente.</p>
        <p>Si detecta que los 6 formularios requeridos están finalizados, cierra la visita con <code className="bg-slate-100 px-1 rounded text-[11px]">status = 'closed'</code> sin depender del Inspector App.</p>
        <p>Esta página verifica el estado cada 60 segundos. Si aparece alguna inconsistencia, usa el botón "Cerrar ahora" para resolverla manualmente.</p>
      </div>

    </div>
  )
}
