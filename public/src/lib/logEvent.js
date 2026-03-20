import { supabase } from './supabaseClient'

// Cache de IP para no hacer fetch en cada evento
let _cachedIp = null
async function getClientIp() {
  if (_cachedIp) return _cachedIp
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    _cachedIp = data.ip || 'unknown'
  } catch {
    _cachedIp = 'unknown'
  }
  return _cachedIp
}

/**
 * Registrar un evento en system_logs.
 *
 * @param {object} opts
 * @param {string} opts.event_type  — 'auth.login' | 'auth.logout' | 'user.created' | etc.
 * @param {string} opts.message     — Descripción legible del evento
 * @param {'info'|'warning'|'error'|'critical'} [opts.severity]
 * @param {string} [opts.user_email]
 * @param {string} [opts.user_role]
 * @param {string} [opts.company_id]
 * @param {object} [opts.metadata]  — Datos adicionales (JSON)
 */
export async function logEvent({
  event_type,
  message,
  severity   = 'info',
  user_email = null,
  user_role  = null,
  company_id = null,
  metadata   = {},
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const ip = await getClientIp()

    await supabase.from('system_logs').insert({
      event_type,
      message,
      severity,
      user_id:    user?.id    || null,
      user_email: user_email  || user?.email || null,
      user_role,
      company_id,
      ip_address: ip,
      metadata: {
        ...metadata,
        user_agent: navigator.userAgent?.substring(0, 200) || 'unknown',
        url: window.location.pathname,
      },
    })
  } catch {
    // Los logs nunca deben romper el flujo principal — falla silenciosamente
  }
}

// ── Helpers semánticos ────────────────────────────────────────────────────────

export const LOG = {
  authLogin: (email, role, company_id) => logEvent({
    event_type: 'auth.login',
    message:    `Login exitoso: ${email}`,
    severity:   'info',
    user_email: email,
    user_role:  role,
    company_id,
  }),

  authLoginFailed: (email) => logEvent({
    event_type: 'auth.login_failed',
    message:    `Intento de login fallido: ${email}`,
    severity:   'warning',
    user_email: email,
    metadata:   { attempted_email: email },
  }),

  authLogout: (email, role) => logEvent({
    event_type: 'auth.logout',
    message:    `Logout: ${email}`,
    severity:   'info',
    user_email: email,
    user_role:  role,
  }),

  userCreated: (targetEmail, targetRole, actorEmail) => logEvent({
    event_type: 'user.created',
    message:    `Usuario creado: ${targetEmail} (${targetRole}) por ${actorEmail}`,
    severity:   'info',
    metadata:   { target_email: targetEmail, target_role: targetRole, actor: actorEmail },
  }),

  userUpdated: (targetEmail, changes, actorEmail) => logEvent({
    event_type: 'user.updated',
    message:    `Usuario modificado: ${targetEmail} por ${actorEmail}`,
    severity:   'info',
    metadata:   { target_email: targetEmail, changes, actor: actorEmail },
  }),

  userDeactivated: (targetEmail, actorEmail) => logEvent({
    event_type: 'user.deactivated',
    message:    `Usuario desactivado: ${targetEmail} por ${actorEmail}`,
    severity:   'warning',
    metadata:   { target_email: targetEmail, actor: actorEmail },
  }),

  submissionEdited: (submissionId, siteName, editorEmail, fieldsChanged) => logEvent({
    event_type: 'submission.edited',
    message:    `Formulario editado: ${siteName || submissionId} por ${editorEmail}`,
    severity:   'info',
    metadata:   { submission_id: submissionId, site_name: siteName, fields_changed: fieldsChanged, editor: editorEmail },
  }),

  systemError: (error, context) => logEvent({
    event_type: 'system.error',
    message:    `Error: ${error?.message || String(error)}`,
    severity:   'error',
    metadata:   { error: String(error), context },
  }),
}
