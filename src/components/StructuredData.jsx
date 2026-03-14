import { useMemo } from 'react'

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

function isImageUrl(v) {
  if (typeof v !== 'string') return false
  const s = v.toLowerCase()
  return s.startsWith('data:image/') || s.startsWith('http') && (s.includes('.jpg') || s.includes('.jpeg') || s.includes('.png') || s.includes('.webp'))
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
  if (v === '__photo__') return '📷 (foto subida)'
  return String(v)
}

function unionKeys(rows) {
  const set = new Set()
  rows.forEach((r) => {
    if (!isPlainObject(r)) return
    Object.keys(r).forEach((k) => set.add(k))
  })
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
  if (value === null || value === undefined) return <span className="th-text-m">—</span>
  if (value === '__photo__') return <span className="text-accent font-bold">📷 Foto</span>
  if (isImageUrl(value)) {
    return <img src={value} alt="" className="w-16 h-16 rounded-xl object-cover border th-border" />
  }
  if (typeof value === 'string' && value.length > 100) {
    return <span title={value}>{value.slice(0, 100)}…</span>
  }
  return <span>{formatPrimitive(value)}</span>
}

function Table({ rows }) {
  const keys = useMemo(() => unionKeys(rows), [rows])
  if (!keys.length) return null

  return (
    <div className="overflow-auto rounded-2xl border th-border">
      <table className="min-w-full text-left text-sm">
        <thead className="th-bg-base">
          <tr>
            {keys.map((k) => (
              <th key={k} className="px-3 py-2 text-[11px] font-extrabold th-text-s whitespace-nowrap">
                {labelize(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-t th-border-l">
              {keys.map((k) => (
                <td key={k} className="px-3 py-2 th-text-s align-top">
                  {isPlainObject(r?.[k]) || Array.isArray(r?.[k]) ? (
                    <span className="th-text-m text-xs">(ver detalle)</span>
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
  if (Array.isArray(value)) {
    const allPrimitives = value.every((x) => !isPlainObject(x) && !Array.isArray(x))
    const allObjects = value.every((x) => isPlainObject(x))

    return (
      <div className="space-y-2">
        {title && <div className="text-xs font-extrabold th-text-p">{title}</div>}
        {value.length === 0 ? (
          <div className="text-sm th-text-m">(vacío)</div>
        ) : allPrimitives ? (
          <div className="flex flex-wrap gap-2">
            {value.map((v, i) => (
              <span key={i} className="px-2 py-1 rounded-full th-bg-base border th-border text-xs font-bold th-text-s">
                {formatPrimitive(v)}
              </span>
            ))}
          </div>
        ) : allObjects ? (
          <Table rows={value} />
        ) : (
          <div className="space-y-2">
            {value.map((v, i) => (
              <details key={i} className="rounded-2xl border th-border th-bg-card">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-extrabold th-text-p">Elemento {i + 1}</summary>
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
    const bigObject = entries.length > 8

    if (bigObject && level > 0) {
      return (
        <details className="rounded-2xl border th-border th-bg-card" open={level < 2}>
          {title && (
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-extrabold th-text-p">
              {title}
            </summary>
          )}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${title ? 'px-4 pb-4 pt-1' : 'p-3'}`}>
            {entries.map(([k, v]) => (
              <div key={k} className="rounded-2xl border th-border-l p-3">
                <div className="text-[11px] th-text-s font-bold">{labelize(k)}</div>
                {isPlainObject(v) || Array.isArray(v) ? (
                  <div className="mt-2"><Node value={v} level={level + 1} /></div>
                ) : isImageUrl(v) ? (
                  <img src={v} alt={k} className="mt-2 w-full max-w-[200px] rounded-xl border th-border object-cover" />
                ) : (
                  <div className="text-sm font-bold th-text-p mt-1 break-words">{formatPrimitive(v) || '—'}</div>
                )}
              </div>
            ))}
          </div>
        </details>
      )
    }

    return (
      <div className="space-y-2">
        {title && <div className="text-xs font-extrabold th-text-p">{title}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-2xl border th-border-l p-3">
              <div className="text-[11px] th-text-s font-bold">{labelize(k)}</div>
              {isPlainObject(v) || Array.isArray(v) ? (
                <div className="mt-2"><Node value={v} level={level + 1} /></div>
              ) : isImageUrl(v) ? (
                <img src={v} alt={k} className="mt-2 w-full max-w-[200px] rounded-xl border th-border object-cover" />
              ) : (
                <div className="text-sm font-bold th-text-p mt-1 break-words">{formatPrimitive(v) || '—'}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {title && <div className="text-xs font-extrabold th-text-p">{title}</div>}
      {isImageUrl(value) ? (
        <img src={value} alt="" className="w-full max-w-[200px] rounded-xl border th-border object-cover" />
      ) : (
        <div className="text-sm th-text-s">{formatPrimitive(value) || '—'}</div>
      )}
    </div>
  )
}

export default function StructuredData({ data, title }) {
  return (
    <div className="space-y-3">
      {title && <div className="text-sm font-extrabold th-text-p">{title}</div>}
      <Node value={data} />
    </div>
  )
}
