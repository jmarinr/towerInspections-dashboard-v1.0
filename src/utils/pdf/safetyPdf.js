/**
 * PTI TeleInspect — Sistema de Ascenso PDF
 * Replica exacta del PDF de referencia PTI (ascenso_1_.pdf)
 *
 * PAGE 1 layout (por sección):
 *   [data col 60%] | [image col 38%]
 *   data col = header row + data rows + comentario row (con label rotado)
 *
 * PAGE 2: header mínimo + 3 pares de fotos + texto obs abajo
 */
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'
import { DIAGRAM_BIEN_MAL, DIAGRAM_WIRE_ROPE } from './safetyDiagrams'

const C = {
  black:  rgb(0.10, 0.10, 0.10),
  red:    rgb(0.87, 0.06, 0.06),
  white:  rgb(1,    1,    1),
  gray:   rgb(0.93, 0.93, 0.93),
  border: rgb(0.72, 0.72, 0.72),
  text:   rgb(0.10, 0.10, 0.10),
  light:  rgb(0.50, 0.50, 0.50),
}
const PW = 612, PH = 792, ML = 36, MR = 36, MT = 36
const CW = PW - ML - MR  // 540

async function fetchImg(doc, url) {
  if (!url) return null
  try {
    const r = await fetch(url); if (!r.ok) return null
    const b = new Uint8Array(await r.arrayBuffer())
    if (b[0]===0xFF&&b[1]===0xD8) return await doc.embedJpg(b)
    if (b[0]===0x89&&b[1]===0x50) return await doc.embedPng(b)
    try { return await doc.embedJpg(b) } catch { try { return await doc.embedPng(b) } catch { return null } }
  } catch { return null }
}

function stLabel(v) {
  const s = String(v||'').toLowerCase()
  if (s==='bueno'||s==='good') return 'Bueno'
  if (s==='regular') return 'Regular'
  if (s==='malo'||s==='bad') return 'Mal'
  return String(v||'')
}

export async function generateSafetyPdf(submission, assets=[]) {
  const doc  = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontB= await doc.embedFont(StandardFonts.HelveticaBold)

  let logo=null, diagBM=null, diagWR=null
  try { logo   = await doc.embedPng(Uint8Array.from(atob(PTI_LOGO_BASE64),  c=>c.charCodeAt(0))) } catch {}
  try { diagBM = await doc.embedJpg(Uint8Array.from(atob(DIAGRAM_BIEN_MAL), c=>c.charCodeAt(0))) } catch {}
  try { diagWR = await doc.embedJpg(Uint8Array.from(atob(DIAGRAM_WIRE_ROPE),c=>c.charCodeAt(0))) } catch {}

  // ── Data extraction ──────────────────────────────────────────
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
    for (const s of [datos,herrajes,prensacables,tramos,certificacion,data]) {
      const val = s?.[key]
      if (val && !String(val).startsWith('data:') && val!=='__photo__' && val!=='__photo_uploaded__') return String(val)
    }
    return ''
  }

  // ── Photo map ────────────────────────────────────────────────
  const photoMap = {}
  for (const a of (assets||[])) {
    if (a.public_url && a.asset_type) {
      photoMap[a.asset_type] = a.public_url
      const bare = a.asset_type.replace(/^(sistema-ascenso|safety-system|ascenso):/,'')
      if (bare!==a.asset_type) photoMap[bare] = a.public_url
    }
  }

  const imgEscalera      = await fetchImg(doc, photoMap['fotoEscalera']     || photoMap['escalera'])
  const imgCertificacion = await fetchImg(doc, photoMap['fotoCertificacion']|| photoMap['certificacion'])

  // ════════════════════════════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════════════════════════════
  let page = doc.addPage([PW, PH])
  let y = PH - MT

  // ── HEADER ───────────────────────────────────────────────────
  // Black bar: PHOENIX TOWER INTERNATIONAL
  page.drawRectangle({ x:ML, y:y-20, width:CW, height:20, color:C.black })
  page.drawText('PHOENIX TOWER INTERNATIONAL', {
    x: ML + CW/2 - fontB.widthOfTextAtSize('PHOENIX TOWER INTERNATIONAL',10)/2,
    y: y-14, size:10, font:fontB, color:C.white
  })
  y -= 22

  // Red bar: REPORTE DE SISTEMA DE ASCENSO
  page.drawRectangle({ x:ML, y:y-14, width:CW, height:14, color:C.red })
  page.drawText('REPORTE DE SISTEMA DE ASCENSO', {
    x: ML + CW/2 - fontB.widthOfTextAtSize('REPORTE DE SISTEMA DE ASCENSO',7.5)/2,
    y: y-11, size:7.5, font:fontB, color:C.white
  })
  y -= 16

  // Logo row
  const LR_H = 46
  page.drawRectangle({ x:ML, y:y-LR_H, width:CW, height:LR_H, borderColor:C.border, borderWidth:0.5 })
  if (logo) {
    const ld = logo.scale(0.18)
    const lw = Math.min(ld.width, 108), lh = Math.min(ld.height, 38)
    page.drawImage(logo, { x:ML+6, y:y-LR_H+(LR_H-lh)/2, width:lw, height:lh })
  }
  // Provider / visit lines with dots
  const PX = ML + 118
  page.drawText('Proveedor:', { x:PX, y:y-16, size:7.5, font:fontB, color:C.text })
  page.drawText(v('proveedor'), { x:PX+65, y:y-16, size:7.5, font, color:C.text })
  // dotted underline
  for (let dx=PX+65; dx<ML+CW-4; dx+=4) page.drawLine({
    start:{x:dx,y:y-18}, end:{x:dx+2,y:y-18}, thickness:0.5, color:C.border
  })
  page.drawText('Tipo de Visita', { x:PX, y:y-34, size:7.5, font:fontB, color:C.text })
  page.drawText(v('tipoVisita'), { x:PX+76, y:y-34, size:7.5, font, color:C.text })
  for (let dx=PX+76; dx<ML+CW-4; dx+=4) page.drawLine({
    start:{x:dx,y:y-36}, end:{x:dx+2,y:y-36}, thickness:0.5, color:C.border
  })
  // Red bottom stripe on logo row
  page.drawRectangle({ x:ML, y:y-LR_H-2, width:CW, height:2, color:C.red })
  y -= LR_H + 4

  // ── ESTADO FÍSICO ─────────────────────────────────────────────
  page.drawRectangle({ x:ML, y:y-16, width:CW, height:16, color:C.gray, borderColor:C.border, borderWidth:0.5 })
  page.drawText('ESTADO FÍSICO', {
    x: ML + CW/2 - fontB.widthOfTextAtSize('ESTADO FÍSICO',9)/2,
    y: y-12, size:9, font:fontB, color:C.text
  })
  y -= 18

  // Site info: 5 rows, 2-column
  const siteRow = (l1,v1,l2,v2) => {
    const h = 13
    page.drawRectangle({ x:ML, y:y-h, width:CW, height:h, borderColor:C.border, borderWidth:0.5 })
    // vertical divider
    page.drawLine({ start:{x:ML+CW/2,y}, end:{x:ML+CW/2,y:y-h}, thickness:0.4, color:C.border })
    // Left cell
    const l1W = fontB.widthOfTextAtSize(l1, 7)
    page.drawText(l1,  { x:ML+4,      y:y-h+4, size:7, font:fontB, color:C.text })
    page.drawText(String(v1||''), { x:ML+4+l1W+3, y:y-h+4, size:7, font, color:C.text })
    // Right cell
    const l2W = fontB.widthOfTextAtSize(l2, 7)
    page.drawText(l2,  { x:ML+CW/2+4, y:y-h+4, size:7, font:fontB, color:C.text })
    page.drawText(String(v2||''), { x:ML+CW/2+4+l2W+3, y:y-h+4, size:7, font, color:C.text })
    y -= h
  }
  siteRow('ID Sitio:',     v('idSitio'),      'Altura (Mts):', v('altura'))
  siteRow('Nombre Sitio:', v('nombreSitio'),  'Tipo Sitio:',   v('tipoSitio'))
  siteRow('Fecha Inicio:',  meta.startedAt||v('fechaInicio')||'', 'Tipo Estructura:', v('tipoEstructura'))
  siteRow('Fecha Termino:', meta.endedAt||v('fechaTermino')||'',  'Latitud:',  meta.lat?String(meta.lat):'')
  siteRow('Direccion:',    v('direccion'),    'Longitud:', meta.lng?String(meta.lng):'')
  y -= 12

  // ── Layout: DATA col left, IMG col right ──────────────────────
  // Exact proportions from reference PDF:
  const DATA_W = Math.round(CW * 0.608)  // ~328px  (left data column)
  const IMG_W  = Math.round(CW * 0.360)  // ~194px  (right image column)
  const GAP    = CW - DATA_W - IMG_W      // ~18px
  const IMG_X  = ML + DATA_W + GAP

  // Comentario strip width (left strip with rotated text)
  const CMNT_STRIP = 18

  // ── Helper: value badge (small bordered box with text) ────────
  const badge = (px, py, h, val, w=44) => {
    page.drawRectangle({ x:px, y:py-h+2, width:w, height:h-4, borderColor:C.border, borderWidth:0.7 })
    if (val) page.drawText(String(val), { x:px+4, y:py-h+5, size:7, font:fontB, color:C.text })
  }

  // ── Helper: right column image box ───────────────────────────
  const imgBox = (img, topY, totalH) => {
    page.drawRectangle({ x:IMG_X, y:topY-totalH, width:IMG_W, height:totalH, borderColor:C.border, borderWidth:0.5 })
    if (img) {
      const d = img.scale(1)
      const sc = Math.min((IMG_W-8)/d.width, (totalH-8)/d.height)
      page.drawImage(img, {
        x: IMG_X + (IMG_W - d.width*sc)/2,
        y: topY - totalH + (totalH - d.height*sc)/2,
        width: d.width*sc, height: d.height*sc
      })
    }
  }

  // ── Helper: comentario row with rotated label ─────────────────
  const comentarioRow = (text, h=36) => {
    // Strip with rotated "Comentario"
    page.drawRectangle({ x:ML, y:y-h, width:CMNT_STRIP, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText('Comentario', {
      x: ML + CMNT_STRIP - 4,
      y: y - h/2 - font.widthOfTextAtSize('Comentario',6)/2,
      size:6, font, color:C.light,
      rotate: degrees(90)
    })
    // Text area
    const TX = ML + CMNT_STRIP
    const TW = DATA_W - CMNT_STRIP
    page.drawRectangle({ x:TX, y:y-h, width:TW, height:h, borderColor:C.border, borderWidth:0.5 })
    if (text) {
      // simple wrap
      const maxW = TW - 12
      let words = String(text).split(' '), lines = [], cur = ''
      for (const w of words) {
        const test = cur ? cur+' '+w : w
        if (font.widthOfTextAtSize(test, 7) > maxW) { if(cur) lines.push(cur); cur=w } else cur=test
      }
      if (cur) lines.push(cur)
      lines.slice(0,3).forEach((ln,i) => {
        page.drawText(ln, { x:TX+8, y:y-14-i*10, size:7, font, color:C.text })
      })
    }
    y -= h
  }

  // ══════════════════════════════════════════════════════
  // SECTION 1 — HERRAJES
  // ══════════════════════════════════════════════════════
  const top1 = y

  // Section header
  {
    const h = 16
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText('1', { x:ML+6, y:y-h+5, size:8, font:fontB, color:C.text })
    page.drawText('HERRAJES', { x:ML+18, y:y-h+5, size:8, font:fontB, color:C.text })
    y -= h
  }

  // Row: HERRAJE INFERIOR [badge] ... DIAMETRO DEL CABLE [badge]
  {
    const h = 15
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    // divider at midpoint
    page.drawLine({ start:{x:ML+DATA_W/2,y}, end:{x:ML+DATA_W/2,y:y-h}, thickness:0.4, color:C.border })
    // Left
    page.drawText('HERRAJE INFERIOR', { x:ML+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+95, y, h, stLabel(herrajes.herrajeInferior))
    // Right
    page.drawText('DIAMETRO DEL CABLE', { x:ML+DATA_W/2+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+DATA_W/2+100, y, h, herrajes.diametroCable, 36)
    y -= h
  }

  // Row: HERRAJE SUPERIOR [badge] ... ESTADO DEL CABLE [badge]
  {
    const h = 15
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawLine({ start:{x:ML+DATA_W/2,y}, end:{x:ML+DATA_W/2,y:y-h}, thickness:0.4, color:C.border })
    page.drawText('HERRAJE SUPERIOR', { x:ML+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+95, y, h, stLabel(herrajes.herrajeSuperior))
    page.drawText('ESTADO DEL CABLE', { x:ML+DATA_W/2+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+DATA_W/2+94, y, h, stLabel(herrajes.estadoCable), 44)
    y -= h
  }

  // Comentario herrajes
  const cmtH1 = herrajes.comentarioHerrajeInferior||herrajes.comentarioCable||herrajes.comentarioOxidacion||''
  comentarioRow(cmtH1, 42)

  // Right image: BIEN/MAL diagram
  imgBox(diagBM, top1, top1 - y)
  y -= 10

  // ══════════════════════════════════════════════════════
  // SECTION 2 — PRENSACABLES
  // ══════════════════════════════════════════════════════
  const top2 = y

  {
    const h = 16
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText('2', { x:ML+6, y:y-h+5, size:8, font:fontB, color:C.text })
    page.drawText('PRENSACABLES', { x:ML+18, y:y-h+5, size:8, font:fontB, color:C.text })
    page.drawText('ACTUAL', { x:ML+DATA_W-42, y:y-h+5, size:7, font, color:C.light })
    y -= h
  }

  // CANTIDAD, DISTANCIAMIENTO, ESTADO — each single row with badge
  const presaRow = (label, val, isStatus=false) => {
    const h = 15
    const dispVal = isStatus ? stLabel(val) : String(val||'')
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W*0.52, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText(label, { x:ML+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+font.widthOfTextAtSize(label,6.5)+10, y, h, dispVal, 46)
    y -= h
  }
  presaRow('CANTIDAD',      prensacables.cantidadPrensacables)
  presaRow('DISTANCIAMIENTO', prensacables.distanciamiento)
  presaRow('ESTADO',        prensacables.estadoPrensacables, true)

  comentarioRow(prensacables.comentarioPrensacables||'', 42)

  imgBox(diagWR, top2, top2 - y)
  y -= 10

  // ══════════════════════════════════════════════════════
  // SECTION 3 — TRAMOS
  // ══════════════════════════════════════════════════════
  const top3 = y

  {
    const h = 16
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText('3', { x:ML+6, y:y-h+5, size:8, font:fontB, color:C.text })
    page.drawText('TRAMOS (escaleras)', { x:ML+18, y:y-h+5, size:8, font:fontB, color:C.text })
    page.drawText('ACTUAL', { x:ML+DATA_W-42, y:y-h+5, size:7, font, color:C.light })
    y -= h
  }

  // Row: CANTIDAD (tramos) [badge] | ESTADO ESCALERA [badge]
  {
    const h = 15
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawLine({ start:{x:ML+DATA_W/2,y}, end:{x:ML+DATA_W/2,y:y-h}, thickness:0.4, color:C.border })
    page.drawText('CANTIDAD (tramos)', { x:ML+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+93, y, h, tramos.cantidadTramos, 32)
    page.drawText('ESTADO ESCALERA', { x:ML+DATA_W/2+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+DATA_W/2+88, y, h, stLabel(tramos.estadoEscalera), 46)
    y -= h
  }

  // Row: CANTIDAD (uniones) [badge] | TRAMOS DAÑADOS [badge]
  {
    const h = 15
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawLine({ start:{x:ML+DATA_W/2,y}, end:{x:ML+DATA_W/2,y:y-h}, thickness:0.4, color:C.border })
    page.drawText('CANTIDAD (uniones)', { x:ML+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+95, y, h, tramos.cantidadUniones, 32)
    page.drawText('TRAMOS DAÑADOS', { x:ML+DATA_W/2+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+DATA_W/2+84, y, h, tramos.tramosDañados||tramos.tramosDanados||'No', 32)
    y -= h
  }

  // Row: DIAMETRO TORNILLO [badge]
  {
    const h = 15
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W*0.52, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText('DIAMETRO TORNILLO', { x:ML+4, y:y-h+4, size:6.5, font, color:C.text })
    badge(ML+97, y, h, tramos.diametroTornillo, 32)
    y -= h
  }

  comentarioRow(tramos.comentarioEscalera||tramos.comentarioTornillos||'', 42)

  // Right: inspector photo (empty box = placeholder until app sends photo)
  imgBox(imgEscalera, top3, top3 - y)
  y -= 10

  // ══════════════════════════════════════════════════════
  // CERTIFICACIÓN
  // ══════════════════════════════════════════════════════
  const top4 = y

  {
    const h = 16
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText('2', { x:ML+6, y:y-h+5, size:8, font:fontB, color:C.text })
    page.drawText('CERTIFICACIÓN', { x:ML+18, y:y-h+5, size:8, font:fontB, color:C.text })
    page.drawText('ACTUAL', { x:ML+DATA_W-42, y:y-h+5, size:7, font, color:C.light })
    y -= h
  }

  // SI / NO checkboxes
  {
    const h = 34
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    const cv = (certificacion.tieneCertificacion||'').toLowerCase()
    const isSi = cv==='si'||cv==='sí'||cv==='yes'
    // SI
    page.drawText('SI', { x:ML+16, y:y-h+14, size:8, font, color:C.text })
    page.drawRectangle({ x:ML+30, y:y-h+8, width:16, height:14, borderColor:C.border, borderWidth:0.8 })
    if (isSi) page.drawText('X', { x:ML+35, y:y-h+10, size:9, font:fontB, color:C.text })
    // NO
    page.drawText('NO', { x:ML+80, y:y-h+14, size:8, font, color:C.text })
    page.drawRectangle({ x:ML+97, y:y-h+8, width:16, height:14, borderColor:C.border, borderWidth:0.8 })
    if (!isSi) page.drawText('X', { x:ML+101, y:y-h+10, size:9, font:fontB, color:C.text })
    y -= h
  }

  // Right: inspector photo (empty until uploaded)
  imgBox(imgCertificacion, top4, top4 - y)

  // Footer p1
  page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
    { x:ML, y:16, size:5.5, font, color:C.light })
  page.drawText('Página 1',
    { x:PW-MR-font.widthOfTextAtSize('Página 1',5.5), y:16, size:5.5, font, color:C.light })

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — Photo evidence
  // ════════════════════════════════════════════════════════════
  page = doc.addPage([PW, PH])
  y = PH - MT

  // Minimal header matching reference page 2
  // Red top line
  page.drawRectangle({ x:ML, y:y-4, width:CW, height:4, color:C.red })
  y -= 6

  // "ESTADO FÍSICO" centered label
  page.drawRectangle({ x:ML, y:y-16, width:CW, height:16, color:C.gray, borderColor:C.border, borderWidth:0.5 })
  page.drawText('ESTADO FÍSICO', {
    x: ML+CW/2 - fontB.widthOfTextAtSize('ESTADO FÍSICO',9)/2,
    y: y-12, size:9, font:fontB, color:C.text
  })
  y -= 20

  // 3 fixed photo pairs
  const pairs = [
    { left:'HERRAJE INFERIOR',      leftId:'fotoHerrajeInferior',
      right:'HERRAJE SUPERIOR',     rightId:'fotoHerrajeSuperior' },
    { left:'PRENSACABLE SUPERIOR',  leftId:'fotoPrensacableSuperior',
      right:'PRENSACABLE INFERIOR', rightId:'fotoPrensacableInferior' },
    { left:'TIPO DE CARRO',         leftId:'fotoCarro',
      right:'OBSERVACIÓN UNIÓN (Tramos)', rightId:'fotoUnion' },
  ]

  // Extra photos not covered above
  const fixedIds = new Set(pairs.flatMap(p=>[p.leftId,p.rightId]))
  const extras = []
  for (const [key, url] of Object.entries(photoMap)) {
    if (!fixedIds.has(key) && key!=='fotoCertificacion' && key!=='fotoEscalera') {
      extras.push({ label: key.replace(/^foto/,'').replace(/([A-Z])/g,' $1').trim().toUpperCase(), id: key })
    }
  }
  for (let i=0; i<extras.length; i+=2) {
    pairs.push({ left:extras[i].label, leftId:extras[i].id,
      right:extras[i+1]?.label||null, rightId:extras[i+1]?.id||null })
  }

  const HW = (CW - 6) / 2   // half width for each photo box
  const HDR_H = 18           // photo label header height
  const PHO_H = 188          // photo area height

  for (const pair of pairs) {
    if (y - HDR_H - PHO_H < 60) {
      page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
        { x:ML, y:16, size:5.5, font, color:C.light })
      page = doc.addPage([PW,PH]); y = PH - MT
    }

    // Left photo
    page.drawRectangle({ x:ML, y:y-HDR_H, width:HW, height:HDR_H, color:C.black })
    page.drawText(pair.left||'', {
      x: ML+6, y:y-HDR_H+6, size:7, font:fontB, color:C.white
    })
    page.drawRectangle({ x:ML, y:y-HDR_H-PHO_H, width:HW, height:PHO_H, borderColor:C.border, borderWidth:0.5 })
    if (pair.leftId) {
      const img = await fetchImg(doc, photoMap[pair.leftId])
      if (img) {
        const d=img.scale(1), sc=Math.min((HW-8)/d.width,(PHO_H-8)/d.height)
        page.drawImage(img, { x:ML+(HW-d.width*sc)/2, y:y-HDR_H-PHO_H+(PHO_H-d.height*sc)/2, width:d.width*sc, height:d.height*sc })
      }
    }

    // Right photo
    if (pair.right) {
      const RX = ML + HW + 6
      page.drawRectangle({ x:RX, y:y-HDR_H, width:HW, height:HDR_H, color:C.black })
      page.drawText(pair.right||'', { x:RX+6, y:y-HDR_H+6, size:7, font:fontB, color:C.white })
      page.drawRectangle({ x:RX, y:y-HDR_H-PHO_H, width:HW, height:PHO_H, borderColor:C.border, borderWidth:0.5 })
      if (pair.rightId) {
        const img = await fetchImg(doc, photoMap[pair.rightId])
        if (img) {
          const d=img.scale(1), sc=Math.min((HW-8)/d.width,(PHO_H-8)/d.height)
          page.drawImage(img, { x:RX+(HW-d.width*sc)/2, y:y-HDR_H-PHO_H+(PHO_H-d.height*sc)/2, width:d.width*sc, height:d.height*sc })
        }
      }
    }
    y -= HDR_H + PHO_H + 8
  }

  // Observation text + empty box at bottom (matching reference)
  if (y > 60) {
    const OBS_H = 44
    const obs = certificacion.observacionCertificacion||herrajes.comentarioCable||''
    // Left: text
    page.drawRectangle({ x:ML, y:y-OBS_H, width:HW, height:OBS_H, borderColor:C.border, borderWidth:0.5 })
    if (obs) {
      const maxW = HW - 14
      let words=String(obs).split(' '), lines=[], cur=''
      for(const w of words){ const t=cur?cur+' '+w:w; if(font.widthOfTextAtSize(t,7)>maxW){if(cur)lines.push(cur);cur=w}else cur=t }
      if(cur)lines.push(cur)
      lines.slice(0,3).forEach((ln,i)=>page.drawText(ln,{x:ML+8,y:y-14-i*11,size:7,font,color:C.text}))
    }
    // Right: empty
    page.drawRectangle({ x:ML+HW+6, y:y-OBS_H, width:HW, height:OBS_H, borderColor:C.border, borderWidth:0.5 })
  }

  page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
    { x:ML, y:16, size:5.5, font, color:C.light })
  page.drawText('Página 2',
    { x:PW-MR-font.widthOfTextAtSize('Página 2',5.5), y:16, size:5.5, font, color:C.light })

  return await doc.save()
}

export async function downloadSafetyPdf(submission, assets=[]) {
  const bytes = await generateSafetyPdf(submission, assets)
  const blob  = new Blob([bytes], { type:'application/pdf' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href = url
  const d = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const datos = d.datos||d.formData||d
  a.download = `ascenso_${datos.idSitio||submission?.id?.slice(0,8)||'report'}.pdf`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
