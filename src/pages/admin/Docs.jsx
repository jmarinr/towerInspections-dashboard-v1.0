import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import {
  BookOpen, Sparkles, ShieldCheck, Users, Building2, ClipboardList, BarChart3,
  Radio, Wrench, BookMarked, HelpCircle, FileText, Search, Sparkle, Loader2,
  X, ChevronRight, Hash,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { chapters, getChapterBySlug } from '../../docs/loader'
import { searchDocs, getAllSections } from '../../docs/searchIndex'
import Spinner from '../../components/ui/Spinner'

// ── Iconos disponibles para el frontmatter ──────────────────────────────────
const ICON_MAP = {
  Sparkles, ShieldCheck, Users, Building2, ClipboardList, BarChart3,
  Radio, Wrench, BookMarked, HelpCircle, FileText, BookOpen,
}

function ChapterIcon({ name, size = 14, style }) {
  const Cmp = ICON_MAP[name] || FileText
  return <Cmp size={size} style={style}/>
}

// ── Componente: TOC del manual (sidebar izquierda) ──────────────────────────
function DocsSidebar({ activeSlug, onSelect }) {
  return (
    <nav className="w-full p-3 space-y-0.5" aria-label="Capítulos del manual">
      <div className="px-3 mb-2 mt-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest th-text-m">
          Manual del sistema
        </span>
      </div>
      {chapters.map(ch => {
        const active = ch.slug === activeSlug
        return (
          <button
            key={ch.slug}
            onClick={() => onSelect(ch.slug)}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors"
            style={{
              background: active ? 'rgba(2,132,199,0.10)' : 'transparent',
              color:      active ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: active ? 600 : 500,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--row-hover-bg)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
            <ChapterIcon name={ch.icon} size={13} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}/>
            <span className="truncate">{ch.title}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ── Componente: TOC dentro del capítulo (sidebar derecha "On this page") ────
function OnThisPage({ headings, activeId }) {
  if (!headings || headings.length === 0) return null
  return (
    <div className="sticky top-4 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest th-text-m mb-2.5">
        En esta página
      </div>
      <ul className="space-y-1.5">
        {headings.map(h => (
          <li key={h.id}>
            <a href={`#${h.id}`}
              className="block text-[12px] py-0.5 transition-colors"
              style={{
                color: activeId === h.id ? 'var(--accent)' : 'var(--text-secondary)',
                borderLeft: activeId === h.id ? '2px solid var(--accent)' : '2px solid transparent',
                paddingLeft: 10,
                fontWeight: activeId === h.id ? 600 : 400,
              }}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Componente: Buscador con dropdown de resultados ─────────────────────────
function DocsSearch({ onResultClick }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiSources, setAiSources] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const containerRef = useRef(null)

  const results = useMemo(() => searchDocs(query, 7), [query])

  // Cerrar dropdown al click afuera
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setAiOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const askClaude = async () => {
    if (!query.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiAnswer('')
    setAiSources([])
    setAiOpen(true)
    try {
      // v4.14.2 — Construir contexto:
      //   • Si la búsqueda local devolvió matches → top 5 secciones completas.
      //   • Si no hay matches → fallback con título + descripción de los 10 capítulos
      //     para que Claude pueda orientar al usuario al capítulo correcto.
      let context
      let isFallback = false
      if (results.length > 0) {
        context = results.slice(0, 5).map(r => ({
          chapterTitle: r.chapterTitle,
          chapterSlug:  r.chapterSlug,
          heading:      r.heading,
          sectionId:    r.sectionId,
          text: (getAllSections().find(s => s.chapterSlug === r.chapterSlug && s.sectionId === r.sectionId) || {}).text || '',
        }))
      } else {
        isFallback = true
        context = chapters.map(c => ({
          chapterTitle: c.title,
          chapterSlug:  c.slug,
          heading:      'Resumen del capítulo',
          sectionId:    'intro',
          // El texto fallback es título + descripción + primeras N headings del capítulo
          text: `${c.title}\n${c.description || ''}\n\nTemas: ${(c.headings || []).map(h => h.text).join(', ')}`.trim(),
        }))
      }

      const { data, error } = await supabase.functions.invoke('docs-ai', {
        body: {
          question:   query.trim(),
          context,
          isFallback,
        },
      })
      // v4.14.1 — la edge devuelve siempre HTTP 200 con { error } cuando algo
      // falla en el body. Si hay un error de transporte (red, deploy faltante),
      // viene en `error` del SDK.
      if (error) {
        setAiError('No se pudo conectar con la edge function. ¿Está desplegada como `docs-ai`? Detalle: ' + (error.message || error))
        return
      }
      if (data?.error) {
        setAiError(data.error)
        return
      }
      if (!data?.answer) {
        setAiError('Respuesta vacía de la función. Revisá los logs de la edge function.')
        return
      }
      setAiAnswer(data.answer)
      setAiSources(data.sources || [])
    } catch (e) {
      setAiError(e.message || 'Error inesperado.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="relative w-full max-w-xl" ref={containerRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none th-text-m"/>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setAiOpen(false) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar en el manual o hacer una pregunta…"
          className="w-full h-10 pl-9 pr-24 text-[13px] rounded-xl th-text-p"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setAiOpen(false); e.target.blur() }
            if (e.key === 'Enter' && e.metaKey) askClaude()
          }}
        />
        <button
          onClick={askClaude}
          disabled={!query.trim() || aiLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #0284C7 0%, #7c3aed 100%)',
            color: '#fff',
          }}
          title="Preguntar a Claude (⌘+Enter)">
          {aiLoading ? <Loader2 size={11} className="animate-spin"/> : <Sparkle size={11}/>}
          IA
        </button>
      </div>

      {/* Dropdown de resultados locales */}
      {open && !aiOpen && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            maxHeight: '60vh',
            overflowY: 'auto',
          }}>
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] th-text-m">
              <div className="mb-2">Sin resultados locales.</div>
              <button onClick={askClaude}
                className="text-[12px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #0284C7 0%, #7c3aed 100%)', color: '#fff' }}>
                <Sparkle size={11}/>Preguntar a Claude
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest th-text-m"
                style={{ borderBottom: '1px solid var(--border-light)' }}>
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((r, i) => (
                <button key={r.chapterSlug + '::' + r.sectionId}
                  onClick={() => { onResultClick(r.chapterSlug, r.sectionId); setOpen(false); setQuery('') }}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border-light)' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div className="flex items-center gap-1.5 text-[10px] th-text-m mb-1">
                    <span>{r.chapterTitle}</span>
                    <ChevronRight size={9}/>
                    <span className="font-semibold">{r.heading}</span>
                  </div>
                  <div className="text-[12px] th-text-p line-clamp-2">
                    {highlightTerms(r.snippet, query)}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Panel de respuesta IA */}
      {aiOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}>
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold"
              style={{ color: '#7c3aed' }}>
              <Sparkle size={11}/>Respuesta de Claude
            </div>
            <button onClick={() => setAiOpen(false)} className="p-1 rounded-md th-text-m"
              style={{ background: 'var(--bg-base)' }}>
              <X size={12}/>
            </button>
          </div>
          <div className="px-4 py-3">
            {aiLoading && (
              <div className="flex items-center gap-2 text-[12px] th-text-m">
                <Loader2 size={12} className="animate-spin"/>
                Pensando…
              </div>
            )}
            {aiError && (
              <div className="text-[12px] px-3 py-2 rounded-lg"
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {aiError}
              </div>
            )}
            {aiAnswer && (
              <div className="text-[13px] th-text-p prose-docs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnswer}</ReactMarkdown>
              </div>
            )}
            {aiSources.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest th-text-m mb-2">Fuentes</div>
                <div className="space-y-1">
                  {aiSources.map((s, i) => (
                    <button key={i}
                      onClick={() => { onResultClick(s.chapterSlug, s.sectionId); setAiOpen(false); setQuery('') }}
                      className="w-full text-left text-[11px] py-1 px-2 rounded-md transition-colors"
                      style={{ color: 'var(--accent)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      → {s.chapterTitle} · {s.heading}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Highlight de términos en el snippet
function highlightTerms(text, query) {
  if (!text) return null
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2)
  if (terms.length === 0) return text
  const parts = []
  let i = 0
  const lower = text.toLowerCase()
  while (i < text.length) {
    let matched = false
    for (const t of terms) {
      if (lower.startsWith(t, i)) {
        parts.push(<mark key={i} style={{ background: 'rgba(2,132,199,0.18)', color: 'inherit', padding: '0 2px', borderRadius: 2 }}>{text.slice(i, i + t.length)}</mark>)
        i += t.length
        matched = true
        break
      }
    }
    if (!matched) {
      // Agregar chars hasta el próximo match potencial
      let j = i + 1
      while (j < text.length) {
        let hit = false
        for (const t of terms) { if (lower.startsWith(t, j)) { hit = true; break } }
        if (hit) break
        j++
      }
      parts.push(text.slice(i, j))
      i = j
    }
  }
  return <>{parts}</>
}

// ── Componente principal ────────────────────────────────────────────────────
export default function Docs() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const chapter = getChapterBySlug(slug)
  const [activeHeading, setActiveHeading] = useState('')

  // Scroll-spy: detectar qué heading está visible
  useEffect(() => {
    if (!chapter?.headings || chapter.headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.target.offsetTop - b.target.offsetTop)
        if (visible.length > 0) setActiveHeading(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    // Esperar a que el contenido renderice
    const timer = setTimeout(() => {
      chapter.headings.forEach(h => {
        const el = document.getElementById(h.id)
        if (el) observer.observe(el)
      })
    }, 100)

    return () => { clearTimeout(timer); observer.disconnect() }
  }, [chapter?.slug])

  // Si llegan con hash en URL, scrollear al heading
  useEffect(() => {
    if (window.location.hash) {
      setTimeout(() => {
        const id = decodeURIComponent(window.location.hash.slice(1))
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    } else {
      // sin hash: scrolear al top del contenido al cambiar capítulo
      const c = document.getElementById('docs-content')
      if (c) c.scrollTop = 0
    }
  }, [chapter?.slug])

  const handleSelect = (newSlug) => {
    navigate(`/admin/docs/${newSlug}`)
  }

  const handleResultClick = (chSlug, sectionId) => {
    if (chSlug === chapter?.slug) {
      // mismo capítulo: solo scroll
      const el = document.getElementById(sectionId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate(`/admin/docs/${chSlug}#${sectionId}`)
    }
  }

  if (!chapter) {
    return <div className="p-6 text-[14px] th-text-m">Capítulo no encontrado</div>
  }

  return (
    <div className="docs-shell" style={{ display: 'grid', gridTemplateColumns: '230px 1fr 200px', gap: 24, minHeight: 'calc(100dvh - 140px)' }}>
      <style>{`
        @media (max-width: 1100px) {
          .docs-shell { grid-template-columns: 1fr !important; }
          .docs-side, .docs-onpage { display: none !important; }
        }
        .prose-docs h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; color: var(--text-primary); }
        .prose-docs h2 { font-size: 19px; font-weight: 700; margin-top: 36px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); scroll-margin-top: 24px; }
        .prose-docs h3 { font-size: 15px; font-weight: 700; margin-top: 24px; margin-bottom: 8px; color: var(--text-primary); }
        .prose-docs p  { font-size: 14px; line-height: 1.7; margin-bottom: 14px; color: var(--text-primary); }
        .prose-docs ul, .prose-docs ol { padding-left: 24px; margin-bottom: 14px; }
        .prose-docs li { font-size: 14px; line-height: 1.7; margin-bottom: 4px; color: var(--text-primary); }
        .prose-docs strong { font-weight: 700; color: var(--text-primary); }
        .prose-docs code { font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace; font-size: 12.5px; background: var(--bg-base); border: 1px solid var(--border-light); padding: 1px 5px; border-radius: 4px; color: #c026d3; }
        .prose-docs pre { background: var(--bg-base); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; overflow-x: auto; font-size: 12.5px; line-height: 1.55; margin: 14px 0; }
        .prose-docs pre code { background: transparent; border: none; padding: 0; color: var(--text-primary); font-size: inherit; }
        .prose-docs blockquote { border-left: 3px solid var(--accent); padding: 6px 14px; margin: 14px 0; background: rgba(2,132,199,0.04); border-radius: 0 8px 8px 0; }
        .prose-docs blockquote p { margin-bottom: 0; }
        .prose-docs table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; }
        .prose-docs thead { background: var(--bg-base); }
        .prose-docs th { text-align: left; padding: 10px 12px; font-weight: 700; font-size: 12px; color: var(--text-primary); border-bottom: 1px solid var(--border); }
        .prose-docs td { padding: 9px 12px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
        .prose-docs tr:last-child td { border-bottom: none; }
        .prose-docs a { color: var(--accent); text-decoration: none; }
        .prose-docs a:hover { text-decoration: underline; }
        .prose-docs hr { border: none; border-top: 1px solid var(--border-light); margin: 24px 0; }
        .prose-docs h2 .icon-link, .prose-docs h3 .icon-link { opacity: 0; transition: opacity 0.15s; color: var(--text-muted); margin-left: 8px; font-size: 12px; }
        .prose-docs h2:hover .icon-link, .prose-docs h3:hover .icon-link { opacity: 1; }
        /* highlight.js mínimo */
        .hljs-keyword { color: #c026d3; }
        .hljs-string  { color: #16a34a; }
        .hljs-number  { color: #ea580c; }
        .hljs-comment { color: var(--text-muted); font-style: italic; }
        .hljs-function, .hljs-title { color: #2563eb; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* Sidebar izquierda — TOC capítulos */}
      <aside className="docs-side rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', alignSelf: 'flex-start', position: 'sticky', top: 16, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
        <DocsSidebar activeSlug={chapter.slug} onSelect={handleSelect}/>
      </aside>

      {/* Contenido central */}
      <main id="docs-content" className="rounded-xl p-6 md:p-10" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 'calc(100dvh - 140px)' }}>
        {/* Search bar siempre arriba */}
        <div className="mb-8">
          <DocsSearch onResultClick={handleResultClick}/>
        </div>

        <article className="prose-docs">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: 'append', properties: { className: 'icon-link', 'aria-hidden': 'true' }, content: { type: 'text', value: '#' } }],
              rehypeHighlight,
            ]}>
            {chapter.body}
          </ReactMarkdown>
        </article>
      </main>

      {/* Sidebar derecha — On this page */}
      <aside className="docs-onpage" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}>
        <OnThisPage headings={chapter.headings} activeId={activeHeading}/>
      </aside>
    </div>
  )
}
