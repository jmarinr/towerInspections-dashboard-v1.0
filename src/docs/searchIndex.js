// ══════════════════════════════════════════════════════════════════════════════
// Búsqueda local sobre los capítulos del manual usando MiniSearch.
//
// Estrategia: indexamos a nivel de SECCIÓN (cada heading H2 de cada capítulo
// + el bloque de texto que le sigue hasta el siguiente H2). Eso permite que
// los resultados sean específicos ("scope global vs scoped") y no genéricos
// (un capítulo entero).
// ══════════════════════════════════════════════════════════════════════════════

import MiniSearch from 'minisearch'
import { chapters } from './loader'

/**
 * Parte el body en secciones por heading H2. Cada sección es:
 *   { id, sectionId, chapterSlug, chapterTitle, heading, text }
 * Si el cuerpo arranca con texto antes del primer H2, ese intro es la primera
 * "sección" con heading = "Introducción".
 */
function splitChapterIntoSections(chapter) {
  const sections = []
  const lines = chapter.body.split('\n')
  let current = { heading: 'Introducción', id: 'intro', lines: [] }
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (m) {
      // Cierro la sección anterior si tiene contenido
      if (current.lines.length > 0) sections.push(current)
      const text = m[1].trim()
      const id = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
      current = { heading: text, id, lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  if (current.lines.length > 0) sections.push(current)

  return sections.map((s, idx) => ({
    id:           `${chapter.slug}::${s.id}`,
    sectionId:    s.id,
    chapterSlug:  chapter.slug,
    chapterTitle: chapter.title,
    heading:      s.heading,
    // Body de la sección, limpio de bloques de código en exceso
    text:         s.lines.join('\n').trim(),
  }))
}

// Construir el corpus de secciones
const allSections = chapters.flatMap(splitChapterIntoSections)

// Inicializar MiniSearch
const miniSearch = new MiniSearch({
  fields: ['heading', 'text', 'chapterTitle'],
  storeFields: ['chapterSlug', 'chapterTitle', 'sectionId', 'heading', 'text'],
  searchOptions: {
    boost: { heading: 3, chapterTitle: 2, text: 1 },
    fuzzy: 0.2,
    prefix: true,
    combineWith: 'AND',
  },
})

miniSearch.addAll(allSections)

/**
 * Devuelve los mejores N resultados para una query.
 *
 * @param {string} query
 * @param {number} max
 * @returns {Array<{ chapterSlug, chapterTitle, sectionId, heading, snippet }>}
 */
export function searchDocs(query, max = 7) {
  const q = (query || '').trim()
  if (q.length < 2) return []
  const raw = miniSearch.search(q).slice(0, max)
  // Generar snippet con la primera coincidencia del término
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  return raw.map(r => ({
    chapterSlug:  r.chapterSlug,
    chapterTitle: r.chapterTitle,
    sectionId:    r.sectionId,
    heading:      r.heading,
    snippet:      buildSnippet(r.text, terms),
    score:        r.score,
  }))
}

/**
 * Extrae ~200 chars alrededor de la primera coincidencia de cualquier término.
 * Quita formato markdown (#, *, _, `) para que el preview sea legible.
 */
function buildSnippet(text, terms) {
  const lowered = text.toLowerCase()
  let idx = -1
  for (const t of terms) {
    const i = lowered.indexOf(t)
    if (i !== -1 && (idx === -1 || i < idx)) idx = i
  }
  if (idx === -1) idx = 0
  const start = Math.max(0, idx - 60)
  const end   = Math.min(text.length, idx + 160)
  let snippet = text.slice(start, end).replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim()
  if (start > 0) snippet = '…' + snippet
  if (end < text.length) snippet = snippet + '…'
  return snippet
}

/** Devuelve todas las secciones para el contexto que enviamos a Claude. */
export function getAllSections() {
  return allSections
}
