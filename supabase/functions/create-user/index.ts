// supabase/functions/create-user/index.ts
// v4.13.0 — acepta `scope` ('global' | 'scoped') y `region_ids` (uuid[]).
// Inserta en app_users con scope explícito, y si scope='scoped' agrega filas
// en app_user_regions. Cualquier error revierte la creación del auth user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('app_users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo admins pueden crear usuarios' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // v4.13.0 — leer scope y region_ids además de los campos previos
    const {
      email, password, full_name, role,
      company_id, supervisor_id, active,
      scope, region_ids,
    } = await req.json()

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'email, password y full_name son obligatorios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validaciones de coherencia (defensivas — el trigger en BD las repite).
    const effectiveScope = scope || (company_id ? 'scoped' : 'global')
    if (!['global', 'scoped'].includes(effectiveScope)) {
      return new Response(JSON.stringify({ error: 'scope inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (effectiveScope === 'global' && company_id) {
      return new Response(JSON.stringify({ error: 'Usuario global no puede tener empresa' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (effectiveScope === 'scoped' && (role === 'supervisor' || role === 'viewer') && !company_id) {
      return new Response(JSON.stringify({ error: `${role} scoped debe tener empresa asignada` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Crear en Auth
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authCreateError) {
      return new Response(JSON.stringify({ error: authCreateError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Crear perfil en app_users (incluye scope explícito)
    const { error: profileError } = await supabaseAdmin.from('app_users').insert({
      id:            authData.user.id,
      email:         email.trim(),
      full_name:     full_name.trim(),
      role:          role          || 'inspector',
      company_id:    company_id    || null,
      supervisor_id: supervisor_id || null,
      active:        active        ?? true,
      scope:         effectiveScope,
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insertar regiones asignadas (solo si scoped y se enviaron)
    if (effectiveScope === 'scoped' && Array.isArray(region_ids) && region_ids.length > 0) {
      const rows = region_ids
        .filter((r: string) => typeof r === 'string' && r.length > 0)
        .map((region_id: string) => ({ user_id: authData.user.id, region_id }))

      if (rows.length > 0) {
        const { error: regionsError } = await supabaseAdmin
          .from('app_user_regions')
          .insert(rows)

        if (regionsError) {
          // Revertir TODO: borrar app_users (CASCADE) y auth user
          await supabaseAdmin.from('app_users').delete().eq('id', authData.user.id)
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          return new Response(JSON.stringify({ error: `Error al asignar regiones: ${regionsError.message}` }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, user_id: authData.user.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
