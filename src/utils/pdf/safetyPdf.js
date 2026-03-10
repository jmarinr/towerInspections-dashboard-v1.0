/**
 * PTI TeleInspect - Safety Climbing Device (Sistema de Ascenso) PDF Report
 * Replicates the PTI reference PDF exactly:
 *   Page 1: Header + ESTADO FÍSICO (site info) + sections Herrajes, Prensacables,
 *            Tramos, Certificación — data left col, photo right col
 *   Page 2: ESTADO FÍSICO photo grid (pairs: Herraje Inf/Sup, Prensacable Sup/Inf,
 *            Tipo de Carro / Observación Unión, + observation text box)
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'

const C = {
  black:      rgb(0.1,  0.1,  0.1),
  red:        rgb(0.9,  0,    0),
  white:      rgb(1,    1,    1),
  gray:       rgb(0.94, 0.94, 0.94),
  border:     rgb(0.75, 0.75, 0.75),
  borderDark: rgb(0.5,  0.5,  0.5),
  text:       rgb(0.12, 0.12, 0.12),
  textLight:  rgb(0.45, 0.45, 0.45),
  good:       rgb(0.15, 0.68, 0.38),
  goodBg:     rgb(0.91, 0.96, 0.91),
  regular:    rgb(0.85, 0.55, 0.05),
  regularBg:  rgb(1,    0.97, 0.88),
  bad:        rgb(0.85, 0.25, 0.2),
  badBg:      rgb(0.99, 0.89, 0.89),
}

const PW = 612, PH = 792, ML = 36, MR = 36, MT = 36, CW = PW - ML - MR

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

function statusLabel(val) {
  if (!val) return ''
  const s = String(val).toLowerCase()
  if (s === 'bueno' || s === 'good') return 'Bueno'
  if (s === 'regular') return 'Regular'
  if (s === 'malo' || s === 'bad') return 'Mal'
  return String(val)
}

function statusColor(val) {
  const s = String(val || '').toLowerCase()
  if (s === 'bueno' || s === 'good') return { bg: C.goodBg, text: C.good }
  if (s === 'regular') return { bg: C.regularBg, text: C.regular }
  if (s === 'malo' || s === 'bad') return { bg: C.badBg, text: C.bad }
  return null
}

export async function generateSafetyPdf(submission, assets = []) {
  const doc   = await PDFDocument.create()
  const font  = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  let logo = null
  try { logo = await doc.embedPng(Uint8Array.from(atob(PTI_LOGO_BASE64), c => c.charCodeAt(0))) } catch {}

  const payload       = submission?.payload || submission || {}
  const inner         = payload?.payload || payload
  const data          = inner?.data || inner || {}
  const meta          = inner?.meta || {}
  const datos         = data.datos        || data.formData || data
  const herrajes      = data.herrajes     || {}
  const prensacables  = data.prensacables || {}
  const tramos        = data.tramos       || {}
  const certificacion = data.certificacion|| {}

  const v = (key) => {
    for (const s of [datos, herrajes, prensacables, tramos, certificacion, data]) {
      const val = s?.[key]
      if (val && !String(val).startsWith('data:') && val !== '__photo__' && val !== '__photo_uploaded__') return String(val)
    }
    return ''
  }

  const photoMap = {}
  for (const a of (assets || [])) {
    if (a.public_url && a.asset_type) {
      photoMap[a.asset_type] = a.public_url
      const bare = a.asset_type.replace(/^(sistema-ascenso|safety-system|ascenso):/, '')
      if (bare !== a.asset_type) photoMap[bare] = a.public_url
    }
  }

  // Pre-fetch right-column images for page 1
  const imgHerrajeInf  = await fetchImg(doc, photoMap['fotoHerrajeInferior']      || photoMap['herrajeInferior'])
  const imgHerrajeSup  = await fetchImg(doc, photoMap['fotoHerrajeSuperior']      || photoMap['herrajeSuperior'])
  const imgPrensaSup   = await fetchImg(doc, photoMap['fotoPrensacableSuperior']  || photoMap['prensacableSuperior'])
  const imgPrensaInf   = await fetchImg(doc, photoMap['fotoPrensacableInferior']  || photoMap['prensacableInferior'])
  const imgEscalera    = await fetchImg(doc, photoMap['fotoEscalera']             || photoMap['escalera'])
  const imgCertificacion = await fetchImg(doc, photoMap['fotoCertificacion']      || photoMap['certificacion'])

  // ── PAGE 1 ───────────────────────────────────────────────────
  let page = doc.addPage([PW, PH])
  let y = PH - MT

  // Full header
  page.drawRectangle({ x: ML, y: y - 18, width: CW, height: 18, color: C.black })
  page.drawText('PHOENIX TOWER INTERNATIONAL', { x: ML + CW / 2 - 75, y: y - 13, size: 9, font: fontB, color: C.white })
  y -= 20
  page.drawRectangle({ x: ML, y: y - 13, width: CW, height: 13, color: C.red })
  page.drawText('REPORTE DE SISTEMA DE ASCENSO', { x: ML + CW / 2 - 72, y: y - 10, size: 7, font: fontB, color: C.white })
  y -= 15

  // Logo + provider/visit row
  const lrH = 42
  page.drawRectangle({ x: ML, y: y - lrH, width: CW, height: lrH, borderColor: C.border, borderWidth: 0.5 })
  if (logo) {
    const ld = logo.scale(0.17)
    page.drawImage(logo, { x: ML + 6, y: y - lrH + (lrH - Math.min(ld.height, 34)) / 2, width: Math.min(ld.width, 100), height: Math.min(ld.height, 34) })
  }
  const fX = ML + 115
  page.drawText('Proveedor:', { x: fX, y: y - 16, size: 7, font: fontB, color: C.text })
  page.drawText(v('proveedor'), { x: fX + 62, y: y - 16, size: 7, font, color: C.text })
  for (let dx = fX + 62; dx < ML + CW * 0.65; dx += 3) page.drawText('.', { x: dx, y: y - 18, size: 5, font, color: C.border })
  page.drawText('Tipo de Visita', { x: fX, y: y - 32, size: 7, font: fontB, color: C.text })
  page.drawText(v('tipoVisita'), { x: fX + 72, y: y - 32, size: 7, font, color: C.text })
  for (let dx = fX + 72; dx < ML + CW * 0.65; dx += 3) page.drawText('.', { x: dx, y: y - 34, size: 5, font, color: C.border })
  page.drawRectangle({ x: ML, y: y - lrH - 1.5, width: CW, height: 1.5, color: C.red })
  y -= lrH + 4

  // ESTADO FÍSICO
  page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 14, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('ESTADO FÍSICO', { x: ML + CW / 2 - 32, y: y - 11, size: 8, font: fontB, color: C.text })
  y -= 16

  // Site info rows
  const siteRow = (l1, v1, l2, v2) => {
    const h = 13, half = CW / 2
    page.drawRectangle({ x: ML, y: y - h, width: CW, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawLine({ start: { x: ML + half, y }, end: { x: ML + half, y: y - h }, thickness: 0.4, color: C.border })
    page.drawText(l1, { x: ML + 4, y: y - h + 4, size: 6.5, font: fontB, color: C.text })
    page.drawText(String(v1 || ''), { x: ML + 4 + fontB.widthOfTextAtSize(l1, 6.5) + 4, y: y - h + 4, size: 6.5, font, color: C.text })
    page.drawText(l2, { x: ML + half + 4, y: y - h + 4, size: 6.5, font: fontB, color: C.text })
    page.drawText(String(v2 || ''), { x: ML + half + 4 + fontB.widthOfTextAtSize(l2, 6.5) + 4, y: y - h + 4, size: 6.5, font, color: C.text })
    y -= h
  }
  siteRow('ID Sitio:', v('idSitio'),     'Altura (Mts):', v('altura'))
  siteRow('Nombre Sitio:', v('nombreSitio'), 'Tipo Sitio:', v('tipoSitio'))
  siteRow('Fecha Inicio:', meta.startedAt || v('fechaInicio') || '',  'Tipo Estructura:', v('tipoEstructura'))
  siteRow('Fecha Termino:', meta.endedAt || v('fechaTermino') || '', 'Latitud:', meta.lat ? String(meta.lat) : '')
  siteRow('Direccion:', v('direccion'), 'Longitud:', meta.lng ? String(meta.lng) : '')
  y -= 10

  // Layout constants for sections
  const DATA_COL = CW * 0.60
  const IMG_COL  = CW * 0.38
  const GAP      = CW - DATA_COL - IMG_COL

  const drawSecHeader = (num, title, badge) => {
    const h = 14
    page.drawRectangle({ x: ML, y: y - h, width: DATA_COL, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawText(`${num}   ${title}`, { x: ML + 4, y: y - h + 4, size: 7, font: fontB, color: C.text })
    if (badge) page.drawText(badge, { x: ML + DATA_COL - 50, y: y - h + 4, size: 6, font, color: C.textLight })
    y -= h
  }

  const drawRow2 = (l1, v1, l2, v2, isS1, isS2) => {
    const h = 13, half = DATA_COL / 2
    page.drawRectangle({ x: ML, y: y - h, width: DATA_COL, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawLine({ start: { x: ML + half, y }, end: { x: ML + half, y: y - h }, thickness: 0.4, color: C.border })
    page.drawText(l1, { x: ML + 4, y: y - h + 4, size: 6, font, color: C.text })
    if (v1) {
      const lbl1 = isS1 ? statusLabel(v1) : String(v1)
      const sc1  = isS1 ? statusColor(v1) : null
      const vx1  = ML + 88
      if (sc1) page.drawRectangle({ x: vx1 - 2, y: y - h + 1, width: fontB.widthOfTextAtSize(lbl1, 6.5) + 8, height: h - 2, color: sc1.bg })
      page.drawText(lbl1, { x: vx1, y: y - h + 4, size: 6.5, font: isS1 ? fontB : font, color: sc1?.text || C.text })
    }
    if (l2) {
      page.drawText(l2, { x: ML + half + 4, y: y - h + 4, size: 6, font, color: C.text })
      if (v2) {
        const lbl2 = isS2 ? statusLabel(v2) : String(v2)
        const sc2  = isS2 ? statusColor(v2) : null
        const vx2  = ML + half + 100
        if (sc2) page.drawRectangle({ x: vx2 - 2, y: y - h + 1, width: fontB.widthOfTextAtSize(lbl2, 6.5) + 8, height: h - 2, color: sc2.bg })
        page.drawText(lbl2, { x: vx2, y: y - h + 4, size: 6.5, font: isS2 ? fontB : font, color: sc2?.text || C.text })
      }
    }
    y -= h
  }

  const drawRow1 = (label, value, isStatus) => {
    const h = 13
    page.drawRectangle({ x: ML, y: y - h, width: DATA_COL, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawText(label, { x: ML + 4, y: y - h + 4, size: 6, font, color: C.text })
    if (value) {
      const lbl = isStatus ? statusLabel(value) : String(value)
      const sc  = isStatus ? statusColor(value)  : null
      const vx  = ML + 100
      if (sc) page.drawRectangle({ x: vx - 2, y: y - h + 1, width: fontB.widthOfTextAtSize(lbl, 6.5) + 8, height: h - 2, color: sc.bg })
      page.drawText(lbl, { x: vx, y: y - h + 4, size: 6.5, font: isStatus ? fontB : font, color: sc?.text || C.text })
    }
    y -= h
  }

  const drawComment = (text) => {
    if (!text) return
    const h = 28
    page.drawRectangle({ x: ML, y: y - h, width: DATA_COL, height: h, borderColor: C.border, borderWidth: 0.5 })
    page.drawText('Comentario', { x: ML + 4, y: y - 9, size: 5, font: fontB, color: C.textLight })
    const maxW = DATA_COL - 16
    let remaining = String(text), line1 = remaining, line2 = ''
    while (font.widthOfTextAtSize(line1, 6) > maxW && line1.includes(' ')) {
      const sp = line1.lastIndexOf(' ')
      line2 = line1.slice(sp + 1) + (line2 ? ' ' + line2 : '')
      line1 = line1.slice(0, sp)
    }
    page.drawText(line1.slice(0, 90), { x: ML + 10, y: y - 19, size: 6, font, color: C.text })
    if (line2) page.drawText(line2.slice(0, 90), { x: ML + 10, y: y - 26, size: 6, font, color: C.text })
    y -= h
  }

  const drawRightImg = (img, topY, imgH, label) => {
    const ix = ML + DATA_COL + GAP
    page.drawRectangle({ x: ix, y: topY - imgH, width: IMG_COL, height: imgH, borderColor: C.border, borderWidth: 0.5 })
    if (img) {
      const d = img.scale(1)
      const sc = Math.min((IMG_COL - 8) / d.width, (imgH - 8) / d.height)
      page.drawImage(img, {
        x: ix + (IMG_COL - d.width * sc) / 2,
        y: topY - imgH + (imgH - d.height * sc) / 2,
        width: d.width * sc, height: d.height * sc,
      })
    }
    if (label) page.drawText(label, { x: ix + 4, y: topY - imgH + 3, size: 5, font, color: C.textLight })
  }

  // ── 1. HERRAJES ───────────────────────────────────────────────
  const herrajesTop = y
  drawSecHeader('1', 'HERRAJES')
  drawRow2('HERRAJE INFERIOR', herrajes.herrajeInferior,  'DIAMETRO DEL CABLE', herrajes.diametroCable,  true,  false)
  drawRow2('HERRAJE SUPERIOR', herrajes.herrajeSuperior,  'ESTADO DEL CABLE',   herrajes.estadoCable,   true,  true)
  drawComment(herrajes.comentarioHerrajeInferior || herrajes.comentarioCable || herrajes.comentarioOxidacion)
  const herrajesH = herrajesTop - y
  const halfHH = herrajesH / 2
  drawRightImg(imgHerrajeInf, herrajesTop, halfHH, 'BIEN')
  drawRightImg(imgHerrajeSup, herrajesTop - halfHH, halfHH, 'MAL')
  y -= 8

  // ── 2. PRENSACABLES ───────────────────────────────────────────
  const presaTop = y
  drawSecHeader('2', 'PRENSACABLES', 'ACTUAL')
  drawRow1('CANTIDAD',       prensacables.cantidadPrensacables)
  drawRow1('DISTANCIAMIENTO', prensacables.distanciamiento)
  drawRow1('ESTADO',         prensacables.estadoPrensacables, true)
  drawComment(prensacables.comentarioPrensacables)
  const presaH = presaTop - y
  const halfPH = presaH / 2
  drawRightImg(imgPrensaSup, presaTop, halfPH, 'Correct method of fitting wire rope grips.')
  drawRightImg(imgPrensaInf, presaTop - halfPH, halfPH, 'Incorrect method of fitting wire rope grips')
  y -= 8

  // ── 3. TRAMOS ─────────────────────────────────────────────────
  const tramosTop = y
  drawSecHeader('3', 'TRAMOS (escaleras)', 'ACTUAL')
  drawRow2('CANTIDAD (tramos)',  tramos.cantidadTramos,   'ESTADO ESCALERA', tramos.estadoEscalera,                       false, true)
  drawRow2('CANTIDAD (uniones)', tramos.cantidadUniones,  'TRAMOS DAÑADOS',  tramos.tramosDañados || tramos.tramosDanados || 'No', false, false)
  drawRow1('DIAMETRO TORNILLO', tramos.diametroTornillo)
  drawComment(tramos.comentarioEscalera || tramos.comentarioTornillos)
  drawRightImg(imgEscalera, tramosTop, tramosTop - y)
  y -= 8

  // ── CERTIFICACIÓN ─────────────────────────────────────────────
  const certTop = y
  drawSecHeader('2', 'CERTIFICACIÓN', 'ACTUAL')
  const certH2 = 22
  page.drawRectangle({ x: ML, y: y - certH2, width: DATA_COL, height: certH2, borderColor: C.border, borderWidth: 0.5 })
  const certVal = (certificacion.tieneCertificacion || '').toLowerCase()
  const certSi  = certVal === 'si' || certVal === 'sí' || certVal === 'yes'
  page.drawText('SI', { x: ML + 20, y: y - certH2 + 8, size: 7, font, color: C.text })
  page.drawRectangle({ x: ML + 36, y: y - certH2 + 5, width: 14, height: 11, borderColor: C.borderDark, borderWidth: 0.8 })
  if (certSi) page.drawText('X', { x: ML + 40, y: y - certH2 + 6, size: 8, font: fontB, color: C.text })
  page.drawText('NO', { x: ML + 68, y: y - certH2 + 8, size: 7, font, color: C.text })
  page.drawRectangle({ x: ML + 86, y: y - certH2 + 5, width: 14, height: 11, borderColor: C.borderDark, borderWidth: 0.8 })
  if (!certSi) page.drawText('X', { x: ML + 90, y: y - certH2 + 6, size: 8, font: fontB, color: C.text })
  y -= certH2
  drawRightImg(imgCertificacion, certTop, certTop - y)

  page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso', { x: ML, y: 16, size: 5.5, font, color: C.textLight })
  page.drawText('Página 1', { x: PW - MR - font.widthOfTextAtSize('Página 1', 5.5), y: 16, size: 5.5, font, color: C.textLight })

  // ── PAGE 2: PHOTO EVIDENCE ───────────────────────────────────
  page = doc.addPage([PW, PH])
  y = PH - MT

  page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 14, color: C.black })
  if (logo) { const ld = logo.scale(0.06); page.drawImage(logo, { x: ML + 4, y: y - 12, width: Math.min(ld.width, 36), height: Math.min(ld.height, 10) }) }
  page.drawText('PHOENIX TOWER INTERNATIONAL', { x: ML + 44, y: y - 10, size: 6.5, font: fontB, color: C.white })
  y -= 16
  page.drawRectangle({ x: ML, y: y - 9, width: CW, height: 9, color: C.red })
  page.drawText('REPORTE DE SISTEMA DE ASCENSO', { x: ML + 6, y: y - 7, size: 5.5, font: fontB, color: C.white })
  y -= 13

  page.drawRectangle({ x: ML, y: y - 14, width: CW, height: 14, color: C.gray, borderColor: C.border, borderWidth: 0.5 })
  page.drawText('ESTADO FÍSICO', { x: ML + CW / 2 - 30, y: y - 11, size: 7, font: fontB, color: C.text })
  y -= 18

  // Exactly 3 fixed pairs matching PTI reference PDF
  const photoPairs = [
    { left:  { label: 'HERRAJE INFERIOR',            url: photoMap['fotoHerrajeInferior']     || photoMap['herrajeInferior'] },
      right: { label: 'HERRAJE SUPERIOR',            url: photoMap['fotoHerrajeSuperior']     || photoMap['herrajeSuperior'] } },
    { left:  { label: 'PRENSACABLE SUPERIOR',        url: photoMap['fotoPrensacableSuperior'] || photoMap['prensacableSuperior'] },
      right: { label: 'PRENSACABLE INFERIOR',        url: photoMap['fotoPrensacableInferior'] || photoMap['prensacableInferior'] } },
    { left:  { label: 'TIPO DE CARRO',               url: photoMap['fotoCarro']               || photoMap['tipoCarro'] },
      right: { label: 'OBSERVACIÓN UNIÓN (Tramos)',  url: photoMap['fotoUnion']               || photoMap['observacionUnion'] || photoMap['fotoEscalera'] } },
  ]

  // Any extra assets not covered above
  const usedUrls = new Set(photoPairs.flatMap(p => [p.left.url, p.right.url]).filter(Boolean))
  const extraPhotos = []
  for (const [key, url] of Object.entries(photoMap)) {
    if (url && !usedUrls.has(url) && key !== 'fotoCertificacion' && key !== 'certificacion') {
      extraPhotos.push({ label: key.replace(/^foto/, '').replace(/([A-Z])/g, ' $1').trim().toUpperCase(), url })
      usedUrls.add(url)
    }
  }
  for (let i = 0; i < extraPhotos.length; i += 2) {
    photoPairs.push({ left: extraPhotos[i], right: extraPhotos[i + 1] || null })
  }

  const halfW  = (CW - 8) / 2
  const hdrH   = 16
  const photoH = 170

  for (const pair of photoPairs) {
    if (y - hdrH - photoH < 50) {
      page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso', { x: ML, y: 16, size: 5.5, font, color: C.textLight })
      page = doc.addPage([PW, PH]); y = PH - MT
    }

    // Left
    page.drawRectangle({ x: ML, y: y - hdrH, width: halfW, height: hdrH, color: C.black })
    page.drawText(pair.left.label || '', { x: ML + 6, y: y - hdrH + 5, size: 6.5, font: fontB, color: C.white })
    page.drawRectangle({ x: ML, y: y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })
    if (pair.left.url) {
      const img = await fetchImg(doc, pair.left.url)
      if (img) { const d = img.scale(1), sc = Math.min((halfW-10)/d.width,(photoH-10)/d.height); page.drawImage(img, { x: ML+(halfW-d.width*sc)/2, y: y-hdrH-photoH+(photoH-d.height*sc)/2, width: d.width*sc, height: d.height*sc }) }
    }

    // Right
    if (pair.right) {
      const rx = ML + halfW + 8
      page.drawRectangle({ x: rx, y: y - hdrH, width: halfW, height: hdrH, color: C.black })
      page.drawText(pair.right.label || '', { x: rx + 6, y: y - hdrH + 5, size: 6.5, font: fontB, color: C.white })
      page.drawRectangle({ x: rx, y: y - hdrH - photoH, width: halfW, height: photoH, borderColor: C.border, borderWidth: 0.5 })
      if (pair.right.url) {
        const img = await fetchImg(doc, pair.right.url)
        if (img) { const d = img.scale(1), sc = Math.min((halfW-10)/d.width,(photoH-10)/d.height); page.drawImage(img, { x: rx+(halfW-d.width*sc)/2, y: y-hdrH-photoH+(photoH-d.height*sc)/2, width: d.width*sc, height: d.height*sc }) }
      }
    }
    y -= hdrH + photoH + 8
  }

  // Observation text box matching bottom of PTI reference page 2
  const obs = certificacion.observacionCertificacion || herrajes.comentarioCable || ''
  if (y > 55) {
    const obsH = 42
    page.drawRectangle({ x: ML, y: y - obsH, width: halfW, height: obsH, borderColor: C.border, borderWidth: 0.5 })
    if (obs) {
      let txt = String(obs), ln1 = txt, ln2 = ''
      const maxW = halfW - 14
      while (font.widthOfTextAtSize(ln1, 6) > maxW && ln1.includes(' ')) { const sp = ln1.lastIndexOf(' '); ln2 = ln1.slice(sp+1)+(ln2?' '+ln2:''); ln1 = ln1.slice(0,sp) }
      page.drawText(ln1.slice(0,85), { x: ML+6, y: y-15, size: 6, font, color: C.text })
      if (ln2) page.drawText(ln2.slice(0,85), { x: ML+6, y: y-23, size: 6, font, color: C.text })
    }
    page.drawRectangle({ x: ML+halfW+8, y: y-obsH, width: halfW, height: obsH, borderColor: C.border, borderWidth: 0.5 })
  }

  page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso', { x: ML, y: 16, size: 5.5, font, color: C.textLight })
  page.drawText('Página 2', { x: PW - MR - font.widthOfTextAtSize('Página 2', 5.5), y: 16, size: 5.5, font, color: C.textLight })

  return await doc.save()
}

export async function downloadSafetyPdf(submission, assets = []) {
  const bytes = await generateSafetyPdf(submission, assets)
  const blob  = new Blob([bytes], { type: 'application/pdf' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href = url
  const d     = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const datos = d.datos || d.formData || d
  a.download  = `ascenso_${datos.idSitio || submission?.id?.slice(0, 8) || 'report'}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
