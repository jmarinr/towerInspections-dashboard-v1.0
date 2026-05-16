// ══════════════════════════════════════════════════════════════════════════════
// Loader de capítulos del manual.
// Importa todos los .md de /docs/content/ via import.meta.glob (Vite),
// parsea el frontmatter YAML simple y expone el array `chapters` ordenado.
// ══════════════════════════════════════════════════════════════════════════════

// Eager import: el contenido viaja en el bundle (no hay lazy loading per-doc
// porque son chapters de tamaño moderado y la búsqueda los necesita todos).
const modules = import.meta.glob('./content/*.md', { eager: true, query: '?raw', import: 'default' })

/**
 * Parser de frontmatter YAML mínimo — solo soporta clave: valor en una sola
 * línea, suficiente para nuestros campos title/order/icon/description.
 *
 * @param {string} raw  contenido completo del archivo
 * @returns {{ data: Record<string,string>, body: string }}
 */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  const yaml = m[1]
  const body = m[2]
  const data = {}
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    // Quitar comillas si las tiene
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    data[key] = val
  }
  return { data, body }
}

/**
 * Genera un slug URL-friendly desde el nombre de archivo
 *   "./content/02-control-de-acceso.md" -> "control-de-acceso"
 */
function slugFromPath(p) {
  const base = p.split('/').pop().replace(/\.md$/, '')
  return base.replace(/^\d+-/, '')
}

/**
 * Extrae los headings nivel 2 del cuerpo del markdown para construir el índice
 * "On this page". Devuelve [{ id, text }, ...] donde id es el slug rehype.
 */
function extractH2(body) {
  const lines = body.split('\n')
  const result = []
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (m) {
      const text = m[1].trim()
      const id = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
      result.push({ id, text })
    }
  }
  return result
}

// Construir el array de capítulos ordenado por `order`
export const chapters = Object.entries(modules)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    return {
      slug:        slugFromPath(path),
      title:       data.title || slugFromPath(path),
      order:       parseInt(data.order || '999', 10),
      icon:        data.icon || 'FileText',
      description: data.description || '',
      body,
      headings:    extractH2(body),
    }
  })
  .sort((a, b) => a.order - b.order)

/** Busca un capítulo por slug; si no existe, devuelve el primero. */
export function getChapterBySlug(slug) {
  return chapters.find(c => c.slug === slug) || chapters[0]
}
