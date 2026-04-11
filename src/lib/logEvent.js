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
 * IMPORTANTE: No llama getUser() para evitar interferir con el flujo de auth.
 * Usa fire-and-forget con catch silencioso — nunca bloquea el flujo principal.
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
  // Diferir 500ms para asegurar que la sesión ya esté establecida antes de loggear
  await new Promise(r => setTimeout(r, 500))

  try {
    const ip = await getClientIp()

    const { error } = await supabase.from('system_logs').insert({
      event_type,
      message,
      severity,
      user_email,
      user_role,
      company_id,
      ip_address: ip,
      metadata: {
        ...metadata,
        user_agent: navigator.userAgent?.substring(0, 200) || 'unknown',
        url: window.location.pathname,
      },
    })

    // Si falla por 401, no reintentar — la sesión puede estar en transición
    if (error?.code === '401' || error?.status === 401 || error?.message?.includes('JWT')) return

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
