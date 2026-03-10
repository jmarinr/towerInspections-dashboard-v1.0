/**
 * PTI TeleInspect - Preventive Maintenance PDF Report
 * Replicates the Excel layout exactly:
 *   Sheet 1: Información General
 *   Sheet 2: Inf. Estructura Principal
 *   Sheet 3: Inspección Del Sitio (sections 1-5 + Vandalismo)
 *   Sheet 4: Inspección de la Torre (sections 6-11)
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'

// ── Colors matching the Excel ────────────────────────────────────
const C = {
  black: rgb(0.1, 0.1, 0.1),
  red: rgb(0.9, 0, 0),       // #E60000
  white: rgb(1, 1, 1),
  dark: rgb(0.18, 0.18, 0.18),
  gray: rgb(0.95, 0.95, 0.95),
  border: rgb(0.8, 0.8, 0.8),
  text: rgb(0.15, 0.15, 0.15),
  textLight: rgb(0.4, 0.4, 0.4),
  good: rgb(0.15, 0.68, 0.38),
  goodBg: rgb(0.91, 0.96, 0.91),
  regular: rgb(0.95, 0.61, 0.07),
  regularBg: rgb(1, 0.97, 0.88),
  bad: rgb(0.91, 0.3, 0.24),
  badBg: rgb(0.99, 0.89, 0.93),
  naBg: rgb(0.96, 0.96, 0.96),
  naText: rgb(0.6, 0.6, 0.6),
}

const PW = 612    // letter width
const PH = 792    // letter height
const ML = 36     // margin left
const MR = 36
const MT = 36
const MB = 36
const CW = PW - ML - MR  // content width

class MaintenancePDF {
  constructor() {
    this.doc = null
    this.page = null
    this.font = null
    this.fontBold = null
    this.y = 0
    this.pageNum = 0
  }

  async init() {
    this.doc = await PDFDocument.create()
    this.font = await this.doc.embedFont(StandardFonts.Helvetica)
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold)
    // Embed PTI logo
    try {
      const logoBytes = Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))
      this.logo = await this.doc.embedPng(logoBytes)
    } catch (e) {
      console.warn('Could not embed logo:', e)
      this.logo = null
    }
  }

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
      this._miniHeader()
    }
  }

  _drawFooter() {
    this.page.drawText(`Phoenix Tower International — Reporte de Mantenimiento Preventivo`, {
      x: ML, y: 16, size: 5.5, font: this.font, color: C.textLight
    })
    this.page.drawText(`Página ${this.pageNum}`, {
      x: PW - MR - this.font.widthOfTextAtSize(`Página ${this.pageNum}`, 5.5),
      y: 16, size: 5.5, font: this.font, color: C.textLight
    })
  }

  // ── Header (top of each logical section) ──────────────────────
  drawHeader(data) {
    const x = ML
    // Black bar
    this.page.drawRectangle({ x, y: this.y - 18, width: CW, height: 18, color: C.black })
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', {
      x: x + 6, y: this.y - 13, size: 9, font: this.fontBold, color: C.white
    })
    this.y -= 20

    // Red bar
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.red })
    this.page.drawText('REPORTE DE INSPECCIÓN DE MANTENIMIENTO PREVENTIVO', {
      x: x + 6, y: this.y - 11, size: 7, font: this.fontBold, color: C.white
    })
    this.y -= 16

    // Logo + Provider/ID row (matching Excel: logo left, fields center, "Logo Proveedor" right)
    const logoRowH = 42
    this.page.drawRectangle({ x, y: this.y - logoRowH, width: CW, height: logoRowH, borderColor: C.border, borderWidth: 0.5 })

    // Draw PTI logo on the left
    if (this.logo) {
      const logoDims = this.logo.scale(0.18)
      const logoW = Math.min(logoDims.width, 110)
      const logoH = Math.min(logoDims.height, 36)
      this.page.drawImage(this.logo, {
        x: x + 6,
        y: this.y - logoRowH + (logoRowH - logoH) / 2,
        width: logoW,
        height: logoH,
      })
    }

    // Provider and Visit Type fields (centered area)
    const fieldX = x + 130
    this.page.drawText('Proveedor:', { x: fieldX, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.proveedor || '', { x: fieldX + 55, y: this.y - 14, size: 7, font: this.font, color: C.text })
    
    // Dotted line after proveedor
    const dotY = this.y - 16
    for (let dx = fieldX + 55; dx < x + CW * 0.65; dx += 3) {
      this.page.drawText('.', { x: dx, y: dotY, size: 5, font: this.font, color: C.border })
    }

    this.page.drawText('Tipo de Visita:', { x: fieldX, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.tipoVisita || '', { x: fieldX + 65, y: this.y - 30, size: 7, font: this.font, color: C.text })

    // Dotted line after tipo visita
    const dotY2 = this.y - 32
    for (let dx = fieldX + 65; dx < x + CW * 0.65; dx += 3) {
      this.page.drawText('.', { x: dx, y: dotY2, size: 5, font: this.font, color: C.border })
    }

    // ID Sitio and Nombre on the right side
    const rightX = x + CW * 0.65
    this.page.drawText('ID Sitio:', { x: rightX, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.idSitio || '', { x: rightX + 40, y: this.y - 14, size: 7, font: this.font, color: C.text })
    this.page.drawText('Nombre Sitio:', { x: rightX, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
    this.page.drawText(data.nombreSitio || '', { x: rightX + 60, y: this.y - 30, size: 7, font: this.font, color: C.text })

    // "Logo Proveedor" text on far right
    this.page.drawText('Logo Proveedor', { x: x + CW - 60, y: this.y - 14, size: 6, font: this.font, color: C.textLight })

    // ID Sitio and Nombre Sitio (only shown on pages 2+)
    if (data.idSitio || data.nombreSitio) {
      const rightX = x + CW * 0.65
      this.page.drawText('ID Sitio', { x: rightX, y: this.y - 14, size: 6.5, font: this.fontBold, color: C.text })
      this.page.drawText(data.idSitio || '', { x: rightX + 38, y: this.y - 14, size: 7, font: this.fontBold, color: C.text })
      // Underline
      this.page.drawLine({ start: { x: rightX + 38, y: this.y - 17 }, end: { x: x + CW - 65, y: this.y - 17 }, thickness: 0.4, color: C.border })
      this.page.drawText('Nombre Sitio', { x: rightX, y: this.y - 30, size: 6.5, font: this.fontBold, color: C.text })
      this.page.drawText(data.nombreSitio || '', { x: rightX + 55, y: this.y - 30, size: 7, font: this.fontBold, color: C.text })
      this.page.drawLine({ start: { x: rightX + 55, y: this.y - 32 }, end: { x: x + CW - 65, y: this.y - 32 }, thickness: 0.4, color: C.border })
    }

    // Red line under the row
    this.page.drawRectangle({ x, y: this.y - logoRowH - 1.5, width: CW, height: 1.5, color: C.red })

    this.y -= logoRowH + 4
  }

  _miniHeader() {
    const x = ML
    // Black bar with logo
    this.page.drawRectangle({ x, y: this.y - 14, width: CW, height: 14, color: C.black })
    if (this.logo) {
      const ld = this.logo.scale(0.06)
      this.page.drawImage(this.logo, { x: x + 4, y: this.y - 12, width: Math.min(ld.width, 36), height: Math.min(ld.height, 10) })
    }
    this.page.drawText('PHOENIX TOWER INTERNATIONAL', {
      x: x + (this.logo ? 44 : 6), y: this.y - 10, size: 6.5, font: this.fontBold, color: C.white
    })
    this.y -= 16
    this.page.drawRectangle({ x, y: this.y - 9, width: CW, height: 9, color: C.red })
    this.page.drawText('REPORTE DE INSPECCIÓN DE MANTENIMIENTO PREVENTIVO', {
      x: x + 6, y: this.y - 7, size: 5.5, font: this.fontBold, color: C.white
    })
    this.y -= 12
  }

  // ── Drawing helpers ───────────────────────────────────────────
  _labelValueRow(label1, val1, label2, val2) {
    const x = ML
    const h = 13
    const half = CW / 2

    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, color: C.gray })
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })

    this.page.drawText(label1, { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
    const lw1 = this.fontBold.widthOfTextAtSize(label1, 6.5)
    this.page.drawText(val1, { x: x + 4 + lw1 + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })

    if (label2) {
      this.page.drawLine({ start: { x: x + half, y: this.y }, end: { x: x + half, y: this.y - h }, thickness: 0.5, color: C.border })
      this.page.drawText(label2, { x: x + half + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
      const lw2 = this.fontBold.widthOfTextAtSize(label2, 6.5)
      this.page.drawText(val2 || '', { x: x + half + 4 + lw2 + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    }
    this.y -= h
  }

  sectionTitle(title) {
    this.checkSpace(18)
    this.page.drawRectangle({ x: ML, y: this.y - 15, width: CW, height: 15, color: C.black })
    this.page.drawText(title.toUpperCase(), { x: ML + 6, y: this.y - 11, size: 7.5, font: this.fontBold, color: C.white })
    this.y -= 17
  }

  subsectionHeader(number, title) {
    this.checkSpace(15)
    const x = ML, h = 13
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, color: C.dark })
    this.page.drawText(`${number}.- ${title}`, { x: x + 4, y: this.y - h + 4, size: 7, font: this.fontBold, color: C.white })

    const colE = x + CW * 0.58
    const colO = x + CW * 0.72
    this.page.drawText('Estado', { x: colE, y: this.y - h + 4, size: 6, font: this.fontBold, color: C.white })
    this.page.drawText('Observaciones', { x: colO, y: this.y - h + 4, size: 6, font: this.fontBold, color: C.white })
    this.y -= h
  }

  checklistRow(num, text, status, observation, valueText) {
    this.checkSpace(14)
    const x = ML, h = 14
    const colN = x + 26
    const colE = x + CW * 0.58
    const colO = x + CW * 0.72

    // Background
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })

    // Vertical lines
    this.page.drawLine({ start: { x: colN, y: this.y }, end: { x: colN, y: this.y - h }, thickness: 0.5, color: C.border })
    this.page.drawLine({ start: { x: colE, y: this.y }, end: { x: colE, y: this.y - h }, thickness: 0.5, color: C.border })
    this.page.drawLine({ start: { x: colO, y: this.y }, end: { x: colO, y: this.y - h }, thickness: 0.5, color: C.border })

    // Number
    this.page.drawText(String(num), { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })

    // Text (truncate if needed)
    let display = text
    if (valueText) display += ` (${valueText})`
    const maxTextW = colE - colN - 8
    let truncated = display
    while (this.font.widthOfTextAtSize(truncated, 6.5) > maxTextW && truncated.length > 3) {
      truncated = truncated.slice(0, -1)
    }
    if (truncated !== display) truncated += '...'
    this.page.drawText(truncated, { x: colN + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })

    // Status with background color
    const st = (status || '').toLowerCase()
    if (st) {
      let bgColor = null, textColor = C.text
      if (st === 'bueno' || st === 'good') { bgColor = C.goodBg; textColor = C.good }
      else if (st === 'regular') { bgColor = C.regularBg; textColor = C.regular }
      else if (st === 'malo' || st === 'bad') { bgColor = C.badBg; textColor = C.bad }
      else if (st === 'n/a' || st === 'na') { bgColor = C.naBg; textColor = C.naText }

      if (bgColor) {
        this.page.drawRectangle({ x: colE + 0.5, y: this.y - h + 0.5, width: colO - colE - 1, height: h - 1, color: bgColor })
      }
      const label = st === 'bueno' || st === 'good' ? 'Bueno' : st === 'regular' ? 'Regular' : st === 'malo' || st === 'bad' ? 'Malo' : st === 'n/a' || st === 'na' ? 'N/A' : status
      this.page.drawText(label, { x: colE + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: textColor })
    }

    // Observation
    if (observation) {
      const maxObsW = x + CW - colO - 8
      let obs = String(observation)
      while (this.font.widthOfTextAtSize(obs, 6) > maxObsW && obs.length > 3) obs = obs.slice(0, -1)
      if (obs !== String(observation)) obs += '...'
      this.page.drawText(obs, { x: colO + 4, y: this.y - h + 4, size: 6, font: this.font, color: C.textLight })
    }

    this.y -= h
  }

  fieldRow(label, value) {
    this.checkSpace(13)
    const x = ML, h = 13, labelW = CW * 0.4
    this.page.drawRectangle({ x, y: this.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawLine({ start: { x: x + labelW, y: this.y }, end: { x: x + labelW, y: this.y - h }, thickness: 0.5, color: C.border })
    this.page.drawText(String(label), { x: x + 4, y: this.y - h + 4, size: 6.5, font: this.fontBold, color: C.text })
    this.page.drawText(String(value || ''), { x: x + labelW + 4, y: this.y - h + 4, size: 6.5, font: this.font, color: C.text })
    this.y -= h
  }

  textBlock(label, value) {
    this.checkSpace(32)
    const x = ML
    // Label bar
    this.page.drawRectangle({ x, y: this.y - 12, width: CW, height: 12, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText(label, { x: x + 4, y: this.y - 9, size: 6.5, font: this.fontBold, color: C.text })
    this.y -= 12
    // Value box
    const val = value || '—'
    const boxH = 22
    this.page.drawRectangle({ x, y: this.y - boxH, width: CW, height: boxH, borderColor: C.border, borderWidth: 0.5 })
    this.page.drawText(String(val).slice(0, 200), { x: x + 6, y: this.y - 10, size: 6.5, font: this.font, color: C.text })
    this.y -= boxH
  }

  darkSubheader(title) {
    this.checkSpace(15)
    this.page.drawRectangle({ x: ML, y: this.y - 13, width: CW, height: 13, color: C.dark })
    this.page.drawText(title, { x: ML + 4, y: this.y - 10, size: 7, font: this.fontBold, color: C.white })
    this.y -= 15
  }
}


// ══════════════════════════════════════════════════════════════════
// ALL CHECKLIST ITEMS (matching Excel exactly)
// ══════════════════════════════════════════════════════════════════
const SITE_SECTIONS = [
  { num: '1', title: 'Acceso', items: [
    ['1.1','Camino de Acceso'],['1.2','Limpieza Exterior'],['1.3','Candado y Acceso Principal'],
    ['1.4','Escaleras de Acceso (Inmueble y Azotea)'],['1.5','Limpieza General Interior'],
  ]},
  { num: '2', title: 'Seguridad', items: [
    ['2.1','Condición de la Malla Ciclónica'],['2.2','Cimentación de Malla Ciclónica'],
    ['2.3','Condición de Muros'],['2.4','Alambre de Púas y Concertina'],
    ['2.5','Puerta se puede cerrar con candado'],['2.6','Condición de puerta principal'],
    ['2.7','Cámaras o sistema de monitoreo'],
  ]},
  { num: '3', title: 'Sistema de Tierras', items: [
    ['3.1','Condición del Cable'],['3.2','Condición de las Soldaduras'],
    ['3.3','Prueba de Resistividad'],['3.4','Registros / Cámaras de Inspección'],
    ['3.5','Conexiones para aterrizar la torre'],['3.6','Conexiones para aterrizar Malla/Muros'],
  ]},
  { num: '4', title: 'Sistema Eléctrico', items: [
    ['4.1','Estado del Nicho Eléctrico'],['4.2','Candado de Seguridad y Protección'],
    ['4.3','Registros eléctricos'],['4.4','Postes'],['4.5','Transformador o Subestación'],
    ['4.6','Tipo (Pedestal o Poste)'],['4.7','Marca del Transformador'],
    ['4.8','Capacidad del Transformador'],['4.9','Número de Serie del Transformador'],
    ['4.10','Poste del Transformador'],['4.11','Número de Medidor de cada Cliente'],
    ['4.12','Tierras del Sistema Eléctrico'],
  ]},
  { num: '5', title: 'Sitio en General', items: [
    ['5.1','Condición y Nivel de Grava'],['5.2','Malla Antivegetal'],['5.3','Protección de nicho'],
    ['5.4','Drenaje del sitio'],['5.5','Pintura Exterior e Interior'],
    ['5.6','Grietas en base de torre'],['5.7','Grietas en dados de torre'],
    ['5.8','Grietas en base de equipos'],['5.9','Grietas/Encharcamientos azotea'],
    ['5.10','Impermeabilizado área rentada'],['5.11','Condición general azotea'],
  ]},
]

const TOWER_SECTIONS = [
  { num: '6', title: 'Miembros', items: [
    ['6.1','Miembros Dañados'],['6.2','Miembros Flojos'],['6.3','Miembros Faltantes'],
    ['6.4','Escalera de Ascenso'],['6.5','Tornillos en Bridas Completos'],
    ['6.6','Tornillos en Bridas de Abajo hacia Arriba'],['6.7','Tornillos en Celosías Completos'],
    ['6.8','Tornillos en Celosías de Adentro hacia Afuera'],['6.9','Soldadura entre Pierna y Brida'],
    ['6.10','Cable de Vida'],['6.11','Step Bolt y Equipo de Seguridad'],
    ['6.12','Dren de Piernas de la Torre'],['6.13','Grout'],
    ['6.14','Estado del Camuflaje'],['6.15','Verticalidad'],
  ]},
  { num: '7', title: 'Acabado', items: [
    ['7.1','Condición de la Pintura'],['7.2','Condición del Galvanizado'],['7.3','Oxidación'],
  ]},
  { num: '8', title: 'Luces de la Torre', items: [
    ['8.1','Sistema de Balizamiento Instalado'],['8.2','Sistema de Luz Funcionando'],
    ['8.3','Tubería, Cajas y Sujetadores'],['8.4','Condición del Cable'],
    ['8.5','Condición de la Fotocelda'],['8.6','Condición del Controlador'],
    ['8.7','Condición de las luces'],['8.8','Número de Medidor para Luces'],
    ['8.9','Medidor Conectado al QO2'],['8.10','Voltaje en Interruptor QO2'],
  ]},
  { num: '9', title: 'Sistema de Tierras en la Torre', items: [
    ['9.1','Tapas y Registros'],['9.2','Conexiones Exotérmicas'],['9.3','Condición de Cables'],
    ['9.4','Sujeción, Condición y Tipo'],['9.5','Aterrizaje Piernas de Torre'],
    ['9.6','Aterrizaje de Retenidas'],['9.7','Aterrizaje de Malla Ciclónica'],
    ['9.8','Aterrizaje de Mástil-Monopolo'],['9.9','Aterrizaje de Portacablera'],
    ['9.10','Oxidación'],['9.11','Pararrayo y Cable'],['9.12','Sistema de Tierra en General'],
  ]},
  { num: '10', title: 'Retenidas', items: [
    ['10.1','Dados de Concreto'],['10.2','Condición de las Anclas'],
    ['10.3','Uniones entre Retenidas y Anclas'],['10.4','Retenidas Libres de Oxidación'],
    ['10.5','Tensión de las Retenidas'],['10.6','Tornillos y Sujetadores'],
  ]},
  { num: '11', title: 'Cimentación de Torre', items: [
    ['11.1','Erosión'],['11.2','Acabado en Dados'],['11.3','Condición de Anclas'],
    ['11.4','Fisuras o Grietas'],['11.5','Estructuras Metálicas y Vigas'],
  ]},
]


// ══════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════
export async function generateMaintenancePdf(submission, assets = []) {
  const p = new MaintenancePDF()
  await p.init()

  // Extract data from payload
  const payload = submission?.payload || submission || {}
  const inner = payload?.payload || payload
  const data = inner?.data || inner || {}
  const formData = data?.formData || {}
  const checklist = data?.checklistData || {}
  const meta = inner?.meta || {}

  const v = (key) => formData[key] || data[key] || ''

  // Helper to get checklist status
  const getStatus = (id) => {
    const item = checklist[id]
    if (!item) return { status: '', observation: '', value: '' }
    if (typeof item === 'string') return { status: item, observation: '', value: '' }
    return { status: item.status || '', observation: item.observation || '', value: item.value || '' }
  }

  // ── Fetch photos for embedding ─────────────────────────────
  const photoMap = {}
  for (const a of (assets || [])) { if (a.public_url && a.asset_type) photoMap[a.asset_type] = a.public_url }

  async function embedPhoto(url) {
    if (!url) return null
    try {
      const r = await fetch(url); if (!r.ok) return null
      const b = new Uint8Array(await r.arrayBuffer())
      if (b[0]===0xFF && b[1]===0xD8) return await p.doc.embedJpg(b)
      if (b[0]===0x89 && b[1]===0x50) return await p.doc.embedPng(b)
      try { return await p.doc.embedJpg(b) } catch { return null }
    } catch { return null }
  }

  const fotoTorreImg = await embedPhoto(photoMap['fotoTorre'] || photoMap['maintenance:fotoTorre'])
  const fotoGPSImg   = await embedPhoto(photoMap['fotoGPS']   || photoMap['maintenance:fotoGPS'])
  const fotoCandadoImg = await embedPhoto(photoMap['fotoCandado'] || photoMap['maintenance:fotoCandado'])

  // ── PAGE 1: Informacion General ─────────────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita') })  // Page 1: no ID/Nombre in header
  p.sectionTitle('Informacion General del Sitio')

  p.darkSubheader('Informacion del Sitio')

  // ════════════════════════════════════════════════════════════════
  // LAYOUT: columna derecha GPS_W pts ancha para foto GPS
  // Las filas de datos se dibujan solo en DATA_W (columna izquierda)
  // La foto GPS abarca Nombre+Numero+Coordenadas+TipoSitio (6 filas)
  // ════════════════════════════════════════════════════════════════
  const GPS_W = 130
  const GPS_COL_X = ML + CW - GPS_W
  const DATA_W = CW - GPS_W               // left column width (sin gap)
  const LBL_W = DATA_W * 0.48            // label sub-column

  // Helper: draw a row only in the left DATA_W column
  const dataRow = (labelTxt, valueTxt, h = 13) => {
    p.page.drawRectangle({ x: ML, y: p.y - h, width: DATA_W, height: h, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawLine({ start: { x: ML + LBL_W, y: p.y }, end: { x: ML + LBL_W, y: p.y - h }, thickness: 0.5, color: C.border })
    if (labelTxt) p.page.drawText(labelTxt, { x: ML + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
    if (valueTxt) p.page.drawText(String(valueTxt), { x: ML + LBL_W + 4, y: p.y - h + 4, size: 6.5, font: p.font, color: C.text })
    p.y -= h
  }

  const yTopGPSBlock = p.y  // anchor: GPS foto starts here

  // ── Nombre del Sitio ────────────────────────────────────────────
  dataRow('Nombre del Sitio:', v('nombreSitio'))

  // ── Numero del Sitio ────────────────────────────────────────────
  dataRow('Numero del Sitio:', v('idSitio'))

  // ── Coordenadas (2 filas: Latitud / Longitud) ───────────────────
  const lat = meta.lat || v('lat') || ''
  const lng = meta.lng || v('lng') || ''
  {
    const h = 13
    // Row Latitud
    p.page.drawRectangle({ x: ML, y: p.y - h, width: DATA_W, height: h, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawLine({ start: { x: ML + LBL_W, y: p.y }, end: { x: ML + LBL_W, y: p.y - h }, thickness: 0.5, color: C.border })
    p.page.drawText('Coordenadas (centro de la torre) DDD.ddddd', { x: ML + 4, y: p.y - h + 4, size: 5.5, font: p.fontBold, color: C.text })
    p.page.drawText('Latitud:', { x: ML + LBL_W + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
    p.page.drawText(String(lat), { x: ML + LBL_W + 44, y: p.y - h + 4, size: 6.5, font: p.font, color: C.text })
    p.y -= h
    // Row Longitud
    p.page.drawRectangle({ x: ML, y: p.y - h, width: DATA_W, height: h, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawLine({ start: { x: ML + LBL_W, y: p.y }, end: { x: ML + LBL_W, y: p.y - h }, thickness: 0.5, color: C.border })
    p.page.drawText('NAD 84', { x: ML + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
    p.page.drawText('Longitud:', { x: ML + LBL_W + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
    p.page.drawText(String(lng), { x: ML + LBL_W + 48, y: p.y - h + 4, size: 6.5, font: p.font, color: C.text })
    p.y -= h
  }

  // ── Tipo de Sitio (2 filas: Urbano/Rawland, Rural/Rooftop) ─────
  const tipoSitio = (v('tipoSitio') || '').toLowerCase()
  {
    const h = 13
    const chk = (bx, by, checked, lbl) => {
      p.page.drawRectangle({ x: bx, y: by - h + 2, width: 10, height: 9, borderColor: C.border, borderWidth: 0.5 })
      if (checked) p.page.drawText('X', { x: bx + 2.5, y: by - h + 3, size: 7, font: p.fontBold, color: C.text })
      p.page.drawText(lbl + ':', { x: bx + 13, y: by - h + 4, size: 6.5, font: p.font, color: C.text })
    }
    // Row 1: label + Urbano + Rawland
    p.page.drawRectangle({ x: ML, y: p.y - h, width: DATA_W, height: h, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawLine({ start: { x: ML + LBL_W, y: p.y }, end: { x: ML + LBL_W, y: p.y - h }, thickness: 0.5, color: C.border })
    p.page.drawText('Tipo de Sitio:', { x: ML + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
    p.page.drawText('(elige una opción)', { x: ML + 4 + p.fontBold.widthOfTextAtSize('Tipo de Sitio:', 6.5) + 3, y: p.y - h + 4, size: 6, font: p.font, color: C.red })
    chk(ML + LBL_W + 4,      p.y, tipoSitio.includes('urbano'),  'Urbano')
    chk(ML + LBL_W + 4 + 75, p.y, tipoSitio.includes('rawland'), 'Rawland')
    p.y -= h
    // Row 2: Rural + Rooftop (no left label)
    p.page.drawRectangle({ x: ML, y: p.y - h, width: DATA_W, height: h, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawLine({ start: { x: ML + LBL_W, y: p.y }, end: { x: ML + LBL_W, y: p.y - h }, thickness: 0.5, color: C.border })
    chk(ML + LBL_W + 4,      p.y, tipoSitio.includes('rural'),   'Rural')
    chk(ML + LBL_W + 4 + 75, p.y, tipoSitio.includes('rooftop'), 'Rooftop')
    p.y -= h
  }

  // ── fotoGPS: columna derecha desde yTopGPSBlock hasta aquí ─────
  // Imagen + borde arriba, label de texto pequeño debajo (igual a referencia)
  {
    const blockH = yTopGPSBlock - p.y
    const IMG_LBL_H = 10
    const imgBoxH = blockH - IMG_LBL_H

    // Borde + imagen
    p.page.drawRectangle({ x: GPS_COL_X, y: p.y + IMG_LBL_H, width: GPS_W, height: imgBoxH, borderColor: C.border, borderWidth: 0.5 })
    if (fotoGPSImg) {
      const dims = fotoGPSImg.scale(1)
      const sc = Math.min((GPS_W - 6) / dims.width, (imgBoxH - 6) / dims.height)
      const iw = dims.width * sc, ih = dims.height * sc
      p.page.drawImage(fotoGPSImg, {
        x: GPS_COL_X + (GPS_W - iw) / 2,
        y: p.y + IMG_LBL_H + (imgBoxH - ih) / 2,
        width: iw, height: ih
      })
    }
    // Label texto debajo del recuadro (igual al PDF original)
    p.page.drawText('Dejar el GPS por lo menos 30 min', {
      x: GPS_COL_X + GPS_W / 2 - p.font.widthOfTextAtSize('Dejar el GPS por lo menos 30 min', 6) / 2,
      y: p.y + 2, size: 6, font: p.fontBold, color: C.text
    })
  }

  // ── Fechas y horas (full CW — sin foto al lado, igual a referencia) ─
  p.y -= 2
  p.fieldRow('Fecha de Inicio:', meta.startedAt || v('startedAt') || (submission?.created_at ? new Date(submission.created_at).toLocaleDateString('es') : ''))
  const fechaTermino = meta.endedAt || v('endedAt') || v('fechaTermino') || (submission?.updated_at ? new Date(submission.updated_at).toLocaleDateString('es') : '')
  p.fieldRow('Fecha de Termino:', fechaTermino)
  p.fieldRow('Hora de Entrada:', meta.startTime || v('horaEntrada') || '')
  p.fieldRow('Hora de Salida:', meta.endTime || v('horaSalida') || '')

  // ── Torre info con fotoTorre en columna derecha ─────────────────
  p.y -= 2
  const yTopTorreBlock = p.y
  const TORRE_W = 130
  const TORRE_COL_X = ML + CW - TORRE_W
  const TORRE_DATA_W = CW - TORRE_W
  const TORRE_LBL_W = TORRE_DATA_W * 0.6

  const torreRow = (labelTxt, valueTxt, h = 13) => {
    p.page.drawRectangle({ x: ML, y: p.y - h, width: TORRE_DATA_W, height: h, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawLine({ start: { x: ML + TORRE_LBL_W, y: p.y }, end: { x: ML + TORRE_LBL_W, y: p.y - h }, thickness: 0.5, color: C.border })
    p.page.drawText(labelTxt, { x: ML + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
    p.page.drawText(String(valueTxt || ''), { x: ML + TORRE_LBL_W + 4, y: p.y - h + 4, size: 6.5, font: p.font, color: C.text })
    p.y -= h
  }

  torreRow('Tipo de Torre:', v('tipoTorre'))
  torreRow('Altura de la Torre:', v('alturaTorre') ? `${v('alturaTorre')}` : '')
  torreRow('Altura del Edificio hasta la base de la torre:', v('alturaEdificio') || 'N/A')
  let altTotal = ''
  try { const at = (parseFloat(v('alturaTorre')||0)) + (parseFloat(v('alturaEdificio')||0)); if (at > 0) altTotal = `${at}` } catch(_){}
  torreRow('Altura total:', altTotal)
  torreRow('Condicion de la Torre:', v('condicionTorre'))

  // fotoTorre — columna derecha, spanning el bloque torre
  // Label de texto pequeño debajo (igual a referencia)
  {
    const torreBlockH = yTopTorreBlock - p.y
    const TLBL_H = 10
    const tImgH = torreBlockH - TLBL_H

    p.page.drawRectangle({ x: TORRE_COL_X, y: p.y + TLBL_H, width: TORRE_W, height: tImgH, borderColor: C.border, borderWidth: 0.5 })
    if (fotoTorreImg) {
      const dims = fotoTorreImg.scale(1)
      const sc = Math.min((TORRE_W - 6) / dims.width, (tImgH - 6) / dims.height)
      const iw = dims.width * sc, ih = dims.height * sc
      p.page.drawImage(fotoTorreImg, {
        x: TORRE_COL_X + (TORRE_W - iw) / 2,
        y: p.y + TLBL_H + (tImgH - ih) / 2,
        width: iw, height: ih
      })
    }
    p.page.drawText('Foto de altura de Torre hasta la base de la torre', {
      x: TORRE_COL_X + TORRE_W / 2 - p.font.widthOfTextAtSize('Foto de altura de Torre hasta la base de la torre', 5.5) / 2,
      y: p.y + 2, size: 5.5, font: p.font, color: C.textLight
    })
  }

  p.y -= 4
  p.darkSubheader('Direccion del Sitio')
  p.fieldRow('Calle:', v('calle'))
  p.fieldRow('Numero:', v('numero'))
  p.fieldRow('Colonia:', v('colonia'))
  p.fieldRow('Ciudad:', v('ciudad'))
  p.fieldRow('Estado:', v('estado'))
  p.fieldRow('Codigo Postal:', v('codigoPostal'))
  p.fieldRow('Pais:', v('pais'))

  p.y -= 4
  p.darkSubheader('Acceso al Sitio')
  // 2-column layout: left=Descripción, right=Restricción/Propietario
  {
    const h = 13, HALF = CW / 2
    const twoColRow = (lbl1, val1, lbl2, val2) => {
      p.checkSpace(h)
      p.page.drawRectangle({ x: ML, y: p.y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })
      p.page.drawLine({ start: { x: ML + HALF, y: p.y }, end: { x: ML + HALF, y: p.y - h }, thickness: 0.5, color: C.border })
      // Left
      p.page.drawText(lbl1, { x: ML + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
      p.page.drawText(String(val1 || ''), { x: ML + 4 + p.fontBold.widthOfTextAtSize(lbl1, 6.5) + 4, y: p.y - h + 4, size: 6.5, font: p.font, color: C.text })
      // Right
      p.page.drawText(lbl2, { x: ML + HALF + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
      // Value badge for right side (small box)
      const valX = ML + HALF + 4 + p.fontBold.widthOfTextAtSize(lbl2, 6.5) + 4
      p.page.drawRectangle({ x: valX, y: p.y - h + 2, width: 28, height: h - 4, borderColor: C.border, borderWidth: 0.5 })
      p.page.drawText(String(val2 || ''), { x: valX + 4, y: p.y - h + 4, size: 6.5, font: p.fontBold, color: C.text })
      p.y -= h
    }
    twoColRow('Descripción del Sitio', v('descripcionSitio'), 'Restriccion de Horario', v('restriccionHorario'))
    twoColRow('Descripcion de Acceso', v('descripcionAcceso'), 'Propietario localizable en sitio', v('propietarioLocalizable'))
  }
  p.fieldRow('Clave:', v('claveCombinacion') || '-')
  p.fieldRow('Llave  (elige una opción)', v('tipoLlave'))
  p.fieldRow('Memorándum  (elige una opción)', v('memorandumRequerido'))
  p.fieldRow('Problemas de acceso', v('problemasAcceso'))
  p.fieldRow('Notificaciones en los Sitios', v('notificaciones') || v('notificacionesSitio'))

  // Embed fotoCandado to the right
  if (fotoCandadoImg) {
    const dims = fotoCandadoImg.scale(1)
    const maxW = 120, maxH = 80
    const sc = Math.min(maxW / dims.width, maxH / dims.height)
    const iw = dims.width * sc, ih = dims.height * sc
    p.page.drawImage(fotoCandadoImg, { x: ML + CW - iw - 5, y: p.y + 10, width: iw, height: ih })
    p.page.drawRectangle({ x: ML + CW - iw - 7, y: p.y + 8, width: iw + 4, height: ih + 4, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawText('Foto de Candado y/o Llave', { x: ML + CW - iw - 5, y: p.y + 2, size: 5, font: p.font, color: C.textLight })
  }

  p.y -= 4
  p.darkSubheader('Servicios en Sitio')
  p.fieldRow('Ubicacion de los Medidores Electricos:', v('ubicacionMedidores'))
  p.fieldRow('Tipo de Conexion Electrica:', v('tipoConexion'))
  p.fieldRow('Capacidad del Transformador:', v('capacidadTransformador'))
  p.fieldRow('Numero de Medidores:', v('numMedidores'))
  p.fieldRow('Medidor separado para luz de torre:', v('medidorSeparadoLuces'))
  p.fieldRow('Fibra Optica en Sitio:', v('fibraOptica'))
  p._drawFooter()

  // ── PAGE 2: Información de la Estructura Principal ─────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita'), idSitio: v('idSitio'), nombreSitio: v('nombreSitio') })
  p.sectionTitle('Informacion de la Estructura Principal')

  const towerType = (v('tipoTorre') || '').toLowerCase()
  const altura     = v('alturaTorre') ? v('alturaTorre') + ' m' : ''
  const hasCam     = (v('tieneCamuflaje') || '').toLowerCase()
  const isActive   = (key) => towerType.includes(key)

  // Helper: draw a checkbox with optional X mark
  const drawCheck = (x, y, checked, label, labelSize = 6) => {
    p.page.drawRectangle({ x, y: y - 9, width: 11, height: 9, borderColor: C.border, borderWidth: 0.5 })
    if (checked) p.page.drawText('X', { x: x + 2, y: y - 8, size: 7, font: p.fontBold, color: C.text })
    if (label) p.page.drawText(label, { x: x + 14, y: y - 7, size: labelSize, font: p.font, color: C.text })
  }

  // Helper: draw a labeled field inline (label + underline value)
  const drawInlineField = (x, y, label, value, valueX) => {
    p.page.drawText(label, { x, y: y - 7, size: 6, font: p.font, color: C.text })
    const vx = valueX || x + p.font.widthOfTextAtSize(label, 6) + 4
    p.page.drawText(value || '', { x: vx, y: y - 7, size: 6.5, font: p.fontBold, color: C.text })
    // Underline
    const lineEnd = Math.min(vx + Math.max(p.font.widthOfTextAtSize(value || '', 6.5) + 4, 60), ML + CW - 4)
    p.page.drawLine({ start: { x: vx, y: y - 9 }, end: { x: lineEnd, y: y - 9 }, thickness: 0.4, color: C.border })
  }

  // Helper: draw structure block header row
  const drawStructHeader = (label) => {
    p.checkSpace(16)
    p.page.drawRectangle({ x: ML, y: p.y - 14, width: CW, height: 14, borderColor: C.border, borderWidth: 0.5 })
    p.page.drawText(label, { x: ML + 4, y: p.y - 11, size: 7, font: p.fontBold, color: C.text })
    p.y -= 14
  }

  // Helper: draw a grid row inside a structure block
  const drawStructRow = (rowH, drawFn) => {
    p.checkSpace(rowH + 2)
    p.page.drawRectangle({ x: ML, y: p.y - rowH, width: CW, height: rowH, borderColor: C.border, borderWidth: 0.5 })
    drawFn(p.y)
    p.y -= rowH
  }

  // ── Torre Autosoportada ──────────────────────────────────────
  {
    drawStructHeader('Torre Autosoportada')
    const active = isActive('autosoportada')
    const rh = 14
    const tipoSec = (v('tipoSeccion') || '').toLowerCase()
    const tipoPier = (v('tipoPierna') || '').toLowerCase()

    // Row 1: Seccion Triangular | Seccion Cuadrada | Altura
    drawStructRow(rh, (y) => {
      drawCheck(ML + 6,  y, active && tipoSec === 'triangular', 'Seccion Triangular')
      drawCheck(ML + 160, y, active && tipoSec === 'cuadrada',   'Seccion Cuadrada')
      if (active) {
        p.page.drawText('Altura', { x: ML + CW - 80, y: y - 5, size: 6, font: p.font, color: C.text })
        p.page.drawText(altura, { x: ML + CW - 45, y: y - 7, size: 8, font: p.fontBold, color: C.text })
        p.page.drawLine({ start: { x: ML + CW - 45, y: y - 10 }, end: { x: ML + CW - 4, y: y - 10 }, thickness: 0.4, color: C.border })
      }
    })

    // Row 2: Pierna Tubular | Pierna Angular | Pierna Solida
    drawStructRow(rh, (y) => {
      drawCheck(ML + 6,   y, active && tipoPier === 'tubular', 'Pierna Tubular')
      drawCheck(ML + 130, y, active && tipoPier === 'angular', 'Pierna Angular')
      drawCheck(ML + 260, y, active && tipoPier === 'solida',  'Pierna Solida')
    })

    // Row 3: Numero de Secciones | Medida Por Seccion
    drawStructRow(rh, (y) => {
      drawInlineField(ML + 6, y, 'Numero de Secciones', active ? v('numSecciones') : '', ML + 110)
      drawInlineField(ML + CW/2, y, 'Medida Por Seccion (m)', active ? v('medidaPorSeccion') : '', ML + CW/2 + 110)
    })

    // Row 4: Separacion de Piernas | Ancho de Celosia
    drawStructRow(rh, (y) => {
      drawInlineField(ML + 6, y, 'Separacion de Piernas (m)', active ? v('separacionPiernas') : '', ML + 130)
      drawInlineField(ML + CW/2, y, 'Ancho de Celosia (m)', active ? v('anchoCelosia') : '', ML + CW/2 + 100)
    })

    // Row 5: ¿Tiene camuflaje? | Tipo de Camuflaje
    drawStructRow(rh, (y) => {
      const camVal = active ? (hasCam === 'si' ? 'Sí' : hasCam === 'no' ? 'No' : '') : ''
      drawCheck(ML + 6, y, active && hasCam === 'si')
      p.page.drawText(camVal, { x: ML + 20, y: y - 7, size: 6.5, font: p.fontBold, color: C.text })
      p.page.drawText('¿Tiene camuflaje?', { x: ML + 36, y: y - 7, size: 6, font: p.font, color: C.text })
      drawInlineField(ML + 140, y, 'Tpo de Camuflaje', active && hasCam === 'si' ? v('tipoCamuflaje') : '', ML + 225)
    })

    p.y -= 6
  }

  // ── Monopolo ─────────────────────────────────────────────────
  {
    drawStructHeader('Monopolo')
    const active = isActive('monopolo')
    const rh = 14

    // Row 1: Circular | Poligonal | Num de caras | Altura
    drawStructRow(rh, (y) => {
      const formaVal = (v('formaMonopolo') || '').toLowerCase()
      drawCheck(ML + 6,  y, active && formaVal === 'circular',  'Circular')
      drawCheck(ML + 100, y, active && formaVal === 'poligonal', 'Poligonal')
      drawInlineField(ML + 210, y, 'Numero de caras', active ? v('numCaras') : '', ML + 295)
      drawInlineField(ML + CW - 80, y, 'Altura', active ? v('alturaTorre') : '', ML + CW - 50)
    })

    // Row 2: Diametro Base | Diametro Cuspide
    drawStructRow(rh, (y) => {
      drawInlineField(ML + 6, y, 'Diametro Base (m)', active ? v('diametroBase') : '', ML + 90)
      drawInlineField(ML + CW/2, y, 'Diametro Cuspide (m)', active ? v('diametroCuspide') : '', ML + CW/2 + 100)
    })

    // Row 3: Numero de Secciones | Medida Por Seccion
    drawStructRow(rh, (y) => {
      drawInlineField(ML + 6, y, 'Numero de Secciones', active ? v('numSecciones') : '', ML + 110)
      drawInlineField(ML + CW/2, y, 'Medida Por Seccion (m)', active ? v('medidaPorSeccion') : '', ML + CW/2 + 110)
    })

    // Row 4: Altura Escotilla Inferior | Altura Escotilla Superior
    drawStructRow(rh, (y) => {
      drawInlineField(ML + 6, y, 'Altura Escotilla Inferior (m)', active ? v('alturaEscotillaInf') : '', ML + 140)
      drawInlineField(ML + CW/2, y, 'Altura Escotilla Superior (m)', active ? v('alturaEscotillaSup') : '', ML + CW/2 + 140)
    })

    // Row 5: Camuflaje
    drawStructRow(rh, (y) => {
      const camVal = active ? (hasCam === 'si' ? 'Sí' : hasCam === 'no' ? 'No' : '') : ''
      drawCheck(ML + 6, y, active && hasCam === 'si')
      p.page.drawText(camVal, { x: ML + 20, y: y - 7, size: 6.5, font: p.fontBold, color: C.text })
      p.page.drawText('¿Tiene camuflaje?', { x: ML + 36, y: y - 7, size: 6, font: p.font, color: C.text })
      drawInlineField(ML + 140, y, 'Tpo de Camuflaje', active && hasCam === 'si' ? v('tipoCamuflaje') : '', ML + 225)
    })

    p.y -= 6
  }

  // ── Torre Arriostrada ────────────────────────────────────────
  {
    drawStructHeader('Torre Arriostrada')
    const active = isActive('arriostrada')
    const rh = 14
    const tipoSec = (v('tipoSeccion') || '').toLowerCase()
    const tipoPier = (v('tipoPierna') || '').toLowerCase()

    // Row 1: Seccion Triangular | Seccion Cuadrada | Altura
    drawStructRow(rh, (y) => {
      drawCheck(ML + 6,  y, active && tipoSec === 'triangular', 'Seccion Triangular')
      drawCheck(ML + 160, y, active && tipoSec === 'cuadrada',   'Seccion Cuadrada')
      if (active) {
        p.page.drawText('Altura', { x: ML + CW - 80, y: y - 5, size: 6, font: p.font, color: C.text })
        p.page.drawText(altura, { x: ML + CW - 45, y: y - 7, size: 8, font: p.fontBold, color: C.text })
        p.page.drawLine({ start: { x: ML + CW - 45, y: y - 10 }, end: { x: ML + CW - 4, y: y - 10 }, thickness: 0.4, color: C.border })
      }
    })

    // Row 2: TZ | TX | Diametro (30|45|60|90|Otra)
    const tipRet = (v('tipoRetenida') || '').toLowerCase()
    const diamRet = String(v('diametroRetenida') || '')
    drawStructRow(rh, (y) => {
      drawCheck(ML + 6,  y, active && tipRet === 'tz', 'TZ')
      drawCheck(ML + 55, y, active && tipRet === 'tx', 'TX')
      p.page.drawText('Diametro', { x: ML + 110, y: y - 7, size: 6, font: p.font, color: C.text })
      for (const [i, d] of ['30','45','60','90','Otra'].entries()) {
        drawCheck(ML + 158 + i * 52, y, active && diamRet === d, d, 5.5)
      }
    })

    // Row 3: Pierna Tubular | Pierna Angular | Pierna Solida
    drawStructRow(rh, (y) => {
      drawCheck(ML + 6,   y, active && tipoPier === 'tubular', 'Pierna Tubular')
      drawCheck(ML + 130, y, active && tipoPier === 'angular', 'Pierna Angular')
      drawCheck(ML + 260, y, active && tipoPier === 'solida',  'Pierna Solida')
    })

    // Row 4: Numero de Secciones | Medida Por Seccion
    drawStructRow(rh, (y) => {
      drawInlineField(ML + 6, y, 'Numero de Secciones', active ? v('numSecciones') : '', ML + 110)
      drawInlineField(ML + CW/2, y, 'Medida Por Seccion (m)', active ? v('medidaPorSeccion') : '', ML + CW/2 + 110)
    })

    // Row 5: Separacion de Piernas | Ancho de Celosia
    drawStructRow(rh, (y) => {
      drawInlineField(ML + 6, y, 'Separacion de Piernas (m)', active ? v('separacionPiernas') : '', ML + 130)
      drawInlineField(ML + CW/2, y, 'Ancho de Celosia (m)', active ? v('anchoCelosia') : '', ML + CW/2 + 100)
    })

    // Row 6: Camuflaje
    drawStructRow(rh, (y) => {
      const camVal = active ? (hasCam === 'si' ? 'Sí' : hasCam === 'no' ? 'No' : '') : ''
      drawCheck(ML + 6, y, active && hasCam === 'si')
      p.page.drawText(camVal, { x: ML + 20, y: y - 7, size: 6.5, font: p.fontBold, color: C.text })
      p.page.drawText('¿Tiene camuflaje?', { x: ML + 36, y: y - 7, size: 6, font: p.font, color: C.text })
      drawInlineField(ML + 140, y, 'Tpo de Camuflaje', active && hasCam === 'si' ? v('tipoCamuflaje') : '', ML + 225)
    })

    p.y -= 6
  }

  // ── Mastiles ─────────────────────────────────────────────────
  {
    const active = isActive('mastil')
    const rh = 18   // row height (taller to match Excel spacing)
    const BLOCK_H = rh * 4 + 2   // 3 mástil rows + 1 camuflaje row

    // Outer container (no header row — "Mastiles" is a left-side label)
    p.checkSpace(BLOCK_H + 4)
    p.page.drawRectangle({ x: ML, y: p.y - BLOCK_H, width: CW, height: BLOCK_H, borderColor: C.border, borderWidth: 0.5 })

    // Left label "Mastiles" — vertical text in the left margin strip
    const LABEL_W = 54
    p.page.drawText('Mastiles', { x: ML + 4, y: p.y - BLOCK_H / 2 - 12, size: 7, font: p.fontBold, color: C.text })

    // Content area starts after left label
    const CX = ML + LABEL_W   // content x start
    const CW2 = CW - LABEL_W  // content width

    // Vertical divider between label strip and content
    p.page.drawLine({
      start: { x: CX, y: p.y }, end: { x: CX, y: p.y - BLOCK_H },
      thickness: 0.4, color: C.border
    })

    // Helper to draw one mástil row
    const mastilRow = (rowY, checkLabel, diamKey, cantKey, alturaKey) => {
      // checkbox + type label
      drawCheck(CX + 4, rowY, active && !!v(diamKey || cantKey || alturaKey), checkLabel)
      // Diam
      const dX = CX + 100
      drawInlineField(dX, rowY, 'Diam', active ? v(diamKey) : '', dX + 30)
      // Cant
      const cX = dX + 110
      drawInlineField(cX, rowY, 'Cant', active ? v(cantKey) : '', cX + 30)
      // Altura
      const aX = cX + 110
      drawInlineField(aX, rowY, 'Altura', active ? v(alturaKey) : '', aX + 38)
    }

    let ry = p.y

    // Row 1: Mastil Arriostrado
    p.page.drawLine({ start: { x: CX, y: ry - rh }, end: { x: ML + CW, y: ry - rh }, thickness: 0.4, color: C.border })
    mastilRow(ry, 'Mastil Arriostrado', 'diametroMastilArriostrado', 'cantidadMastilArriostrado', 'alturaMastilArriostrado')
    ry -= rh

    // Row 2: Mastil Contraventedo
    p.page.drawLine({ start: { x: CX, y: ry - rh }, end: { x: ML + CW, y: ry - rh }, thickness: 0.4, color: C.border })
    mastilRow(ry, 'Mastil Contraventedo', 'diametroMastilContraventedo', 'cantidadMastilContraventedo', 'alturaMastilContraventedo')
    ry -= rh

    // Row 3: Mastil (simple)
    p.page.drawLine({ start: { x: CX, y: ry - rh }, end: { x: ML + CW, y: ry - rh }, thickness: 0.4, color: C.border })
    mastilRow(ry, 'Mastil', 'diametroMastil', 'cantidadMastiles', 'alturaMastil')
    ry -= rh

    // Row 4: Camuflaje
    const hasCam = (v('camuflajeMastil') || v('camuflaje') || '').toLowerCase()
    drawCheck(CX + 4, ry, active && hasCam === 'si')
    p.page.drawText('¿Tiene camuflaje)', { x: CX + 18, y: ry - 7, size: 6, font: p.font, color: C.text })
    drawInlineField(CX + 100, ry, 'Tpo de Camuflaje', active && hasCam === 'si' ? v('tipoCamuflajeMastil') || v('tipoCamuflaje') : '', CX + 180)

    p.y -= BLOCK_H + 2
    p.y -= 6
  }

  p.y -= 4
  p.page.drawText('*Cuando un problema es observado debe enviar un reporte fotografico y explicacion del problema.', { x: ML + 4, y: p.y, size: 5.5, font: p.fontBold, color: C.red })
  p._drawFooter()

  // ── PAGE 2: Inspección Del Sitio ────────────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita'), idSitio: v('idSitio'), nombreSitio: v('nombreSitio') })
  p.sectionTitle('Inspección del Sitio')  // = INSPECCIÓN DEL SITIO

  for (const sec of SITE_SECTIONS) {
    p.subsectionHeader(sec.num, sec.title)
    for (const [id, text] of sec.items) {
      const { status, observation, value } = getStatus(id)
      p.checklistRow(id, text, status, observation, value)
    }
  }

  // Vandalismo — matches reference layout exactly
  p.y -= 6
  // Two side-by-side text blocks: label left, value right
  {
    const twoTextRow = (label, value, h=34) => {
      p.checkSpace(h)
      const LBCOL = CW * 0.38
      p.page.drawRectangle({ x: ML, y: p.y - h, width: LBCOL, height: h, borderColor: C.border, borderWidth: 0.5 })
      p.page.drawText(label, { x: ML + 4, y: p.y - 10, size: 6, font: p.font, color: C.text })
      p.page.drawRectangle({ x: ML + LBCOL, y: p.y - h, width: CW - LBCOL, height: h, borderColor: C.border, borderWidth: 0.5 })
      const txt = String(value || '')
      if (txt) p.page.drawText(txt.slice(0, 120), { x: ML + LBCOL + 6, y: p.y - 12, size: 7, font: p.font, color: C.text })
      p.y -= h
    }
    twoTextRow('Observacion de vandalismo en sitio.', v('vandalismo') || v('descripcionVandalismo'))
    twoTextRow('Reporte de equipos de sistemas faltantes', v('equiposFaltantes'))
  }
  // Dark centered bar: "Reporte de cualquier defecto..."
  p.checkSpace(14)
  p.page.drawRectangle({ x: ML, y: p.y - 14, width: CW, height: 14, color: C.dark })
  p.page.drawText('Reporte de cualquier defecto que pueda detener la operacion del sitio', {
    x: ML + CW / 2 - p.fontBold.widthOfTextAtSize('Reporte de cualquier defecto que pueda detener la operacion del sitio', 7) / 2,
    y: p.y - 10, size: 7, font: p.fontBold, color: C.white
  })
  p.y -= 14
  // Full-width text box
  p.checkSpace(36)
  p.page.drawRectangle({ x: ML, y: p.y - 36, width: CW, height: 36, borderColor: C.border, borderWidth: 0.5 })
  const defTxt = v('defectosOperacion') || v('observacionesGenerales') || ''
  if (defTxt) p.page.drawText(defTxt.slice(0, 200), { x: ML + 6, y: p.y - 14, size: 7, font: p.font, color: C.text })
  p.y -= 36
  p._drawFooter()

  // ── PAGE 3: Inspección de la Torre ──────────────────────────
  p.newPage()
  p.drawHeader({ proveedor: v('proveedor'), tipoVisita: v('tipoVisita'), idSitio: v('idSitio'), nombreSitio: v('nombreSitio') })
  p.sectionTitle('Inspección de Torre')

  for (const sec of TOWER_SECTIONS) {
    p.subsectionHeader(sec.num, sec.title)
    for (const [id, text] of sec.items) {
      const { status, observation, value } = getStatus(id)
      p.checklistRow(id, text, status, observation, value)
    }
  }
  p._drawFooter()

  // ── PHOTO EVIDENCE PAGES ────────────────────────────────────
  // photoMap already built above

  // Collect all photos with labels
  const allPhotos = []

  // Form photos (fotoTorre, fotoCandado)
  const formPhotoFields = [
    { id: 'fotoTorre', label: 'Foto de la Torre' },
    { id: 'fotoGPS', label: 'Foto GPS' },
    { id: 'fotoCandado', label: 'Foto de Candado/Llave' },
  ]
  for (const fp of formPhotoFields) {
    const url = photoMap[fp.id] || photoMap[`maintenance:${fp.id}`]
    if (url) allPhotos.push({ label: fp.label, url })
  }

  // Checklist activity photos (maintenance:{activityId}:before/after)
  for (const key of Object.keys(photoMap)) {
    const m = key.match(/^maintenance:(.+):(before|after)$/)
    if (m) {
      const actId = m[1]
      const type = m[2]
      allPhotos.push({ label: `Actividad ${actId} - ${type === 'before' ? 'Antes' : 'Despues'}`, url: photoMap[key] })
    }
  }

  // Any other unmatched photos
  for (const key of Object.keys(photoMap)) {
    if (!key.startsWith('maintenance:') && !formPhotoFields.some(f => f.id === key)) {
      allPhotos.push({ label: key, url: photoMap[key] })
    }
  }

  if (allPhotos.length > 0) {
    p.newPage()
    p._miniHeader()
    p.sectionTitle('Evidencia Fotografica')

    // Draw photos in pairs (2 per row)
    for (let i = 0; i < allPhotos.length; i += 2) {
      const photoH = 180
      p.checkSpace(photoH + 22)
      const halfW = (CW - 8) / 2
      const hdrH = 14

      // Left photo
      const left = allPhotos[i]
      p.page.drawRectangle({ x: ML, y: p.y - hdrH, width: halfW, height: hdrH, color: C.dark })
      p.page.drawText(left.label, { x: ML + 6, y: p.y - hdrH + 4, size: 6, font: p.fontBold, color: C.white })
      p.page.drawRectangle({ x: ML, y: p.y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })

      try {
        const resp = await fetch(left.url)
        if (resp.ok) {
          const buf = new Uint8Array(await resp.arrayBuffer())
          let img
          try { img = (buf[0]===0xFF && buf[1]===0xD8) ? await p.doc.embedJpg(buf) : await p.doc.embedPng(buf) } catch { try { img = await p.doc.embedJpg(buf) } catch { img = null } }
          if (img) {
            const dims = img.scale(1)
            const sc = Math.min((halfW - 10) / dims.width, (photoH - 10) / dims.height)
            p.page.drawImage(img, { x: ML + (halfW - dims.width * sc) / 2, y: p.y - hdrH - photoH + (photoH - dims.height * sc) / 2, width: dims.width * sc, height: dims.height * sc })
          }
        }
      } catch {}

      // Right photo (if exists)
      if (i + 1 < allPhotos.length) {
        const right = allPhotos[i + 1]
        const rx = ML + halfW + 8
        p.page.drawRectangle({ x: rx, y: p.y - hdrH, width: halfW, height: hdrH, color: C.dark })
        p.page.drawText(right.label, { x: rx + 6, y: p.y - hdrH + 4, size: 6, font: p.fontBold, color: C.white })
        p.page.drawRectangle({ x: rx, y: p.y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })

        try {
          const resp = await fetch(right.url)
          if (resp.ok) {
            const buf = new Uint8Array(await resp.arrayBuffer())
            let img
            try { img = (buf[0]===0xFF && buf[1]===0xD8) ? await p.doc.embedJpg(buf) : await p.doc.embedPng(buf) } catch { try { img = await p.doc.embedJpg(buf) } catch { img = null } }
            if (img) {
              const dims = img.scale(1)
              const sc = Math.min((halfW - 10) / dims.width, (photoH - 10) / dims.height)
              p.page.drawImage(img, { x: rx + (halfW - dims.width * sc) / 2, y: p.y - hdrH - photoH + (photoH - dims.height * sc) / 2, width: dims.width * sc, height: dims.height * sc })
            }
          }
        } catch {}
      }

      p.y -= hdrH + photoH + 8
    }
    p._drawFooter()
  }

  return await p.doc.save()
}

export async function downloadMaintenancePdf(submission, assets = []) {
  const bytes = await generateMaintenancePdf(submission, assets)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const fd = submission?.payload?.payload?.data?.formData || submission?.payload?.data?.formData || {}
  const filename = `mantenimiento_preventivo_${fd.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
