// supabase/functions/log-event/index.ts
// v4.15.4 — Registra eventos de auditoría en system_logs.
// Ventajas vs inserción directa desde el frontend:
//   1. Extrae la IP real del cliente desde los headers del servidor (x-forwarded-for / cf-connecting-ip).
//      El browser no puede obtener su propia IP sin llamar a servicios externos (CORS).
//   2. Inserta con service_role → bypasea RLS, nunca falla por permisos.
//   3. Verifica que el caller esté autenticado antes de registrar el log.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Extrae la IP real del cliente desde los headers de red.
// Cloudflare inyecta cf-connecting-ip (más confiable).
// Fallback a x-forwarded-for (puede tener múltiples IPs separadas por coma).
function getClientIp(req: Request): string {
  const cf  = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // ── 1. Verificar autenticación del caller ────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar que el token sea válido con un cliente anon
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 2. Parsear el payload del log ────────────────────────────────────────
    const body = await req.json()
    const {
      event_type,
      message,
      severity   = 'info',
      user_email = null,
      user_role  = null,
      company_id = null,
      metadata   = {},
    } = body

    if (!event_type || !message) {
      return new Response(JSON.stringify({ error: 'event_type y message son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 3. Extraer IP real del request ───────────────────────────────────────
    const ip_address = getClientIp(req)

    // ── 4. Insertar en system_logs con service_role (bypasea RLS) ───────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: insertError } = await supabaseAdmin
      .from('system_logs')
      .insert({
        event_type,
        message,
        severity,
        user_email,
        user_role,
        company_id,
        ip_address,
        metadata: {
          ...metadata,
          user_agent: req.headers.get('user-agent')?.substring(0, 200) || 'unknown',
        },
      })

    if (insertError) {
      console.error('[log-event] insert error:', insertError.message)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true, ip_address }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[log-event] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
