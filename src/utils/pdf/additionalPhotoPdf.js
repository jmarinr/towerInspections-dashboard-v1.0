/**
 * additionalPhotoPdf.js
 * Genera el PDF del Reporte Adicional de Fotografías
 * Mantiene la misma estética que equipmentV2Pdf.js
 */
import jsPDF from 'jspdf'
import { PHOTO_CATEGORIES } from '../../data/additionalPhotoConfig'

// ── Colores de marca (igual que los otros PDFs) ───────────────────────────────
const C = {
  navy:        [13,  33,  55],
  white:       [255, 255, 255],
  accent:      [2,   132, 199],
  accentLight: [224, 242, 254],
  green:       [22,  163, 74],
  greenLight:  [240, 253, 244],
  amber:       [180, 83,  9],
  amberLight:  [255, 251, 235],
  gray100:     [248, 250, 252],
  gray200:     [226, 232, 240],
  gray400:     [148, 163, 184],
  gray600:     [71,  85,  105],
  gray800:     [30,  41,  59],
  pink:        [219, 39,  119],
  pinkLight:   [253, 242, 248],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const rgb = (doc, color) => { doc.setTextColor(...color) }
const fill = (doc, color) => { doc.setFillColor(...color) }
const stroke = (doc, color) => { doc.setDrawColor(...color) }

function addPage(doc, meta) {
  doc.addPage()
  addPageFooter(doc, meta)
}

function addPageFooter(doc, meta) {
  const { pageWidth, margin } = meta
  const y = 282
  doc.setLineWidth(0.3)
  stroke(doc, C.gray200)
  doc.line(margin, y - 2, pageWidth - margin, y - 2)
  doc.setFontSize(7)
  rgb(doc, C.gray400)
  doc.text('PTI TeleInspect — Reporte Adicional de Fotografías', margin, y + 2)
  doc.text(`Pág. ${doc.internal.getNumberOfPages()}`, pageWidth - margin, y + 2, { align: 'right' })
}

function checkY(doc, y, meta, needed = 20) {
  if (y + needed > 272) {
    addPage(doc, meta)
    return meta.margin + 5
  }
  return y
}

async function loadImage(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Cover page ────────────────────────────────────────────────────────────────
function drawCover(doc, siteInfo, submission, meta) {
  const { pageWidth, pageHeight } = meta

  // Fondo navy
  fill(doc, C.navy)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Banda accent
  fill(doc, C.pink)
  doc.rect(0, 0, pageWidth, 4, 'F')

  // Logo area
  doc.setFontSize(9)
  rgb(doc, [100, 180, 230])
  doc.setFont('helvetica', 'bold')
  doc.text('PTI TELEINSPECT', pageWidth / 2, 28, { align: 'center' })

  // Icono central (representación tipográfica)
  doc.setFontSize(32)
  rgb(doc, C.pink)
  doc.text('📸', pageWidth / 2, 65, { align: 'center' })

  // Título
  doc.setFontSize(22)
  rgb(doc, C.white)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE ADICIONAL', pageWidth / 2, 90, { align: 'center' })
  doc.setFontSize(16)
  rgb(doc, [200, 210, 230])
  doc.text('DE FOTOGRAFÍAS', pageWidth / 2, 100, { align: 'center' })

  // Línea decorativa
  fill(doc, C.pink)
  doc.rect(pageWidth / 2 - 30, 106, 60, 1.5, 'F')

  // Datos del sitio
  const siteName  = siteInfo.nombreSitio || siteInfo.nombre_sitio || '—'
  const siteId    = siteInfo.idSitio     || siteInfo.id_sitio     || '—'
  const date      = siteInfo.fecha       || siteInfo.fechaInicio  || ''
  const provider  = siteInfo.proveedor   || ''

  doc.setFontSize(14)
  rgb(doc, C.white)
  doc.setFont('helvetica', 'bold')
  doc.text(siteName, pageWidth / 2, 120, { align: 'center' })

  doc.setFontSize(10)
  rgb(doc, [160, 190, 220])
  doc.setFont('helvetica', 'normal')
  doc.text(siteId, pageWidth / 2, 128, { align: 'center' })

  // Info box
  const bx = 30, by = 140, bw = pageWidth - 60, bh = 40
  fill(doc, [255, 255, 255, 15])
  doc.setFillColor(255, 255, 255)
  doc.setGState(new doc.GState({ opacity: 0.08 }))
  doc.rect(bx, by, bw, bh, 'F')
  doc.setGState(new doc.GState({ opacity: 1 }))
  stroke(doc, [255, 255, 255, 30])
  doc.setLineWidth(0.3)
  doc.rect(bx, by, bw, bh, 'S')

  const pairs = [
    ['Proveedor', provider || '—'],
    ['Fecha', date || '—'],
    ['ID Sitio', siteId],
  ]
  const colW = bw / pairs.length
  pairs.forEach(([label, value], i) => {
    const cx = bx + i * colW + colW / 2
    doc.setFontSize(7)
    rgb(doc, [140, 170, 200])
    doc.setFont('helvetica', 'bold')
    doc.text(label.toUpperCase(), cx, by + 12, { align: 'center' })
    doc.setFontSize(9)
    rgb(doc, C.white)
    doc.setFont('helvetica', 'bold')
    doc.text(String(value), cx, by + 22, { align: 'center' })
  })

  // Total categorías
  doc.setFontSize(9)
  rgb(doc, [140, 170, 200])
  doc.setFont('helvetica', 'normal')
  doc.text(`${PHOTO_CATEGORIES.length} categorías fotográficas`, pageWidth / 2, 198, { align: 'center' })

  // Footer cover
  doc.setFontSize(7)
  rgb(doc, [80, 110, 150])
  doc.text('Generado con PTI TeleInspect Admin Panel', pageWidth / 2, pageHeight - 10, { align: 'center' })
}

// ── Index page ────────────────────────────────────────────────────────────────
function drawIndex(doc, assetMap, rawPhotos, meta) {
  const { pageWidth, margin } = meta
  let y = margin

  // Header
  fill(doc, C.navy)
  doc.rect(0, 0, pageWidth, 18, 'F')
  fill(doc, C.pink)
  doc.rect(0, 0, pageWidth, 2, 'F')
  doc.setFontSize(10)
  rgb(doc, C.white)
  doc.setFont('helvetica', 'bold')
  doc.text('ÍNDICE DE CATEGORÍAS', margin, 12)
  y = 26

  for (const cat of PHOTO_CATEGORIES) {
    y = checkY(doc, y, meta, 9)
    const catPhotos = assetMap[cat.id] || []
    const fromData  = (rawPhotos[cat.id] || []).filter(Boolean)
    const count     = Math.max(catPhotos.filter(p => p).length, fromData.length)
    const ok        = count >= cat.minPhotos

    // Row bg alternado
    if (PHOTO_CATEGORIES.indexOf(cat) % 2 === 0) {
      fill(doc, C.gray100)
      doc.rect(margin - 2, y - 4, pageWidth - margin * 2 + 4, 8, 'F')
    }

    // Status dot
    fill(doc, ok ? C.green : count > 0 ? [180, 83, 9] : C.gray400)
    doc.circle(margin + 2, y - 0.5, 1.5, 'F')

    doc.setFontSize(8.5)
    rgb(doc, C.gray800)
    doc.setFont('helvetica', 'normal')
    doc.text(`${cat.emoji} ${cat.title}`, margin + 7, y)

    // Código
    doc.setFontSize(7)
    rgb(doc, C.gray400)
    doc.setFont('helvetica', 'bold')
    doc.text(cat.id, pageWidth / 2, y)

    // Conteo
    const countText = ok ? `${count} fotos ✓` : `${count}/${cat.minPhotos} fotos`
    doc.setFontSize(7.5)
    rgb(doc, ok ? C.green : count > 0 ? C.amber : C.gray400)
    doc.text(countText, pageWidth - margin, y, { align: 'right' })

    y += 8.5
  }

  addPageFooter(doc, meta)
}

// ── Section header ────────────────────────────────────────────────────────────
function drawSectionHeader(doc, cat, y, meta) {
  const { pageWidth, margin } = meta

  fill(doc, C.navy)
  doc.rect(0, y, pageWidth, 14, 'F')
  fill(doc, C.pink)
  doc.rect(0, y, 3, 14, 'F')

  // Emoji + Título
  doc.setFontSize(11)
  rgb(doc, C.white)
  doc.setFont('helvetica', 'bold')
  doc.text(`${cat.emoji}  ${cat.title}`, margin + 5, y + 9)

  // Acronym badge
  fill(doc, C.pink)
  doc.roundedRect(pageWidth - margin - 18, y + 3, 14, 8, 1, 1, 'F')
  doc.setFontSize(7)
  rgb(doc, C.white)
  doc.setFont('helvetica', 'bold')
  doc.text(cat.id, pageWidth - margin - 18 + 7, y + 8.5, { align: 'center' })

  return y + 18
}

// ── Photo grid (2 cols) ───────────────────────────────────────────────────────
async function drawPhotoGrid(doc, cat, photos, meta) {
  const { pageWidth, margin } = meta
  const cols     = 2
  const gutter   = 6
  const cellW    = (pageWidth - margin * 2 - gutter * (cols - 1)) / cols
  const imgH     = cellW * 0.7
  const labelH   = 10
  const cellH    = imgH + labelH + 4
  let y          = meta.margin + 5

  // Nueva página para la sección
  addPage(doc, meta)
  y = drawSectionHeader(doc, cat, meta.margin - 5, meta) + 2

  // Descripción
  doc.setFontSize(7.5)
  rgb(doc, C.gray600)
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(cat.description, pageWidth - margin * 2)
  doc.text(lines, margin, y)
  y += lines.length * 4 + 2

  // Info pills en línea
  doc.setFontSize(7)
  rgb(doc, C.accent)
  doc.setFont('helvetica', 'bold')
  doc.text(`📷 Mín. ${cat.minPhotos} foto${cat.minPhotos !== 1 ? 's' : ''}`, margin, y)
  doc.setFontSize(7)
  rgb(doc, C.gray400)
  doc.setFont('helvetica', 'normal')
  doc.text(`  ·  ${cat.quality}`, margin + 28, y)
  if (cat.variable) {
    rgb(doc, C.amber)
    doc.text('  ·  Cantidad variable', margin + 65, y)
  }
  y += 6

  // Sub-groups si existen
  if (cat.subGroups) {
    doc.setFontSize(6.5)
    rgb(doc, C.gray400)
    doc.setFont('helvetica', 'bold')
    doc.text('VISTAS SUGERIDAS:', margin, y)
    y += 4
    const sgLine = cat.subGroups.map(sg => `${cat.id}_${sg.key} · ${sg.label}`).join('  |  ')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    const sgLines = doc.splitTextToSize(sgLine, pageWidth - margin * 2)
    doc.text(sgLines, margin, y)
    y += sgLines.length * 3.5 + 2
  }

  y += 3
  // Separador
  stroke(doc, C.gray200)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  if (photos.length === 0) {
    // Placeholder vacío
    fill(doc, C.gray100)
    doc.rect(margin, y, pageWidth - margin * 2, 30, 'F')
    stroke(doc, C.gray200)
    doc.rect(margin, y, pageWidth - margin * 2, 30, 'S')
    doc.setFontSize(9)
    rgb(doc, C.gray400)
    doc.text('Sin fotos capturadas', pageWidth / 2, y + 18, { align: 'center' })
    return
  }

  let col = 0
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    if (!photo) continue
    const x = margin + col * (cellW + gutter)

    y = checkY(doc, y, meta, cellH + 4)

    const url       = photo.public_url || photo.storage_url || photo.url || null
    const subLabel  = cat.subLabels?.[i] ?? (cat.subGroups ? `Foto ${i + 1}` : `Foto ${i + 1}`)
    const code      = `${cat.id}_${String(i + 1).padStart(2, '0')}`

    // Frame de la imagen
    fill(doc, C.gray100)
    doc.rect(x, y, cellW, imgH, 'F')
    stroke(doc, C.gray200)
    doc.setLineWidth(0.3)
    doc.rect(x, y, cellW, imgH, 'S')

    // Imagen
    if (url) {
      try {
        const imgData = await loadImage(url)
        if (imgData) {
          doc.addImage(imgData, 'JPEG', x, y, cellW, imgH, undefined, 'FAST')
        }
      } catch {}
    } else {
      // Placeholder
      doc.setFontSize(8)
      rgb(doc, C.gray400)
      doc.text('Sin imagen', x + cellW / 2, y + imgH / 2, { align: 'center' })
    }

    // Código badge sobre la imagen
    fill(doc, [0, 0, 0])
    doc.setFillColor(0, 0, 0)
    doc.setGState(new doc.GState({ opacity: 0.5 }))
    doc.rect(x + 2, y + 2, 16, 5, 'F')
    doc.setGState(new doc.GState({ opacity: 1 }))
    doc.setFontSize(5.5)
    rgb(doc, C.white)
    doc.setFont('helvetica', 'bold')
    doc.text(code, x + 10, y + 5.5, { align: 'center' })

    // Label bajo la imagen
    fill(doc, C.navy)
    doc.rect(x, y + imgH, cellW, labelH, 'F')
    doc.setFontSize(7)
    rgb(doc, C.white)
    doc.setFont('helvetica', 'bold')
    const labelText = doc.splitTextToSize(subLabel, cellW - 4)
    doc.text(labelText[0], x + cellW / 2, y + imgH + 6, { align: 'center' })

    col++
    if (col >= cols) {
      col = 0
      y += cellH + 4
    }
  }

  // Completar fila incompleta
  if (col > 0) y += cellH + 4
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateAdditionalPhotoPdf(submission, assets) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin     = 12
  const meta       = { pageWidth, pageHeight, margin }

  // Extraer datos
  const raw      = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const siteInfo = raw.siteInfo || {}
  const photos   = raw.photos  || {}
  const notes    = raw.notes   || ''

  // Mapear assets de Supabase
  const assetMap = {}
  if (assets) {
    for (const a of assets) {
      const type  = a.asset_type || a.type || ''
      const parts = type.split(':')
      if (parts[0] === 'photos' && parts[1]) {
        const acronym = parts[1]
        const idx     = parseInt(parts[2] ?? '0')
        if (!assetMap[acronym]) assetMap[acronym] = []
        assetMap[acronym][idx] = a
      }
    }
  }

  // Portada
  drawCover(doc, siteInfo, submission, meta)

  // Índice
  addPage(doc, meta)
  drawIndex(doc, assetMap, photos, meta)

  // Una sección por categoría
  for (const cat of PHOTO_CATEGORIES) {
    const fromSupabase = assetMap[cat.id] || []
    const fromPayload  = (photos[cat.id] || [])
      .filter(Boolean)
      .map(url => ({ public_url: url }))
    const merged = fromSupabase.length > 0 ? fromSupabase : fromPayload
    if (merged.length > 0) {
      await drawPhotoGrid(doc, cat, merged, meta)
    }
  }

  // Observaciones (si hay)
  if (notes) {
    addPage(doc, meta)
    let y = meta.margin
    fill(doc, C.navy)
    doc.rect(0, y, pageWidth, 14, 'F')
    fill(doc, C.pink)
    doc.rect(0, y, 3, 14, 'F')
    doc.setFontSize(10)
    rgb(doc, C.white)
    doc.setFont('helvetica', 'bold')
    doc.text('📝  OBSERVACIONES', margin + 5, y + 9)
    y += 22

    fill(doc, C.gray100)
    const notesLines = doc.splitTextToSize(notes, pageWidth - margin * 2 - 8)
    doc.rect(margin, y, pageWidth - margin * 2, notesLines.length * 5 + 10, 'F')
    stroke(doc, C.gray200)
    doc.rect(margin, y, pageWidth - margin * 2, notesLines.length * 5 + 10, 'S')
    doc.setFontSize(9)
    rgb(doc, C.gray800)
    doc.setFont('helvetica', 'normal')
    doc.text(notesLines, margin + 4, y + 8)
  }

  // Nombre del archivo
  const siteName = siteInfo.idSitio || siteInfo.id_sitio || 'sitio'
  const fecha    = siteInfo.fecha   || siteInfo.fechaInicio || new Date().toISOString().slice(0, 10)
  const fileName = `PTI_ReporteFotos_${siteName}_${fecha}.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, '_')

  doc.save(fileName)
}
