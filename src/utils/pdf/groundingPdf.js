/**
 * PTI TeleInspect - Grounding System Test PDF Report
 * Replicates the Excel "4_Grounding_System_Test.xlsx" layout:
 *   - Header with PTI logo
 *   - Site information
 *   - Ground conditions
 *   - Measurement table (7 points)
 *   - Equipment info
 *   - Summation & Rg average
 *   - Photo evidence sections (9 photo slots)
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'

const C = {
  black: rgb(0.1, 0.1, 0.1),
  red: rgb(0.9, 0, 0),
  white: rgb(1, 1, 1),
  dark: rgb(0.18, 0.18, 0.18),
  gray: rgb(0.95, 0.95, 0.95),
  border: rgb(0.8, 0.8, 0.8),
  text: rgb(0.15, 0.15, 0.15),
  textLight: rgb(0.4, 0.4, 0.4),
  accent: rgb(0.2, 0.5, 0.8),
  warnBg: rgb(1, 0.97, 0.88),
  warn: rgb(0.85, 0.55, 0.05),
}

const PW = 612, PH = 792, ML = 36, MR = 36, MT = 36, MB = 36
const CW = PW - ML - MR

const MEASUREMENT_POINTS = [
  { id: 'rPataTorre', label: 'Pata de la torre', photoId: 'fotoPataTorre' },
  { id: 'rCerramiento', label: 'Cerramiento', photoId: 'fotoCerramiento' },
  { id: 'rPorton', label: 'Portón', photoId: 'fotoPorton' },
  { id: 'rPararrayos', label: 'Pararrayos', photoId: 'fotoPararrayos' },
  { id: 'rBarraSPT', label: 'Barra SPT', photoId: 'fotoBarraSPT' },
  { id: 'rEscalerilla1', label: 'Escalerilla #1', photoId: 'fotoEscalerilla1' },
  { id: 'rEscalerilla2', label: 'Escalerilla #2', photoId: 'fotoEscalerilla2' },
]

class GroundingPDF {
  constructor() {
    this.doc = null; this.page = null; this.font = null; this.fontBold = null
    this.logo = null; this.y = 0; this.pageNum = 0
  }

  async init() {
    this.doc = await PDFDocument.create()
    this.font = await this.doc.embedFont(StandardFonts.Helvetica)
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold)
    try {
      const logoBytes = Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))
      this.logo = await this.doc.embedPng(logoBytes)
    } catch (e) { this.logo = null }
  }

  newPage() {
    if (this.page) this._footer()
    this.page = this.doc.addPage([PW, PH])
    this.pageNum++
    this.y = PH - MT
  }

  checkSpace(needed) {
    if (this.y - needed < MB) {
      this._footer()
      this.page = this.doc.addPage([PW, PH])
      this.pageNum++
      this.y = PH - MT
      this._miniHeader()
    }
  }

  _footer() {
    this.page.drawText('Phoenix Tower International — Reporte de Sistema de Tierras', { x: ML, y: 16, size: 5.5, font: this.font, color: C.textLight })
    this.page.drawText(`Página ${this.pageNum}`, { x: PW - MR - this.font.widthOfTextAtSize(`Página ${this.pageNum}`, 5.5), y: 16, size: 5.5, font: this.font, color: C.textLight })
  }

  // ── HEADER with logo ──────────────────────────────────────────
  drawHeader(data) {
    const x = ML
    // Black bar
    this.page.drawRectangle({ x, y: this.y - 18, width: CW, height: 18, color: C.black })
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', { x: x + 6, y: this.y - 13, size: 9, font: this.fontBold, color: C.white })
    this.y -= 20

    // Red bar
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.red })
    this.page.drawText('REPORTE DE SISTEMA DE TIERRAS', { x: x + 6, y: this.y - 11, size: 7, font: this.fontBold, color: C.white })
    this.y -= 16

    // Logo row
    const logoRowH = 42
    this.page.drawRectangle({ x, y: this.y - logoRowH, width: CW, height: logoRowH, borderColor: C.border, borderWidth: 0.5 })
    if (this.logo) {
      const ld = this.logo.scale(0.18)
      this.page.drawImage(this.logo, { x: x + 6, y: this.y - logoRowH + (logoRowH - Math.min(ld.height, 36)) / 2, width: Math.min(ld.width, 110), height: Math.min(ld.height, 36) })
    }
    const fx = x + 130
    this.page.drawText('Proveedor:', { x: fx, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.proveedor || '', { x: fx + 55, y: this.y - 14, size: 7, font: this.font, color: C.text })
    this.page.drawText('Tipo de Visita:', { x: fx, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.tipoVisita || '', { x: fx + 65, y: this.y - 30, size: 7, font: this.font, color: C.text })
    this.page.drawText('Logo Proveedor', { x: x + CW - 60, y: this.y - 14, size: 6, font: this.font, color: C.textLight })
    this.page.drawRectangle({ x, y: this.y - logoRowH - 1.5, width: CW, height: 1.5, color: C.red })
    this.y -= logoRowH + 4
  }

  _miniHeader() {
    const x = ML
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.black })
    if (this.logo) { const ld = this.logo.scale(0.06); this.page.drawImage(this.logo, { x: x + 4, y: this.y - 12, width: Math.min(ld.width, 36), height: Math.min(ld.height, 10) }) }
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', { x: x + (this.logo ? 44 : 6), y: this.y - 10, size: 6.5, font: this.fontBold, color: C.white })
    this.y -= 16
    this.page.drawRectangle({ x, y: this.y - 9, width: CW, height: 9, color: C.red })
    this.page.drawText('REPORTE DE SISTEMA DE TIERRAS', { x: x + 6, y: this.y - 7, size: 5.5, font: this.fontBold, color: C.white })
    this.y -= 12
  }

  // ── Drawing helpers ───────────────────────────────────────────
  sectionTitle(title) {
    this.checkSpace(18)
    this.page.drawRectangle({ x: ML, y: this.y - 15, width: CW, height: 15, color: C.black })
    this.page.drawText(title.toUpperCase(), { x: ML + 6, y: this.y - 11, size: 7.5, font: this.fontBold, color: C.white })
    this.y -= 17
  }

  fieldRow(label, value, label2, value2) {
    this.checkSpace(14)
    const x = ML, h = 13
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })
    if (label2) {
      const half = CW / 2
      this.page.drawLine({ start: { x: x + half, y: this.y }, end: { x: x + half, y: this.y - h }, thickness: 0.5, color: C.border })
      this.page.drawText(label, { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
      this.page.drawText(String(value || ''), { x: x + 4 + this.fontBold.widthOfTextAtSize(label, 6.5) + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
      this.page.drawText(label2, { x: x + half + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
      this.page.drawText(String(value2 || ''), { x: x + half + 4 + this.fontBold.widthOfTextAtSize(label2, 6.5) + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    } else {
      const lw = CW * 0.4
      this.page.drawLine({ start: { x: x + lw, y: this.y }, end: { x: x + lw, y: this.y - h }, thickness: 0.5, color: C.border })
      this.page.drawText(label, { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
      this.page.drawText(String(value || ''), { x: x + lw + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    }
    this.y -= h
  }

  textBlock(label, value) {
    this.checkSpace(30)
    const x = ML
    this.page.drawRectangle({ x, y: this.y - 12, width: CW, height: 12, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText(label, { x: x + 4, y: this.y - 9, size: 6.5, font: this.fontBold, color: C.text })
    this.y -= 12
    const boxH = 20
    this.page.drawRectangle({ x, y: this.y - boxH, width: CW, height: boxH, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText(String(value || '—').slice(0, 200), { x: x + 6, y: this.y - 10, size: 6.5, font: this.font, color: C.text })
    this.y -= boxH
  }

  // ── Measurement table ─────────────────────────────────────────
  measurementTable(data) {
    this.checkSpace(16)
    // Table header
    const x = ML, h = 14
    const cols = [30, 140, 80, CW - 250] // dist, electrode, resistance, obs
    const colX = [x, x + cols[0], x + cols[0] + cols[1], x + cols[0] + cols[1] + cols[2]]

    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, color: C.dark })
    const headers = ['Dist. (m)', 'Electrodo de Potencial', 'Rg [Ohm]', 'Observaciones']
    headers.forEach((txt, i) => {
      this.page.drawText(txt, { x: colX[i] + 4, y: this.y - h + 4, size: 6, font: this.fontBold, color: C.white })
    })
    this.y -= h

    // Distance value
    const dist = data.distanciaElectrodoCorriente || '50.0'

    // Rows
    MEASUREMENT_POINTS.forEach((pt, i) => {
      this.checkSpace(14)
      const rh = 13
      this.page.drawRectangle({ x, y: this.y - rh, width: CW, height: rh, borderColor: C.border, borderWidth: 0.5 })
      // Vertical lines
      colX.forEach(cx => { if (cx > x) this.page.drawLine({ start: { x: cx, y: this.y }, end: { x: cx, y: this.y - rh }, thickness: 0.5, color: C.border }) })

      // Distance (only first row)
      if (i === 0) this.page.drawText(String(dist), { x: x + 4, y: this.y - rh + 4, size: 6.5, font: this.font, color: C.text })
      // Electrode name
      this.page.drawText(pt.label, { x: colX[1] + 4, y: this.y - rh + 4, size: 6.5, font: this.font, color: C.text })
      // Resistance value
      const val = data[pt.id] || '0.00'
      const numVal = parseFloat(val) || 0
      const valColor = numVal > 10 ? C.warn : numVal > 5 ? C.accent : C.text
      if (numVal > 10) {
        this.page.drawRectangle({ x: colX[2] + 0.5, y: this.y - rh + 0.5, width: cols[2] - 1, height: rh - 1, color: C.warnBg })
      }
      this.page.drawText(String(val), { x: colX[2] + 4, y: this.y - rh + 4, size: 7, font: this.fontBold, color: valColor })
      this.y -= rh
    })

    // Summation row
    this.checkSpace(16)
    const sumH = 14
    const values = MEASUREMENT_POINTS.map(pt => parseFloat(data[pt.id]) || 0)
    const sum = values.reduce((a, b) => a + b, 0)
    const rg = values.length > 0 ? sum / values.length : 0

    this.page.drawRectangle({ x, y: this.y - sumH, width: CW, height: sumH, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText('SUMATORIA DE RESISTENCIA OBTENIDA:', { x: x + 4, y: this.y - sumH + 4, size: 6.5, font: this.fontBold, color: C.text })
    this.page.drawText(sum.toFixed(2) + ' Ohm', { x: colX[2] + 4, y: this.y - sumH + 4, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(`Rg = ${rg.toFixed(2)} [Ohm]`, { x: colX[2] + 60, y: this.y - sumH + 4, size: 7, font: this.fontBold, color: rg > 10 ? C.warn : C.text })
    this.y -= sumH

    // Warning note
    if (rg > 10) {
      this.checkSpace(16)
      this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.warnBg, borderColor: C.warn, borderWidth: 0.5 })
      this.page.drawText('[!] SI EL VALOR ES MAYOR A 10 Ohm, SE DEBE REALIZAR DISENO DE MEJORA DEL SPT (METODO WENNER)', { x: x + 6, y: this.y - 10, size: 6, font: this.fontBold, color: C.warn })
      this.y -= 16
    }
  }

  // ── Photo evidence placeholder ─────────────────────────────
  photoSection(label, photoUrl) {
    this.checkSpace(90)
    const x = ML, w = CW / 2 - 4
    // This draws a single photo placeholder
    this.page.drawRectangle({ x, y: this.y - 12, width: CW, height: 12, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText(label, { x: x + 4, y: this.y - 9, size: 6, font: this.fontBold, color: C.text })
    this.y -= 12

    const boxH = 70
    this.page.drawRectangle({ x, y: this.y - boxH, width: CW, height: boxH, borderColor: C.border, borderWidth: 0.5 })
    if (photoUrl) {
      this.page.drawText('[Foto disponible en la aplicación]', { x: x + CW / 2 - 60, y: this.y - boxH / 2, size: 6, font: this.font, color: C.accent })
    } else {
      this.page.drawText('[Sin foto]', { x: x + CW / 2 - 15, y: this.y - boxH / 2, size: 6, font: this.font, color: C.textLight })
    }
    this.y -= boxH
  }
}


// ══════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════
export async function generateGroundingPdf(submission) {
  const p = new GroundingPDF()
  await p.init()

  const payload = submission?.payload || submission || {}
  const inner = payload?.payload || payload
  const data = inner?.data || inner || {}
  const meta = inner?.meta || {}

  // Grounding stores data in sections: datos, condiciones, equipo, medicion, evidencia
  // But it might also be flat in formData
  const sections = data || {}
  const datos = sections.datos || sections.formData || data
  const condiciones = sections.condiciones || {}
  const equipo = sections.equipo || {}
  const medicion = sections.medicion || {}
  const evidencia = sections.evidencia || {}

  const v = (key) => {
    for (const src of [datos, condiciones, equipo, medicion, evidencia, data]) {
      if (src && typeof src === 'object' && src[key] && src[key] !== '__photo__' && src[key] !== '__photo_uploaded__') return String(src[key])
    }
    return ''
  }

  // ── PAGE 1: Site Info + Measurements ───────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita') })

  p.sectionTitle('Información del Sitio')
  p.fieldRow('ID Sitio:', v('idSitio'), 'Altura (Mts):', v('alturaMts'))
  p.fieldRow('Nombre Sitio:', v('nombreSitio'), 'Tipo Sitio:', v('tipoSitio'))
  p.fieldRow('Fecha Inicio:', meta.startedAt || v('startedAt') || '', 'Tipo Estructura:', v('tipoEstructura'))
  p.fieldRow('Fecha Término:', meta.endedAt || v('endedAt') || '', 'Latitud:', meta.lat || v('lat') || '')
  p.fieldRow('Dirección:', v('direccion'), 'Longitud:', meta.lng || v('lng') || '')

  p.y -= 4
  p.sectionTitle('Condiciones para las Pruebas y Medición del SPT')
  p.fieldRow('Estado del Terreno:', v('estadoTerreno'), 'Tipo de Terreno:', v('tipoTerreno'))
  p.fieldRow('Último Día de Lluvia:', v('ultimoDiaLluvia'), 'Hora:', v('hora'))
  if (v('notaMetodo')) {
    p.textBlock('Nota de Método:', v('notaMetodo'))
  }

  p.y -= 4
  p.sectionTitle('Equipo de Medida')
  p.fieldRow('Marca:', v('equipoMarca'), 'Serial:', v('equipoSerial'))
  p.fieldRow('Modelo:', v('equipoModelo'), 'Fecha Calibración:', v('equipoCalibracion'))

  p.y -= 4
  p.sectionTitle('Mediciones de Resistencia')
  p.measurementTable({
    distanciaElectrodoCorriente: v('distanciaElectrodoCorriente'),
    rPataTorre: v('rPataTorre'),
    rCerramiento: v('rCerramiento'),
    rPorton: v('rPorton'),
    rPararrayos: v('rPararrayos'),
    rBarraSPT: v('rBarraSPT'),
    rEscalerilla1: v('rEscalerilla1'),
    rEscalerilla2: v('rEscalerilla2'),
  })

  if (v('observaciones')) {
    p.textBlock('Observaciones:', v('observaciones'))
  }

  p._footer()

  // ── PAGE 2: Photo Evidence ─────────────────────────────────
  p.newPage()
  p._miniHeader()
  p.sectionTitle('Evidencia Fotográfica')

  // Photo sections matching Excel layout
  const photoSections = [
    { label: 'FOTO CONEXIÓN TELURÓMETRO AL SISTEMA DE TIERRA', photoId: null },
    { label: 'FOTO CONEXIÓN DEL ELECTRODO DE CORRIENTE', photoId: null },
    ...MEASUREMENT_POINTS.map((pt, i) => ({
      label: `MEDICIÓN ${i + 1} — ${pt.label}`,
      photoId: pt.photoId,
    })),
  ]

  for (const ps of photoSections) {
    const hasPhoto = ps.photoId && (evidencia[ps.photoId] || v(ps.photoId))
    p.photoSection(ps.label, hasPhoto)
  }

  p._footer()
  return await p.doc.save()
}

export async function downloadGroundingPdf(submission) {
  const bytes = await generateGroundingPdf(submission)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const datos = d.datos || d.formData || d
  const filename = `puesta_tierra_${datos.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
