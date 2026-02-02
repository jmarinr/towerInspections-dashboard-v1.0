import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const isImageString = (v) => {
  if (typeof v !== 'string') return false
  const s = v.toLowerCase()
  return s.startsWith('data:image/') || s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.png') || s.endsWith('.webp')
}

const safeLabel = (key) => {
  if (!key) return ''
  return String(key)
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function* walkAllPaths(value, path = []) {
  yield { path, value }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      yield* walkAllPaths(value[i], [...path, String(i)])
    }
  } else if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      yield* walkAllPaths(value[k], [...path, k])
    }
  }
}

const extractImageUrls = (order) => {
  const urls = new Set()
  // 1) Prefer explicit photos array
  if (order?.photos?.length) {
    for (const p of order.photos) {
      if (p?.url) urls.add(p.url)
    }
  }
  // 2) Also scan payload for image-like strings
  for (const { value } of walkAllPaths(order?.payload ?? {})) {
    if (isImageString(value)) urls.add(value)
  }
  return [...urls]
}

const fetchBytes = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo cargar imagen: ${url}`)
  return new Uint8Array(await res.arrayBuffer())
}

const guessExt = (url) => {
  const s = String(url).toLowerCase()
  if (s.startsWith('data:image/png')) return 'png'
  if (s.startsWith('data:image/jpeg') || s.startsWith('data:image/jpg')) return 'jpg'
  if (s.endsWith('.png')) return 'png'
  if (s.endsWith('.webp')) return 'webp'
  return 'jpg'
}

const asText = (v) => {
  if (v === null) return 'null'
  if (v === undefined) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString()
  return JSON.stringify(v)
}

export async function generateOrderPdf(order) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageSize = { width: 595.28, height: 841.89 } // A4
  const margin = 44
  const contentWidth = pageSize.width - margin * 2
  const lineGap = 4

  let page = pdfDoc.addPage([pageSize.width, pageSize.height])
  let y = pageSize.height - margin

  const newPage = () => {
    page = pdfDoc.addPage([pageSize.width, pageSize.height])
    y = pageSize.height - margin
  }

  const ensureSpace = (needed) => {
    if (y - needed < margin) newPage()
  }

  const drawLine = (thickness = 1) => {
    ensureSpace(10)
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageSize.width - margin, y },
      thickness,
      color: rgb(0.1, 0.11, 0.12)
    })
    y -= 10
  }

  const wrapLines = (text, size, maxWidth) => {
    const words = String(text).split(/\s+/).filter(Boolean)
    const lines = []
    let current = ''
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w
      const width = font.widthOfTextAtSize(candidate, size)
      if (width <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        // if single word too long, hard-break
        if (font.widthOfTextAtSize(w, size) > maxWidth) {
          let chunk = ''
          for (const ch of w) {
            const cand2 = chunk + ch
            if (font.widthOfTextAtSize(cand2, size) <= maxWidth) chunk = cand2
            else {
              lines.push(chunk)
              chunk = ch
            }
          }
          current = chunk
        } else {
          current = w
        }
      }
    }
    if (current) lines.push(current)
    return lines.length ? lines : ['']
  }

  const drawText = (text, { size = 11, bold = false, indent = 0, color = rgb(0.1, 0.11, 0.12) } = {}) => {
    const x = margin + indent
    const maxWidth = contentWidth - indent
    const lines = wrapLines(text, size, maxWidth)
    for (const line of lines) {
      ensureSpace(size + lineGap)
      page.drawText(line, {
        x,
        y: y - size,
        size,
        font: bold ? fontBold : font,
        color
      })
      y -= size + lineGap
    }
  }

  // Header
  drawText('PTI Inspect · Informe de Inspección', { size: 18, bold: true })
  drawText(`${order?.id ?? ''} · ${order?.type ?? ''}`, { size: 12, bold: true, color: rgb(0.2, 0.25, 0.3) })
  drawText(`${order?.siteName ?? ''} (${order?.siteId ?? ''})`, { size: 11, color: rgb(0.25, 0.3, 0.35) })
  drawText(`Estado: ${order?.status ?? '—'} · Inspector: ${order?.inspectorName ?? '—'} · Prioridad: ${order?.priority ?? '—'}`, { size: 10, color: rgb(0.35, 0.4, 0.45) })
  drawText(`Creada: ${order?.createdAt ? new Date(order.createdAt).toLocaleString() : '—'} · Actualizada: ${order?.updatedAt ? new Date(order.updatedAt).toLocaleString() : '—'}`, { size: 10, color: rgb(0.35, 0.4, 0.45) })
  drawLine(1)

  // Notes
  if (order?.notes) {
    drawText('Notas', { size: 12, bold: true })
    drawText(order.notes, { size: 10 })
    drawLine(1)
  }

  // Structured payload (100% fields)
  drawText('Datos completos del formulario', { size: 12, bold: true })

  const renderValue = (key, value, indent = 0) => {
    const label = safeLabel(key)
    if (Array.isArray(value)) {
      drawText(`${label}:`, { size: 10, bold: true, indent })
      if (value.length === 0) {
        drawText('—', { size: 10, indent: indent + 12 })
        return
      }
      value.forEach((item, idx) => {
        if (item && typeof item === 'object') {
          drawText(`• Item ${idx + 1}`, { size: 10, bold: true, indent: indent + 12 })
          renderObject(item, indent + 24)
        } else {
          drawText(`• ${asText(item)}`, { size: 10, indent: indent + 12 })
        }
      })
      return
    }

    if (value && typeof value === 'object') {
      drawText(`${label}:`, { size: 10, bold: true, indent })
      renderObject(value, indent + 12)
      return
    }

    drawText(`${label}: ${asText(value)}`, { size: 10, indent })
  }

  const renderObject = (obj, indent = 0) => {
    const keys = Object.keys(obj ?? {})
    if (keys.length === 0) {
      drawText('—', { size: 10, indent })
      return
    }
    for (const k of keys) {
      renderValue(k, obj[k], indent)
    }
  }

  renderObject(order?.payload ?? {}, 0)

  // Photos section (when applicable)
  const urls = extractImageUrls(order)
  if (urls.length) {
    drawLine(1)
    drawText('Evidencia fotográfica', { size: 12, bold: true })
    drawText(`Total: ${urls.length}`, { size: 10, color: rgb(0.35, 0.4, 0.45) })

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const ext = guessExt(url)
      let bytes
      try {
        bytes = await fetchBytes(url)
      } catch {
        // If an image fails, still include the URL so nothing is "lost".
        drawText(`Foto ${i + 1}: ${url}`, { size: 9, indent: 0, color: rgb(0.6, 0.2, 0.2) })
        continue
      }

      let img
      try {
        if (ext === 'png') img = await pdfDoc.embedPng(bytes)
        else img = await pdfDoc.embedJpg(bytes)
      } catch {
        drawText(`Foto ${i + 1}: ${url}`, { size: 9, indent: 0, color: rgb(0.6, 0.2, 0.2) })
        continue
      }

      const maxW = contentWidth
      const maxH = 260
      const { width, height } = img.scale(1)
      const scale = Math.min(maxW / width, maxH / height)
      const w = width * scale
      const h = height * scale

      ensureSpace(h + 22)
      drawText(`Foto ${i + 1}`, { size: 10, bold: true })
      page.drawImage(img, {
        x: margin,
        y: y - h,
        width: w,
        height: h
      })
      y -= h + 10
      drawText(url, { size: 8, color: rgb(0.35, 0.4, 0.45) })
      y -= 6
    }
  }

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

export async function downloadOrderPdf(order) {
  const bytes = await generateOrderPdf(order)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${order?.id ?? 'informe'}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
