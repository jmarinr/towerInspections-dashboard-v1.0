/**
 * PTI TeleInspect — Inventario de Equipos v2 PDF
 * Replica exacta del formato de referencia 8_Equipment_inventory_2026.pdf
 *
 * Estructura:
 *  Página 1   — Header + datos sitio + tabla Torre + 3 fotos torre
 *  Páginas 2+ — Inventario en Piso (clientes/gabinetes) + foto plano de planta
 *  Páginas +  — Carriers (todos continuos): tabla + Carrier/Comentario + 3 fotos c/u
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  black:     rgb(0.10, 0.10, 0.10),
  red:       rgb(0.87, 0.06, 0.06),
  white:     rgb(1,    1,    1),
  gray:      rgb(0.93, 0.93, 0.93),
  darkGray:  rgb(0.20, 0.20, 0.20),
  border:    rgb(0.72, 0.72, 0.72),
  text:      rgb(0.10, 0.10, 0.10),
  textLight: rgb(0.50, 0.50, 0.50),
}

// ── Page geometry ─────────────────────────────────────────────────────────────
const PW = 612, PH = 792
const ML = 36, MR = 36, MT = 36, MB = 36
const CW = PW - ML - MR  // 540

// ── Text sanitizer ─────────────────────────────────────────────────────────────
const s = (val) => {
  if (val == null) return ''
  return String(val)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/[\u0100-\uFFFF]/g, (c) => {
      const map = {
        'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n','ä':'a','ö':'o',
        'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ü':'U','Ñ':'N',
        '\u2019':"'",'–':'-','—':'-','\u201C':'"','\u201D':'"','\u2026':'...',
      }
      return map[c] || ''
    })
    .trim()
}

// ── Image embed helper ────────────────────────────────────────────────────────
async function fetchImg(doc, url) {
  if (!url) return null
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const b = new Uint8Array(await r.arrayBuffer())
    if (b[0] === 0xFF && b[1] === 0xD8) return await doc.embedJpg(b)
    if (b[0] === 0x89 && b[1] === 0x50) return await doc.embedPng(b)
    try { return await doc.embedJpg(b) } catch { try { return await doc.embedPng(b) } catch { return null } }
  } catch { return null }
}

// ── Page builder class ────────────────────────────────────────────────────────
class PageBuilder {
  constructor(doc, font, fontBold, logo, reportTitle) {
    this.doc       = doc
    this.font      = font
    this.fontBold  = fontBold
    this.logo      = logo
    this.reportTitle = reportTitle || 'REPORTE DE INVENTARIO DE EQUIPOS'
    this.page      = null
    this.y         = 0
    this.pageNum   = 0
    this._headerData = null
  }

  // ── Page management ──────────────────────────────────────────────────────────
  newPage() {
    if (this.page) this._drawFooter()
    this.page = this.doc.addPage([PW, PH])
    this.pageNum++
    this.y = PH - MT
  }

  checkSpace(needed) {
    if (this.y - needed < MB) {
      this._drawFooter()
      this.page = this.doc.addPage([PW, PH])
      this.pageNum++
      this.y = PH - MT
      if (this._headerData) this._miniHeader(this._headerData)
    }
  }

  _drawFooter() {
    const txt = 'Phoenix Tower International — Reporte de Inventario de Equipos'
    const pg  = `Pagina ${this.pageNum}`
    this.page.drawText(txt, { x: ML, y: 16, size: 5.5, font: this.font, color: C.textLight })
    this.page.drawText(pg,  {
      x: PW - MR - this.font.widthOfTextAtSize(pg, 5.5),
      y: 16, size: 5.5, font: this.font, color: C.textLight
    })
  }

  // ── Full first-page header ─────────────────────────────────────────────────
  drawHeader(data) {
    this._headerData = data
    const x = ML

    // Black title bar
    this.page.drawRectangle({ x, y: this.y - 18, width: CW, height: 18, color: C.black })
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', {
      x: x + (CW - this.fontBold.widthOfTextAtSize('PHOENIX TOWER INTERNATIONAL', 9)) / 2,
      y: this.y - 13, size: 9, font: this.fontBold, color: C.white
    })
    this.y -= 20

    // Red subtitle bar
    const sub = this.reportTitle
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.red })
    this.page.drawText(sub, {
      x: x + (CW - this.fontBold.widthOfTextAtSize(sub, 7)) / 2,
      y: this.y - 10, size: 7, font: this.fontBold, color: C.white
    })
    this.y -= 16

    // Logo row
    const logoRowH = 44
    this.page.drawRectangle({ x, y: this.y - logoRowH, width: CW, height: logoRowH, borderColor: C.border, borderWidth: 0.5 })

    // PTI logo left
    if (this.logo) {
      const d = this.logo.scale(0.18)
      const lw = Math.min(d.width, 110), lh = Math.min(d.height, 38)
      this.page.drawImage(this.logo, {
        x: x + 6, y: this.y - logoRowH + (logoRowH - lh) / 2,
        width: lw, height: lh
      })
    }

    // Proveedor / Tipo de Visita (center-left)
    const fX = x + 130
    const dotLine = (startX, endX, yy) => {
      for (let dx = startX; dx < endX; dx += 3)
        this.page.drawText('.', { x: dx, y: yy, size: 5, font: this.font, color: C.border })
    }

    this.page.drawText('Proveedor:', { x: fX, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(s(data.proveedor), { x: fX + 54, y: this.y - 14, size: 7, font: this.font, color: C.text })
    dotLine(fX + 54, x + CW * 0.62, this.y - 16)

    this.page.drawText('Tipo de Visita', { x: fX, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(s(data.tipoVisita), { x: fX + 64, y: this.y - 30, size: 7, font: this.font, color: C.text })
    dotLine(fX + 64, x + CW * 0.62, this.y - 32)

    // Logo Proveedor placeholder right
    this.page.drawText('Logo Proveedor', {
      x: x + CW - 62, y: this.y - 14, size: 6, font: this.font, color: C.textLight
    })

    // Red underline
    this.page.drawRectangle({ x, y: this.y - logoRowH - 1.5, width: CW, height: 1.5, color: C.red })
    this.y -= logoRowH + 4
  }

  // ── Mini header (pages 2+) ─────────────────────────────────────────────────
  _miniHeader(data) {
    const x = ML

    // Black bar
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.black })
    if (this.logo) {
      const d = this.logo.scale(0.06)
      this.page.drawImage(this.logo, { x: x + 4, y: this.y - 12, width: Math.min(d.width, 36), height: Math.min(d.height, 10) })
    }
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', {
      x: x + 44, y: this.y - 10, size: 6.5, font: this.fontBold, color: C.white
    })
    this.y -= 16

    // Red bar
    this.page.drawRectangle({ x, y: this.y - 10, width: CW, height: 10, color: C.red })
    this.page.drawText(this.reportTitle, {
      x: x + 6, y: this.y - 7.5, size: 5.5, font: this.fontBold, color: C.white
    })
    this.y -= 12

    // Site info row (ID + Nombre)
    if (data) {
      const siteH = 22
      this.page.drawRectangle({ x, y: this.y - siteH, width: CW, height: siteH, borderColor: C.border, borderWidth: 0.5 })
      const half = CW / 2

      this._cellLabel('ID Sitio:', x + 4, this.y - 8, 6.5)
      this._cellVal(s(data.idSitio), x + 50, this.y - 8, 6.5, half - 10)
      this.page.drawLine({ start: { x: x + half, y: this.y }, end: { x: x + half, y: this.y - siteH }, thickness: 0.4, color: C.border })
      this._cellLabel('Nombre Sitio:', x + half + 4, this.y - 8, 6.5)
      this._cellVal(s(data.nombreSitio), x + half + 60, this.y - 8, 6.5, half - 70)

      this._cellLabel('Fecha Inicio:', x + 4, this.y - 18, 6.5)
      this._cellVal(s(data.fechaInicio), x + 55, this.y - 18, 6.5, half - 60)
      this._cellLabel('Fecha Termino:', x + half + 4, this.y - 18, 6.5)
      this._cellVal(s(data.fechaTermino), x + half + 65, this.y - 18, 6.5, half - 70)

      this.y -= siteH + 2
    }
  }

  // ── Section subheaders ────────────────────────────────────────────────────
  darkSubheader(title) {
    const h = 14
    this.checkSpace(h + 4)
    this.page.drawRectangle({ x: ML, y: this.y - h, width: CW, height: h, color: C.black })
    this.page.drawText(s(title), { x: ML + 6, y: this.y - h + 4, size: 7, font: this.fontBold, color: C.white })
    this.y -= h + 2
  }

  redSubheader(title) {
    const h = 13
    this.checkSpace(h + 2)
    this.page.drawRectangle({ x: ML, y: this.y - h, width: CW, height: h, color: C.red })
    this.page.drawText(s(title), {
      x: ML + (CW - this.fontBold.widthOfTextAtSize(s(title), 7)) / 2,
      y: this.y - h + 3, size: 7, font: this.fontBold, color: C.white
    })
    this.y -= h + 1
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _cellLabel(text, x, y, size = 7) {
    this.page.drawText(s(text), { x, y, size, font: this.fontBold, color: C.text })
  }

  _cellVal(text, x, y, size = 7, maxW = 200) {
    let t = s(text)
    while (t.length > 1 && this.font.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -1)
    this.page.drawText(t, { x, y, size, font: this.font, color: C.text })
  }

  // ── Info block (Datos del Sitio, 2-col layout) ────────────────────────────
  drawSiteInfoBlock(data) {
    const rows = [
      ['ID Sitio:',       s(data.idSitio),      'Altura (Mts):',     s(data.alturaTorre)],
      ['Nombre Sitio:',   s(data.nombreSitio),   'Tipo Sitio:',       s(data.tipoSitio)],
      ['Fecha Inicio:',   s(data.fechaInicio),   'Tipo Estructura:',  s(data.tipoEstructura || data.tipoTorre)],
      ['Fecha Termino:',  s(data.fechaTermino),  'Latitud:',          s(data.latitud || data.coordenadas)],
      ['Direccion:',      s(data.direccion),     'Longitud:',         s(data.longitud)],
    ]
    const h = 13, half = CW / 2
    const LBL = 70, VAL_MAX = half - LBL - 6

    for (const [lbl1, val1, lbl2, val2] of rows) {
      this.checkSpace(h + 1)
      this.page.drawRectangle({ x: ML, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.4 })
      this._cellLabel(lbl1, ML + 4, this.y - h + 4)
      this._cellVal(val1, ML + LBL, this.y - h + 4, 7, VAL_MAX)
      this.page.drawLine({ start: { x: ML + half, y: this.y }, end: { x: ML + half, y: this.y - h }, thickness: 0.4, color: C.border })
      this._cellLabel(lbl2, ML + half + 4, this.y - h + 4)
      this._cellVal(val2, ML + half + LBL, this.y - h + 4, 7, VAL_MAX)
      this.y -= h
    }
    this.y -= 4
  }

  // ── Torre table ────────────────────────────────────────────────────────────
  drawTorreTable(items) {
    // Header row (red with white text)
    const cols = [
      { label: 'Altura\n(m)',   w: 46 },
      { label: 'Orientacion',   w: 65 },
      { label: 'Tipo de Antena\ny/o Equipo', w: 90 },
      { label: 'Numero de\nAntenas y/o\nEquipo', w: 68 },
      { label: 'Alto',          w: 38 },
      { label: 'Ancho',         w: 38 },
      { label: 'Profundidad',   w: 52 },
      { label: 'Area M2',       w: 48 },
      { label: 'Carrier',       w: 48 },
      { label: 'Comentario',    w: CW - 46 - 65 - 90 - 68 - 38 - 38 - 52 - 48 - 48 },
    ]

    // "Dimensiones en metros" spanning header
    const dimStartCol = 4  // Alto
    const dimEndCol   = 6  // Profundidad
    let dimX = ML; for (let i = 0; i < dimStartCol; i++) dimX += cols[i].w
    let dimW = 0; for (let i = dimStartCol; i <= dimEndCol; i++) dimW += cols[i].w

    const hdrH1 = 11  // dim subheader height
    const hdrH2 = 24  // column label height

    this.checkSpace(hdrH1 + hdrH2 + 4)

    // Row 1 — "Dimensiones en metros" spanning over dim cols
    this.page.drawRectangle({ x: ML, y: this.y - hdrH1, width: CW, height: hdrH1, color: C.red })
    this.page.drawText('Dimensiones en metros', {
      x: dimX + (dimW - this.fontBold.widthOfTextAtSize('Dimensiones en metros', 5.5)) / 2,
      y: this.y - hdrH1 + 3, size: 5.5, font: this.fontBold, color: C.white
    })
    this.y -= hdrH1

    // Row 2 — Column labels
    this.page.drawRectangle({ x: ML, y: this.y - hdrH2, width: CW, height: hdrH2, color: C.red })
    let cx = ML
    for (const col of cols) {
      const lines = col.label.split('\n')
      const lineH = 7
      const startY = this.y - hdrH2 + (hdrH2 - lines.length * lineH) / 2 + lineH * (lines.length - 1)
      lines.forEach((line, li) => {
        const tw = this.fontBold.widthOfTextAtSize(line, 5.5)
        this.page.drawText(line, {
          x: cx + (col.w - tw) / 2, y: startY - li * lineH,
          size: 5.5, font: this.fontBold, color: C.white
        })
      })
      cx += col.w
    }
    this.y -= hdrH2

    // Data rows
    const rowH = 16
    const list = items && items.length ? items : []
    const areaFn = (alto, ancho) => {
      const a = parseFloat(alto), b = parseFloat(ancho)
      return Number.isFinite(a) && Number.isFinite(b) ? (a * b).toFixed(4) : ''
    }

    for (const row of list) {
      this.checkSpace(rowH)
      const rowValues = [
        s(row.alturaMts), s(row.orientacion), s(row.tipoEquipo), s(row.cantidad),
        s(row.alto), s(row.ancho), s(row.profundidad),
        areaFn(row.alto, row.ancho),
        s(row.carrier), s(row.comentario),
      ]
      this.page.drawRectangle({ x: ML, y: this.y - rowH, width: CW, height: rowH, borderColor: C.border, borderWidth: 0.3 })
      let rx = ML
      rowValues.forEach((val, vi) => {
        const colW = cols[vi].w
        if (vi > 0) this.page.drawLine({ start: { x: rx, y: this.y }, end: { x: rx, y: this.y - rowH }, thickness: 0.3, color: C.border })
        let t = val
        while (t.length > 1 && this.font.widthOfTextAtSize(t, 6) > colW - 4) t = t.slice(0, -1)
        this.page.drawText(t, { x: rx + 3, y: this.y - rowH + 5, size: 6, font: this.font, color: C.text })
        rx += colW
      })
      this.y -= rowH
    }

  }

  // ── Site info block estilo piso (líneas subrayadas, 2 columnas) ──────────
  drawSiteInfoBlockPiso(data) {
    // Layout: izq col (ID, Nombre, Fecha Inicio, Fecha Termino, Dirección)
    //         der col (Altura, Tipo Sitio, Tipo Estructura, Latitud, Longitud)
    const rows = [
      ['ID Sitio:',      s(data.idSitio),      'Altura (Mts):',    s(data.alturaTorre)],
      ['Nombre Sitio:',  s(data.nombreSitio),  'Tipo Sitio:',      s(data.tipoSitio)],
      ['Fecha Inicio:',  s(data.fechaInicio),  'Tipo Estructura:', s(data.tipoEstructura || data.tipoTorre)],
      ['Fecha Termino:', s(data.fechaTermino), 'Latitud:',         s(data.latitud || data.coordenadas)],
      ['Dirección:',     s(data.direccion),    'Longitud:',        s(data.longitud)],
    ]
    const rh = 14, half = CW / 2
    const LBL_W = 72, UNDERLINE_Y_OFF = 2

    for (const [l1, v1, l2, v2] of rows) {
      this.checkSpace(rh)
      const y = this.y
      // Left col label
      this.page.drawText(l1, { x: ML, y: y - rh + 5, size: 6.5, font: this.fontBold, color: C.text })
      // Left col value + underline
      this.page.drawText(v1, { x: ML + LBL_W, y: y - rh + 5, size: 7, font: this.font, color: C.text })
      this.page.drawLine({ start: { x: ML + LBL_W, y: y - rh + UNDERLINE_Y_OFF }, end: { x: ML + half - 4, y: y - rh + UNDERLINE_Y_OFF }, thickness: 0.4, color: C.border })
      // Right col label
      this.page.drawText(l2, { x: ML + half + 4, y: y - rh + 5, size: 6.5, font: this.fontBold, color: C.text })
      // Right col value + underline
      this.page.drawText(v2, { x: ML + half + 4 + 80, y: y - rh + 5, size: 7, font: this.font, color: C.text })
      this.page.drawLine({ start: { x: ML + half + 4 + 80, y: y - rh + UNDERLINE_Y_OFF }, end: { x: ML + CW, y: y - rh + UNDERLINE_Y_OFF }, thickness: 0.4, color: C.border })
      this.y -= rh
    }
    this.y -= 4
  }

  // ── Draw a single client card ─────────────────────────────────────────────
  // cliente: object with data, OR null → draws empty card skeleton
  // tipo: 'CLIENTE ANCLA:' | 'CLIENTE COLO:' (always explicit, even for empty)
  // minGabRows: shared across pair so both cards are the same height
  _drawClientCard(cliente, tipo, x, cardW, startY, minGabRows = 3) {
    const HDR_H     = 13
    const ROW_H     = 11
    const GAB_H     = 12
    const GAB_HDR_H = 13
    let y = startY

    const nombreCliente = cliente ? s(cliente.nombreCliente) : ''
    const areaArrendada = cliente ? s(cliente.areaArrendada) : ''
    const areaEnUso     = cliente ? s(cliente.areaEnUso)     : ''
    const gabs          = (cliente?.gabinetes?.length) ? cliente.gabinetes : []
    const totalRows     = Math.max(gabs.length, minGabRows)

    // Outer border — wraps the entire card (header + rows + gab table)
    const totalH = HDR_H + ROW_H * 2 + GAB_HDR_H + GAB_H * totalRows
    this.page.drawRectangle({ x, y: y - totalH, width: cardW, height: totalH, borderColor: C.border, borderWidth: 0.5 })

    // ── Header row (light background, dark text — like reference PDF) ─────────
    // Just a bottom border line, no fill
    this.page.drawLine({
      start: { x, y: y - HDR_H }, end: { x: x + cardW, y: y - HDR_H },
      thickness: 0.4, color: C.border,
    })
    this.page.drawText(tipo, { x: x + 4, y: y - HDR_H + 4, size: 6.5, font: this.fontBold, color: C.text })
    if (nombreCliente) {
      this.page.drawText(nombreCliente, { x: x + 78, y: y - HDR_H + 4, size: 6.5, font: this.fontBold, color: C.text })
    }
    y -= HDR_H

    // ── Info rows (AREA ARRENDADA, AREA EN USO) ───────────────────────────
    for (const [lbl, val] of [
      ['AREA ARRENDADA', areaArrendada],
      ['AREA EN USO',    areaEnUso],
    ]) {
      this.page.drawLine({
        start: { x, y: y - ROW_H }, end: { x: x + cardW, y: y - ROW_H },
        thickness: 0.3, color: C.border,
      })
      this.page.drawText(lbl, { x: x + 4, y: y - ROW_H + 3, size: 5.5, font: this.fontBold, color: C.text })
      if (val) {
        this.page.drawText(val, { x: x + 75, y: y - ROW_H + 3, size: 6, font: this.font, color: C.text })
      }
      y -= ROW_H
    }

    // ── Gabinetes table header ────────────────────────────────────────────
    const gabCols = [
      { label: 'GABINETE', w: cardW * 0.36 },
      { label: 'LARGO',    w: cardW * 0.15 },
      { label: 'ANCHO',    w: cardW * 0.15 },
      { label: 'ALTO',     w: cardW * 0.15 },
      { label: 'FOTO #',   w: cardW - cardW * 0.36 - cardW * 0.15 * 3 },
    ]
    this.page.drawRectangle({ x, y: y - GAB_HDR_H, width: cardW, height: GAB_HDR_H, color: C.black })
    let gx = x
    for (const gc of gabCols) {
      const tw = this.fontBold.widthOfTextAtSize(gc.label, 5)
      this.page.drawText(gc.label, {
        x: gx + (gc.w - tw) / 2, y: y - GAB_HDR_H + 4,
        size: 5, font: this.fontBold, color: C.white,
      })
      gx += gc.w
    }
    y -= GAB_HDR_H

    // ── Gabinete rows ─────────────────────────────────────────────────────
    for (let ri = 0; ri < totalRows; ri++) {
      const gab = gabs[ri] || {}
      this.page.drawLine({
        start: { x, y: y - GAB_H }, end: { x: x + cardW, y: y - GAB_H },
        thickness: 0.3, color: C.border,
      })
      let rx = x
      const vals = [s(gab.gabinete), s(gab.largo), s(gab.ancho), s(gab.alto), s(gab.fotoRef)]
      vals.forEach((val, vi) => {
        if (vi > 0) {
          this.page.drawLine({ start: { x: rx, y }, end: { x: rx, y: y - GAB_H }, thickness: 0.3, color: C.border })
        }
        let t = val
        while (t.length > 1 && this.font.widthOfTextAtSize(t, 5.5) > gabCols[vi].w - 3) t = t.slice(0, -1)
        if (t) this.page.drawText(t, { x: rx + 2, y: y - GAB_H + 3, size: 5.5, font: this.font, color: C.text })
        rx += gabCols[vi].w
      })
      y -= GAB_H
    }

    return startY - y  // total height consumed
  }

  // ── Height calculator (mirrors _drawClientCard) ───────────────────────────
  _clientCardHeight(cliente, cardW, minGabRows = 3) {
    const gabs = (cliente?.gabinetes?.length) ? cliente.gabinetes.length : 0
    return 13 + 11 * 2 + 13 + Math.max(gabs, minGabRows) * 12
  }

  // ── Draw floor clients — always 2-column static layout ────────────────────
  //
  //  Pairing rules (matches reference PDF):
  //    Row 1:  ancla[0]  | colo[0]
  //    Row 2:  colo[1]   | colo[2]   ← extra colos paired together
  //    ...
  //  If one side of a pair is absent, an EMPTY card skeleton is still drawn.
  //  Both cards in a row share the same height (max of their gabinete counts).
  //
  drawFloorClients(clientes) {
    const GAP   = 8
    const cardW = (CW - GAP) / 2

    const anclas = clientes.filter(c => c.tipoCliente === 'ancla')
    const colos  = clientes.filter(c => c.tipoCliente === 'colo')

    // Build pairs: [{ left: cliente|null, leftTipo, right: cliente|null, rightTipo }]
    const pairs = []

    if (anclas.length || colos.length) {
      const paired = Math.min(anclas.length, colos.length)
      // Phase 1: ancla + colo
      for (let i = 0; i < paired; i++) {
        pairs.push({ left: anclas[i], leftTipo: 'CLIENTE ANCLA:', right: colos[i], rightTipo: 'CLIENTE COLO:' })
      }
      // Phase 2: extra anclas → left with empty colo on right
      for (let i = paired; i < anclas.length; i++) {
        pairs.push({ left: anclas[i], leftTipo: 'CLIENTE ANCLA:', right: null, rightTipo: 'CLIENTE COLO:' })
      }
      // Phase 3: extra colos → paired together
      // Always at least one colo|colo row (static layout requirement)
      const extraColos = colos.slice(paired)
      if (extraColos.length === 0) {
        pairs.push({ left: null, leftTipo: 'CLIENTE COLO:', right: null, rightTipo: 'CLIENTE COLO:' })
      } else {
        for (let i = 0; i < extraColos.length; i += 2) {
          pairs.push({
            left:  extraColos[i],             leftTipo:  'CLIENTE COLO:',
            right: extraColos[i + 1] || null, rightTipo: 'CLIENTE COLO:',
          })
        }
      }
    } else {
      // Fallback: no tipoCliente set — pair sequentially, all as COLO
      for (let i = 0; i < clientes.length; i += 2) {
        pairs.push({
          left:  clientes[i]     || null, leftTipo:  'CLIENTE COLO:',
          right: clientes[i + 1] || null, rightTipo: 'CLIENTE COLO:',
        })
      }
    }

    for (const { left, leftTipo, right, rightTipo } of pairs) {
      // Shared minGabRows: max of both sides so cards are same height
      const leftGabs  = left  ? Math.max((left.gabinetes  || []).length, 3) : 3
      const rightGabs = right ? Math.max((right.gabinetes || []).length, 3) : 3
      const minRows   = Math.max(leftGabs, rightGabs)

      const estH = 13 + 11 * 2 + 13 + minRows * 12 + 10
      this.checkSpace(estH)

      const startY = this.y
      // Always draw both columns — null → empty skeleton
      this._drawClientCard(left,  leftTipo,  ML,               cardW, startY, minRows)
      this._drawClientCard(right, rightTipo, ML + cardW + GAP, cardW, startY, minRows)

      this.y -= 13 + 11 * 2 + 13 + minRows * 12 + 6
    }
  }

  // ── Generic photo row (used for carriers) ────────────────────────────────
  async drawPhotoRow(imgs, labels, photoH = 100) {
    if (!imgs || imgs.length === 0) return
    const count = Math.min(imgs.length, 3)
    const gap = 6
    const imgW = (CW - gap * (count - 1)) / count
    this.checkSpace(photoH + 20)
    let px = ML
    for (let i = 0; i < count; i++) {
      const img = imgs[i]
      const lbl = labels && labels[i] ? labels[i] : ''
      if (lbl) {
        this.page.drawText(s(lbl), { x: px, y: this.y - 9, size: 5.5, font: this.fontBold, color: C.text })
      }
      const imgY = this.y - (lbl ? 12 : 4) - photoH
      this.page.drawRectangle({ x: px, y: imgY, width: imgW, height: photoH, borderColor: C.border, borderWidth: 0.5 })
      if (img) {
        try {
          const scale = Math.min(imgW / img.width, photoH / img.height)
          const dw = img.width * scale, dh = img.height * scale
          this.page.drawImage(img, { x: px + (imgW - dw) / 2, y: imgY + (photoH - dh) / 2, width: dw, height: dh })
        } catch {}
      }
      px += imgW + gap
    }
    this.y -= (labels && labels.some(Boolean) ? 14 : 6) + photoH + 4
  }

  // ── Torre photos — cada sección llena su propia página ──────────────────
  //
  //  Página 2: "Distribución de equipos en torre"
  //    ┌──────────────────────┬──────────────────────┐
  //    │  imgDistribucion     │  imgTorre            │
  //    │  (slot izq, 50%)     │  (slot der, 50%)     │
  //    │                      │ ┌──────────────────┐ │
  //    │                      │ │Foto de Torre     │ │← barra roja
  //    │                      │ │Completa          │ │
  //    └──────────────────────┴──────────────────────┘
  //
  //  Página 3: "Croquis esquemático del edificio en corte"
  //    ┌──────────────────────────────────────────────┐
  //    │           imgCroquis — ancho completo        │
  //    └──────────────────────────────────────────────┘
  //
  async drawTorrePhotos(imgDistribucion, imgCroquis, imgTorre) {
    // PH=792, MT=36, MB=36, miniHeader≈52pts
    // Usable height after miniHeader = 792 - 36 - 36 - 52 = 668pts
    const MINI_H = 52   // altura del miniHeader (negro+rojo+siteRow)
    const LBL    = 11   // label de sección
    const GAP    = 8    // gap entre columnas
    const BAR_H  = 16   // barra roja
    const USABLE = PH - MT - MB - MINI_H  // ~668pts disponibles por página

    // ── helpers ─────────────────────────────────────────────────────────────
    const drawBox = (img, x, y, w, h) => {
      this.page.drawRectangle({ x, y, width: w, height: h, borderColor: C.border, borderWidth: 0.5 })
      if (img) {
        try {
          const sc = Math.min(w / img.width, h / img.height)
          const dw = img.width * sc, dh = img.height * sc
          this.page.drawImage(img, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh })
        } catch {}
      }
    }

    const drawBoxWithBar = (img, x, y, w, h, label) => {
      this.page.drawRectangle({ x, y, width: w, height: h, borderColor: C.border, borderWidth: 0.5 })
      const imgH = h - BAR_H
      if (img) {
        try {
          const sc = Math.min(w / img.width, imgH / img.height)
          const dw = img.width * sc, dh = img.height * sc
          this.page.drawImage(img, { x: x + (w - dw) / 2, y: y + BAR_H + (imgH - dh) / 2, width: dw, height: dh })
        } catch {}
      }
      this.page.drawRectangle({ x, y, width: w, height: BAR_H, color: C.red })
      const lw = this.fontBold.widthOfTextAtSize(s(label), 7)
      this.page.drawText(s(label), {
        x: x + Math.max(4, (w - lw) / 2),
        y: y + (BAR_H - 7) / 2 + 1,
        size: 7, font: this.fontBold, color: C.white
      })
    }

    // ── Página 2: Distribución de equipos en torre ────────────────────────
    // La página ya fue creada con miniHeader antes de llamar esta función.
    // Calculamos el alto disponible real desde this.y hasta MB
    {
      const H = this.y - MB - LBL - 2  // ocupa todo el espacio restante
      const W = (CW - GAP) / 2

      // Label
      this.page.drawText('Distribucion de equipos en torre', {
        x: ML, y: this.y - LBL + 3, size: 6.5, font: this.fontBold, color: C.text
      })
      const boxY = this.y - LBL - H

      // Slot izquierdo — fotoDistribucion (sin barra)
      drawBox(imgDistribucion, ML, boxY, W, H)
      // Slot derecho — fotoTorre con barra roja
      drawBoxWithBar(imgTorre, ML + W + GAP, boxY, W, H, 'Foto de Torre Completa')

      this.y = boxY  // actualizar posición (ya en fondo de página)
    }

    // ── Página 3: Croquis esquemático del edificio en corte ───────────────
    this._drawFooter()
    this.page = this.doc.addPage([PW, PH])
    this.pageNum++
    this.y = PH - MT
    this._miniHeader(this._headerData)

    {
      const H = this.y - MB - LBL - 2  // ocupa toda la página

      // Label
      this.page.drawText('Croquis esquematico del edificio en corte', {
        x: ML, y: this.y - LBL + 3, size: 6.5, font: this.fontBold, color: C.text
      })
      const boxY = this.y - LBL - H

      // Una sola foto — ancho completo
      drawBox(imgCroquis, ML, boxY, CW, H)

      this.y = boxY
    }
  }
}

// ── Main export function ───────────────────────────────────────────────────────
export async function generateEquipmentV2Pdf(submission, photoMap = {}) {
  const data     = submission?.payload?.payload?.data    || submission?.payload?.data    || {}
  const siteInfo = data.siteInfo || {}
  const torre    = data.torre    || {}
  const piso     = data.piso     || {}
  const fotos    = data.fotos    || {}
  const carriers = data.carriers || []

  // ── Resolve photos ────────────────────────────────────────────────────────
  // Normalize photoMap: accept both "equipmentV2:fieldName" and plain "fieldName" keys
  // Inspector writes asset_type as "equipmentV2:fotoDistribucionTorre", "carrier:N:fotoX"
  const normalizedPhotoMap = {}
  for (const [k, v] of Object.entries(photoMap || {})) {
    normalizedPhotoMap[k] = v  // keep original key (e.g. "carrier:0:foto1")
    // Also add short key for torre/piso fotos: strip "equipmentV2:" prefix
    if (k.startsWith('equipmentV2:')) {
      normalizedPhotoMap[k.replace('equipmentV2:', '')] = v
    }
  }

  // Merge: payload fotos (may have base64 or null) + normalized asset URLs
  const allPhotos = { ...fotos, ...normalizedPhotoMap }
  // Also flatten carrier photos from payload into allPhotos (fallback if no asset)
  carriers.forEach((c, ci) => {
    if (c.foto1 && !allPhotos[`carrier:${ci}:foto1`]) allPhotos[`carrier:${ci}:foto1`] = c.foto1
    if (c.foto2 && !allPhotos[`carrier:${ci}:foto2`]) allPhotos[`carrier:${ci}:foto2`] = c.foto2
    if (c.foto3 && !allPhotos[`carrier:${ci}:foto3`]) allPhotos[`carrier:${ci}:foto3`] = c.foto3
  })

  // ── PDF setup ──────────────────────────────────────────────────────────────
  const doc      = await PDFDocument.create()
  const font     = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  let logo = null
  try {
    const logoBytes = Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))
    logo = await doc.embedPng(logoBytes)
  } catch {}

  // Prefetch all images
  const imgCache = {}
  const prefetchKey = async (key) => {
    if (!key || imgCache[key] !== undefined) return
    const url = allPhotos[key]
    imgCache[key] = url ? await fetchImg(doc, url) : null
  }
  await Promise.all([
    prefetchKey('fotoDistribucionTorre'),
    prefetchKey('fotoTorreCompleta'),
    prefetchKey('fotoCroquisEdificio'),
    prefetchKey('fotoPlanoPlanta'),
    ...carriers.flatMap((_, ci) => [
      `carrier:${ci}:foto1`, `carrier:${ci}:foto2`, `carrier:${ci}:foto3`
    ].map(prefetchKey)),
  ])

  const p = new PageBuilder(doc, font, fontBold, logo)
  const siteHeaderData = {
    proveedor:      siteInfo.proveedor      || '',
    tipoVisita:     siteInfo.tipoVisita     || siteInfo.tipoSitio || '',
    idSitio:        siteInfo.idSitio        || '',
    nombreSitio:    siteInfo.nombreSitio    || '',
    fechaInicio:    siteInfo.fechaInicio    || siteInfo.fecha || '',
    fechaTermino:   siteInfo.fechaTermino   || '',
    alturaTorre:    siteInfo.alturaTorre    || siteInfo.altura || '',
    tipoSitio:      siteInfo.tipoSitio      || '',
    tipoEstructura: siteInfo.tipoEstructura || siteInfo.tipoTorre || '',
    latitud:        siteInfo.latitud        || '',
    longitud:       siteInfo.longitud       || '',
    direccion:      siteInfo.direccion      || '',
    coordenadas:    siteInfo.coordenadas    || '',
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Torre
  // ═══════════════════════════════════════════════════════════════════════════
  p.newPage()
  p.drawHeader(siteHeaderData)

  // ── Datos del sitio (info block) ─────────────────────────────────────────
  p.darkSubheader('INVENTARIO DE EQUIPOS EN TORRE')
  p.drawSiteInfoBlock(siteHeaderData)

  // ── Torre table ───────────────────────────────────────────────────────────
  p.redSubheader('INVENTARIO DE EQUIPOS')
  p.drawTorreTable(torre.items || [])

  // ── Fill remaining space on page 1 with empty rows until bottom margin ────
  // rowH=16 matches drawTorreTable row height; cols layout same as table
  {
    const ROW_H = 16
    const cols = [46, 65, 90, 68, 38, 38, 52, 48, 48, CW - 46 - 65 - 90 - 68 - 38 - 38 - 52 - 48 - 48]
    while (p.y - ROW_H >= MB + 2) {
      p.page.drawRectangle({ x: ML, y: p.y - ROW_H, width: CW, height: ROW_H, borderColor: C.border, borderWidth: 0.3 })
      let rx = ML
      for (let ci = 0; ci < cols.length; ci++) {
        if (ci > 0) p.page.drawLine({
          start: { x: rx, y: p.y }, end: { x: rx, y: p.y - ROW_H },
          thickness: 0.3, color: C.border
        })
        rx += cols[ci]
      }
      p.y -= ROW_H
    }
  }

  // ── Torre photos always start on page 2 ──────────────────────────────────
  p._drawFooter()
  p.page = doc.addPage([PW, PH])
  p.pageNum++
  p.y = PH - MT
  p._miniHeader(siteHeaderData)

  await p.drawTorrePhotos(
    imgCache['fotoDistribucionTorre'],
    imgCache['fotoCroquisEdificio'],
    imgCache['fotoTorreCompleta'],
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGES — Inventario en Piso (one logical section, paginated)
  // ═══════════════════════════════════════════════════════════════════════════
  const clientes = piso.clientes || []

  if (clientes.length > 0 || fotos.fotoPlanoPlanta) {
    // Always start piso on a new page
    p._drawFooter()
    p.page = doc.addPage([PW, PH])
    p.pageNum++
    p.y = PH - MT
    p._miniHeader(siteHeaderData)
    p.darkSubheader('INVENTARIO DE EQUIPOS EN PISO')
    p.drawSiteInfoBlockPiso({ ...siteHeaderData })

    p.drawFloorClients(clientes)

    // Plano de planta
    p.checkSpace(50)
    p.darkSubheader('HACER PLANO DE PLANTA Y EQUIPOS')
    const plano = imgCache['fotoPlanoPlanta']
    if (plano) {
      p.checkSpace(200)
      const maxH = Math.min(p.y - MB - 20, 180)
      const maxW = CW
      const scale = Math.min(maxW / plano.width, maxH / plano.height)
      const dw = plano.width * scale, dh = plano.height * scale
      p.page.drawRectangle({ x: ML, y: p.y - dh - 4, width: dw, height: dh, borderColor: C.border, borderWidth: 0.5 })
      p.page.drawImage(plano, { x: ML + (CW - dw) / 2, y: p.y - dh - 4, width: dw, height: dh })
      p.y -= dh + 10
    } else {
      p.checkSpace(160)
      p.page.drawRectangle({ x: ML, y: p.y - 160, width: CW, height: 160, borderColor: C.border, borderWidth: 0.5 })
      p.y -= 164
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGES — Carriers (continuous, all in sequence)
  // ═══════════════════════════════════════════════════════════════════════════
  if (carriers.length > 0) {
    p._drawFooter()
    p.page = doc.addPage([PW, PH])
    p.pageNum++
    p.y = PH - MT
    p._miniHeader(siteHeaderData)

    for (let ci = 0; ci < carriers.length; ci++) {
      const carrier = carriers[ci]
      const cName = s(carrier.nombre || `Carrier ${ci + 1}`)

      p.checkSpace(30)
      // Carrier name header
      const ch = 16
      p.page.drawRectangle({ x: ML, y: p.y - ch, width: CW, height: ch, color: C.darkGray })
      p.page.drawText(`Carrier: ${cName}`, {
        x: ML + 6, y: p.y - ch + 5, size: 8, font: fontBold, color: C.white
      })
      p.y -= ch + 2

      // Torre table filtered for this carrier
      p.drawTorreTable(carrier.items || [])

      // Carrier/Comentario summary table (from last column of items)
      const hasComments = (carrier.items || []).some(it => it.comentario)
      if (hasComments) {
        const ccols = [{ label: 'Carrier', w: 100 }, { label: 'Comentario', w: CW - 100 }]
        const ccH = 14
        p.checkSpace(ccH + (carrier.items || []).length * 14 + 10)

        // Header
        p.page.drawRectangle({ x: ML, y: p.y - ccH, width: CW, height: ccH, color: C.red })
        p.page.drawText('Carrier', {
          x: ML + (100 - fontBold.widthOfTextAtSize('Carrier', 6)) / 2,
          y: p.y - ccH + 4, size: 6, font: fontBold, color: C.white
        })
        p.page.drawText('Comentario', {
          x: ML + 100 + 4, y: p.y - ccH + 4, size: 6, font: fontBold, color: C.white
        })
        p.y -= ccH

        for (const row of (carrier.items || [])) {
          if (!row.carrier && !row.comentario) continue
          const rh = 13
          p.checkSpace(rh)
          p.page.drawRectangle({ x: ML, y: p.y - rh, width: CW, height: rh, borderColor: C.border, borderWidth: 0.3 })
          p.page.drawLine({ start: { x: ML + 100, y: p.y }, end: { x: ML + 100, y: p.y - rh }, thickness: 0.3, color: C.border })
          p._cellVal(row.carrier || cName, ML + 3, p.y - rh + 4, 6, 94)
          p._cellVal(row.comentario, ML + 104, p.y - rh + 4, 6, CW - 108)
          p.y -= rh
        }
        p.y -= 4
      }

      // Photos
      const c1 = imgCache[`carrier:${ci}:foto1`]
      const c2 = imgCache[`carrier:${ci}:foto2`]
      const c3 = imgCache[`carrier:${ci}:foto3`]
      if (c1 || c2 || c3) {
        await p.drawPhotoRow([c1, c2, c3], [`Foto 1 — ${cName}`, `Foto 2 — ${cName}`, `Foto 3 — ${cName}`], 100)
      }

      p.y -= 6
    }
  }

  // ── Finalize ──────────────────────────────────────────────────────────────
  p._drawFooter()
  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
