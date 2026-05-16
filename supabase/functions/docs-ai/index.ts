// supabase/functions/docs-ai/index.ts
// Edge function que recibe pregunta + contexto del manual y responde usando
// Anthropic Claude Sonnet. Solo accesible para admins.
//
// Variables de entorno requeridas (configurar en Supabase Dashboard):
//   ANTHROPIC_API_KEY  — clave de la API de Anthropic (sk-ant-...)
//   SUPABASE_URL       — auto
//   SUPABASE_ANON_KEY  — auto

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 800

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1) Autenticación: solo admins
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const { data: callerProfile } = await supabaseClient
      .from('app_users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo admins pueden usar el asistente' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2) Entrada
    const { question, context } = await req.json()
    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta question' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!Array.isArray(context) || context.length === 0) {
      return new Response(JSON.stringify({ error: 'Falta contexto del manual' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3) Construir el prompt con las secciones relevantes como contexto
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const systemPrompt = `Eres un asistente experto en el sistema PTI TeleInspect.
Tu trabajo es responder preguntas de los administradores del sistema basándote ESTRICTAMENTE en las secciones del manual que te paso a continuación.

Reglas:
1. Responde en español de forma clara y directa.
2. Si la respuesta requiere pasos, enuméralos.
3. Si la información NO está en el contexto del manual, responde: "No encontré esa información en el manual. Considera consultar con el equipo técnico o revisar los Logs del sistema."
4. NUNCA inventes información que no esté en el contexto.
5. Mantén respuestas concisas: máximo 3-4 párrafos cortos o una lista de hasta 6 ítems.
6. Si la pregunta es ambigua, pide clarificación brevemente.
7. Usa Markdown ligero (negritas, listas, código inline para términos técnicos).`

    const userPrompt = `Pregunta del administrador: ${question}

Secciones relevantes del manual (no inventes nada fuera de esto):
${context.map((c, i) => `\n---\n[${i + 1}] Capítulo "${c.chapterTitle}" > Sección "${c.heading}":\n${c.text}`).join('\n')}

Responde basándote solo en estas secciones. Si la información no está, dilo claramente.`

    // 4) Llamar a Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return new Response(JSON.stringify({ error: `Error de Anthropic: ${anthropicRes.status} — ${errText.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await anthropicRes.json()
    const answer = (data?.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()

    // 5) Devolver respuesta + fuentes citadas (las mismas secciones que mandamos como contexto)
    const sources = context.slice(0, 4).map(c => ({
      chapterSlug:  c.chapterSlug,
      chapterTitle: c.chapterTitle,
      sectionId:    c.sectionId,
      heading:      c.heading,
    }))

    return new Response(JSON.stringify({ answer, sources }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
