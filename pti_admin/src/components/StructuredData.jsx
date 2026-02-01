import { useMemo } from 'react'

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

function labelize(key) {
  if (!key) return ''
  const s = String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatPrimitive(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  return String(v)
}

function unionKeys(rows) {
  const set = new Set()
  rows.forEach((r) => {
    if (!isPlainObject(r)) return
    Object.keys(r).forEach((k) => set.add(k))
  })
  // prefer common keys first
  const preferred = ['id', 'name', 'label', 'title', 'question', 'status', 'value', 'observation', 'notes', 'url']
  const keys = Array.from(set)
  keys.sort((a, b) => {
    const ia = preferred.indexOf(a)
    const ib = preferred.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    return a.localeCompare(b)
  })
  return keys
}

function PreviewValue({ value }) {
  if (value === null || value === undefined) return <span className="text-primary/50">—</span>
  if (typeof value === 'string' && value.length > 120) {
    return <span title={value}>{value.slice(0, 120)}…</span>
  }
  return <span>{formatPrimitive(value)}</span>
}

function Table({ rows }) {
  const keys = useMemo(() => unionKeys(rows), [rows])
  if (!keys.length) return null

  return (
    <div className="overflow-auto rounded-3xl border border-primary/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-primary/5">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-3 py-2 text-[11px] font-extrabold text-primary/70 whitespace-nowrap">
                {labelize(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t border-primary/10">
              {keys.map((k) => (
                <td key={k} className="px-3 py-2 text-primary/80 align-top">
                  {isPlainObject(r?.[k]) || Array.isArray(r?.[k]) ? (
                    <span className="text-primary/50">(ver detalle)</span>
                  ) : (
                    <PreviewValue value={r?.[k]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Node({ title, value, level = 0 }) {
  const padding = level === 0 ? 'p-0' : 'p-3'

  if (Array.isArray(value)) {
    const allPrimitives = value.every((x) => !isPlainObject(x) && !Array.isArray(x))
    const allObjects = value.every((x) => isPlainObject(x))

    return (
      <div className="space-y-2">
        {title && <div className="text-xs font-extrabold text-primary">{title}</div>}

        {value.length === 0 ? (
          <div className="text-sm text-primary/50">(vacío)</div>
        ) : allPrimitives ? (
          <div className="flex flex-wrap gap-2">
            {value.map((v, i) => (
              <span key={i} className="px-2 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-bold text-primary/80">
                {formatPrimitive(v)}
              </span>
            ))}
          </div>
        ) : allObjects ? (
          <Table rows={value} />
        ) : (
          <div className="space-y-2">
            {value.map((v, i) => (
              <details key={i} className="rounded-3xl border border-primary/10 bg-white">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-extrabold text-primary">Elemento {i + 1}</summary>
                <div className="px-4 pb-4 pt-1">
                  <Node value={v} level={level + 1} />
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    const bigObject = entries.length > 10

    if (bigObject) {
      return (
        <details className="rounded-3xl border border-primary/10 bg-white" open={level < 1}>
          {title && (
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-extrabold text-primary">
              {title}
            </summary>
          )}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${title ? 'px-4 pb-4 pt-1' : 'p-4'}`}>
            {entries.map(([k, v]) => (
              <div key={k} className="rounded-3xl border border-primary/10 p-3">
                <div className="text-[11px] text-primary/60 font-bold">{labelize(k)}</div>
                {isPlainObject(v) || Array.isArray(v) ? (
                  <div className="mt-2">
                    <Node value={v} level={level + 1} />
                  </div>
                ) : (
                  <div className="text-sm font-extrabold text-primary mt-1 break-words">{formatPrimitive(v) || '—'}</div>
                )}
              </div>
            ))}
          </div>
        </details>
      )
    }

    return (
      <div className={`space-y-2 ${padding}`}>
        {title && <div className="text-xs font-extrabold text-primary">{title}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-3xl border border-primary/10 p-3">
              <div className="text-[11px] text-primary/60 font-bold">{labelize(k)}</div>
              {isPlainObject(v) || Array.isArray(v) ? (
                <div className="mt-2">
                  <Node value={v} level={level + 1} />
                </div>
              ) : (
                <div className="text-sm font-extrabold text-primary mt-1 break-words">{formatPrimitive(v) || '—'}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {title && <div className="text-xs font-extrabold text-primary">{title}</div>}
      <div className="text-sm text-primary/80">{formatPrimitive(value) || '—'}</div>
    </div>
  )
}

export default function StructuredData({ data, title }) {
  return (
    <div className="space-y-3">
      {title && <div className="text-sm font-extrabold text-primary">{title}</div>}
      <Node value={data} />
    </div>
  )
}
