// supabase/functions/docs-ai/index.ts
// v4.14.2 — Edge function que responde preguntas del manual usando Claude Sonnet.
//
// Cambios vs v4.14.1:
//   • Acepta `isFallback: true` cuando el frontend no encontró matches locales.
//     En ese modo, el prompt cambia: Claude debe orientar al usuario a qué
//     capítulo mirar en lugar de inventar respuesta específica.
//   • Sigue devolviendo SIEMPRE HTTP 200 con { error } en body cuando algo
//     falla, para que el cliente Supabase no enmascare el mensaje real.
//
// Variables de entorno requeridas:
//   ANTHROPIC_API_KEY  — clave de la API de Anthropic (sk-ant-...)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 800

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1) Autenticación: solo admins
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonOk({ error: 'No autorizado: falta el header Authorization.' })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) return jsonOk({ error: 'Sesión inválida. Cierra sesión e inicia de nuevo.' })

    const { data: callerProfile } = await supabaseClient
      .from('app_users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') {
      return jsonOk({ error: 'Solo los administradores pueden usar el asistente.' })
    }

    // 2) Entrada
    let payload: any
    try { payload = await req.json() } catch { return jsonOk({ error: 'Body inválido: no es JSON.' }) }
    const { question, context, isFallback } = payload || {}
    if (!question || typeof question !== 'string') {
      return jsonOk({ error: 'Falta la pregunta.' })
    }
    if (!Array.isArray(context) || context.length === 0) {
      return jsonOk({ error: 'No se proporcionó contexto del manual.' })
    }

    // 3) Validar API key
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return jsonOk({
        error: 'La variable ANTHROPIC_API_KEY no está configurada en la edge function. Un administrador debe configurarla en Supabase Dashboard → Edge Functions → docs-ai → Settings.',
      })
    }
    if (!apiKey.startsWith('sk-ant-')) {
      return jsonOk({
        error: 'La ANTHROPIC_API_KEY configurada no parece válida (debe empezar con "sk-ant-"). Verificá en Supabase Dashboard.',
      })
    }

    // 4) Construir prompt — distinto si es fallback (sin matches específicos)
    const systemPromptNormal = `Eres un asistente experto en el sistema PTI TeleInspect.
Tu trabajo es responder preguntas de los administradores del sistema basándote ESTRICTAMENTE en las secciones del manual que te paso a continuación.

Reglas:
1. Responde en español de forma clara y directa.
2. Si la respuesta requiere pasos, enuméralos.
3. Si la información NO está en el contexto del manual, responde: "No encontré esa información específica en el manual. Considera consultar con el equipo técnico o revisar los Logs del sistema."
4. NUNCA inventes información que no esté en el contexto.
5. Mantén respuestas concisas: máximo 3-4 párrafos cortos o una lista de hasta 6 ítems.
6. Si la pregunta es ambigua, pide clarificación brevemente.
7. Usa Markdown ligero (negritas, listas, código inline para términos técnicos).`

    const systemPromptFallback = `Eres un asistente experto en el sistema PTI TeleInspect.

El usuario hizo una búsqueda en el manual y NO se encontraron resultados específicos. Te paso un índice general de los 10 capítulos del manual (título + descripción + temas que cubre cada uno).

Tu trabajo:
1. Analizá la pregunta del usuario.
2. Identificá qué capítulo(s) del manual probablemente contengan información relevante.
3. Sugerí al usuario que consulte esos capítulos específicos.
4. Si tenés conocimiento general útil sobre el tema basado en lo que sabés del sistema (que es de inspección técnica de torres de telecomunicaciones), podés dar una orientación breve pero SIEMPRE aclarando que el manual no tiene una sección específica al respecto.
5. Sé honesto: si la pregunta no encaja con ningún capítulo, decilo claro.

Reglas:
- Respondé en español, conciso (máx 3-4 párrafos).
- Usá Markdown ligero.
- NO inventes detalles técnicos específicos del sistema PTI TeleInspect que no estén en el contexto.
- Empezá la respuesta con algo como: "El manual no tiene una sección específica sobre esto, pero..."`

    const systemPrompt = isFallback ? systemPromptFallback : systemPromptNormal

    const userPrompt = isFallback
      ? `Pregunta del usuario: ${question}

Índice de capítulos del manual:
${context.map((c: any, i: number) => `\n[${i + 1}] ${c.chapterTitle}\n   ${c.text}`).join('\n')}

Orientá al usuario al capítulo o capítulos correspondientes.`
      : `Pregunta del administrador: ${question}

Secciones relevantes del manual (no inventes nada fuera de esto):
${context.map((c: any, i: number) => `\n---\n[${i + 1}] Capítulo "${c.chapterTitle}" > Sección "${c.heading}":\n${c.text}`).join('\n')}

Responde basándote solo en estas secciones. Si la información no está, dilo claramente.`

    // 5) Llamar a Anthropic
    let anthropicRes: Response
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
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
    } catch (e: any) {
      return jsonOk({ error: `No se pudo conectar con Anthropic: ${e?.message || 'error de red'}` })
    }

    if (!anthropicRes.ok) {
      let errBody = ''
      try { errBody = await anthropicRes.text() } catch { /* ignore */ }
      let friendly = `Error ${anthropicRes.status} de Anthropic.`
      if (anthropicRes.status === 401) {
        friendly = 'La ANTHROPIC_API_KEY configurada fue rechazada por Anthropic. Verificá que esté activa y no expirada.'
      } else if (anthropicRes.status === 404) {
        friendly = `El modelo "${MODEL}" no está disponible para tu cuenta de Anthropic. Cambialo a "claude-haiku-4-5-20251001" en la edge function, o solicitá acceso al modelo Sonnet.`
      } else if (anthropicRes.status === 429) {
        friendly = 'Anthropic devolvió "demasiadas solicitudes". Esperá unos segundos y reintentá.'
      } else if (anthropicRes.status === 529) {
        friendly = 'La API de Anthropic está sobrecargada en este momento. Reintentá en unos segundos.'
      } else if (errBody) {
        friendly = `Error ${anthropicRes.status}: ${errBody.slice(0, 250)}`
      }
      return jsonOk({ error: friendly })
    }

    let data: any
    try { data = await anthropicRes.json() } catch { return jsonOk({ error: 'Respuesta de Anthropic no es JSON válido.' }) }

    const answer = (data?.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()

    if (!answer) return jsonOk({ error: 'Anthropic devolvió una respuesta vacía. Reintentá la pregunta.' })

    // Sources: en modo fallback no marcamos fuentes específicas (no hay matches)
    const sources = isFallback
      ? []
      : (context || []).slice(0, 4).map((c: any) => ({
          chapterSlug:  c.chapterSlug,
          chapterTitle: c.chapterTitle,
          sectionId:    c.sectionId,
          heading:      c.heading,
        }))

    return jsonOk({ answer, sources, isFallback: isFallback || false })

  } catch (err: any) {
    return jsonOk({ error: `Error inesperado: ${err?.message || 'sin detalles'}` })
  }
})
