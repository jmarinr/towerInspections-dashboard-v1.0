/**
 * PTI TeleInspect — Sistema de Ascenso PDF
 * Replica exacta del PDF de referencia PTI (ascenso_1_.pdf)
 *
 * Medidas derivadas de análisis pixel de la imagen de referencia:
 *  - DATA_W = 332pts, IMG_W = 194pts, GAP = 14pts
 *  - Badge col izq: ML+109, Badge col der: ML+274
 *  - Row height: 22pts, Comentario: 50pts
 *  - Sin divisor vertical en las filas — labels y badges libres
 *  - Section headers: texto plano sin caja
 *  - Página 2: solo línea roja + "ESTADO FÍSICO"
 */
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import { PTI_LOGO_BASE64 } from './ptiLogo'
import { DIAGRAM_COMBINED } from './safetyDiagrams'

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

// ── Text sanitizer — removes chars WinAnsi/pdf-lib can't encode ──────────────
// Strips: control chars (\n \r \t 0x00-0x1F), chars outside latin-1 range
const s = (val) => {
  if (val == null) return ''
  return String(val)
    .replace(/[\x00-\x1F\x7F]/g, ' ')   // control chars → space
    .replace(/[\u0100-\uFFFF]/g, (c) => { // non-latin1: try common replacements
      const map = { 'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n','ä':'a','ö':'o',
                    'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ü':'U','Ñ':'N',
                    '\u2019':"'",'–':'-','—':'-','\u201C':'"','\u201D':'"','\u2026':'...' }
      return map[c] || ''
    })
    .trim()
}

// ── Column layout (pixel-exact from reference PDF) ───────────
const DATA_W  = 313   // left data column width
const IMG_W   = 194   // right image column width
const IMG_GAP = CW - DATA_W - IMG_W   // gap between cols
const IMG_X   = ML + DATA_W + IMG_GAP

// Badge positions within data column (measured from reference)
const BADGE_L  = 93    // left badge x offset from ML
const BADGE_LW = 50    // left badge width
const BADGE_R  = 242   // right badge x offset from ML (DIAMETRO CABLE, ESTADO ESCALERA)
const BADGE_RW = 48    // right badge width
const BADGE_H  = 20    // badge height
const ROW_H    = 22    // data row height
const CMNT_W   = 18    // rotated "Comentario" strip width
const CMNT_H   = 50    // comentario box height
const RLBL_X   = 158   // right-side label x offset from ML (DIAMETRO DEL CABLE, ESTADO ESCALERA, etc.)

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

  let logo=null, diagCombined=null
  try { logo         = await doc.embedPng(Uint8Array.from(atob(PTI_LOGO_BASE64),  c=>c.charCodeAt(0))) } catch {}
  try { diagCombined = await doc.embedJpg(Uint8Array.from(atob(DIAGRAM_COMBINED), c=>c.charCodeAt(0))) } catch {}

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
    for (const src of [datos,herrajes,prensacables,tramos,certificacion,data]) {
      const val = src?.[key]
      if (val && !String(val).startsWith('data:') && val!=='__photo__' && val!=='__photo_uploaded__') return s(String(val))
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

  const imgEscalera      = await fetchImg(doc, photoMap['fotoEscalera']    || photoMap['escalera'])
  const imgCertificacion = await fetchImg(doc, photoMap['fotoCertificacion']|| photoMap['certificacion'])
  const imgOtras1        = await fetchImg(doc, photoMap['fotoOtras1'])
  const imgOtras2        = await fetchImg(doc, photoMap['fotoOtras2'])

  // ════════════════════════════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════════════════════════════
  let page = doc.addPage([PW, PH])
  let y = PH - MT

  // ── Full header ───────────────────────────────────────────────
  page.drawRectangle({ x:ML, y:y-20, width:CW, height:20, color:C.black })
  page.drawText('PHOENIX TOWER INTERNATIONAL', {
    x: ML + CW/2 - fontB.widthOfTextAtSize('PHOENIX TOWER INTERNATIONAL',10)/2,
    y: y-14, size:10, font:fontB, color:C.white
  })
  y -= 22

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
    const lw=Math.min(ld.width,108), lh=Math.min(ld.height,38)
    page.drawImage(logo, { x:ML+6, y:y-LR_H+(LR_H-lh)/2, width:lw, height:lh })
  }
  const PX = ML+118
  page.drawText('Proveedor:', { x:PX, y:y-16, size:7.5, font:fontB, color:C.text })
  page.drawText(s(v('proveedor')), { x:PX+65, y:y-16, size:7.5, font, color:C.text })
  for (let dx=PX+65; dx<ML+CW-4; dx+=4)
    page.drawLine({ start:{x:dx,y:y-18}, end:{x:dx+2,y:y-18}, thickness:0.5, color:C.border })
  page.drawText('Tipo de Visita', { x:PX, y:y-34, size:7.5, font:fontB, color:C.text })
  page.drawText(s(v('tipoVisita')), { x:PX+76, y:y-34, size:7.5, font, color:C.text })
  for (let dx=PX+76; dx<ML+CW-4; dx+=4)
    page.drawLine({ start:{x:dx,y:y-36}, end:{x:dx+2,y:y-36}, thickness:0.5, color:C.border })
  page.drawRectangle({ x:ML, y:y-LR_H-2, width:CW, height:2, color:C.red })
  y -= LR_H + 4

  // ESTADO FÍSICO
  page.drawRectangle({ x:ML, y:y-16, width:CW, height:16, color:C.gray, borderColor:C.border, borderWidth:0.5 })
  page.drawText('ESTADO FÍSICO', {
    x: ML + CW/2 - fontB.widthOfTextAtSize('ESTADO FÍSICO',9)/2,
    y: y-12, size:9, font:fontB, color:C.text
  })
  y -= 18

  // Site info rows (2-column, bordered)
  const siteRow = (l1,v1,l2,v2) => {
    const h = 13
    page.drawRectangle({ x:ML, y:y-h, width:CW, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawLine({ start:{x:ML+CW/2,y}, end:{x:ML+CW/2,y:y-h}, thickness:0.4, color:C.border })
    page.drawText(l1, { x:ML+4, y:y-h+4, size:7, font:fontB, color:C.text })
    page.drawText(s(String(v1||'')), { x:ML+4+fontB.widthOfTextAtSize(l1,7)+3, y:y-h+4, size:7, font, color:C.text })
    page.drawText(l2, { x:ML+CW/2+4, y:y-h+4, size:7, font:fontB, color:C.text })
    page.drawText(s(String(v2||'')), { x:ML+CW/2+4+fontB.widthOfTextAtSize(l2,7)+3, y:y-h+4, size:7, font, color:C.text })
    y -= h
  }
  siteRow('ID Sitio:',      v('idSitio'),     'Altura (Mts):', v('altura'))
  siteRow('Nombre Sitio:',  v('nombreSitio'), 'Tipo Sitio:',   v('tipoSitio'))
  siteRow('Fecha Inicio:',  meta.startedAt||v('fechaInicio')||'', 'Tipo Estructura:', v('tipoEstructura'))
  siteRow('Fecha Termino:', meta.endedAt||v('fechaTermino')||'',  'Latitud:', meta.lat?String(meta.lat):'')
  siteRow('Direccion:',     v('direccion'),   'Longitud:', meta.lng?String(meta.lng):'')
  y -= 12

  // ── Draw helpers ──────────────────────────────────────────────

  // Badge: bordered box with value text. large=true → 10pt bold (for "Mal")
  const badge = (x, rowY, val, w=BADGE_LW, large=false) => {
    if (!val && val !== 0) val = ''
    const bx = x, by = rowY - (ROW_H-BADGE_H)/2 - BADGE_H
    page.drawRectangle({ x:bx, y:by, width:w, height:BADGE_H, borderColor:C.border, borderWidth:0.7 })
    if (val) {
      const sz = large ? 10 : 8
      page.drawText(s(String(val)), { x:bx+5, y:by+5, size:sz, font:fontB, color:C.text })
    }
  }

  // One data row in the left data column (plain row, no outer border — section has own border)
  const dataRow = (drawFn) => {
    drawFn(y)
    y -= ROW_H
  }

  // Comentario block: rotated strip + text area
  const comentario = (text) => {
    page.drawRectangle({ x:ML, y:y-CMNT_H, width:CMNT_W, height:CMNT_H, borderColor:C.border, borderWidth:0.5 })
    page.drawText('Comentario', {
      x: ML+CMNT_W-4,
      y: y - CMNT_H/2 - font.widthOfTextAtSize('Comentario',6)/2,
      size:6, font, color:C.light, rotate:degrees(90)
    })
    const TX=ML+CMNT_W, TW=DATA_W-CMNT_W
    page.drawRectangle({ x:TX, y:y-CMNT_H, width:TW, height:CMNT_H, borderColor:C.border, borderWidth:0.5 })
    if (text) {
      const clean = s(String(text))  // sanitize: removes \n \r and bad chars
      const maxW = TW-14
      const words=clean.split(' ').filter(w=>w.length>0), lines=[]
      let cur=''
      for(const w of words){const t=cur?cur+' '+w:w;if(font.widthOfTextAtSize(t,8)>maxW){if(cur)lines.push(cur);cur=w}else cur=t}
      if(cur)lines.push(cur)
      lines.slice(0,3).forEach((ln,i)=>
        page.drawText(ln, { x:TX+10, y:y-18-i*13, size:8, font, color:C.text })
      )
    }
    y -= CMNT_H
  }

  // Right column: draw image filling topY→topY-totalH
  // Draws full border box and centers image inside
  const imgBox = (img, topY, totalH) => {
    // Draw 4 sides individually so we have full control
    const bx=IMG_X, by=topY-totalH, bw=IMG_W, bh=totalH
    // Bottom
    page.drawLine({start:{x:bx,y:by},     end:{x:bx+bw,y:by},     thickness:0.5,color:C.border})
    // Left
    page.drawLine({start:{x:bx,y:by},     end:{x:bx,y:by+bh},     thickness:0.5,color:C.border})
    // Right  
    page.drawLine({start:{x:bx+bw,y:by},  end:{x:bx+bw,y:by+bh},  thickness:0.5,color:C.border})
    // Top
    page.drawLine({start:{x:bx,y:by+bh},  end:{x:bx+bw,y:by+bh},  thickness:0.5,color:C.border})
    if (img) {
      const d=img.scale(1), sc=Math.min((IMG_W-10)/d.width,(totalH-10)/d.height)
      page.drawImage(img, {
        x: IMG_X+(IMG_W-d.width*sc)/2,
        y: topY-totalH+(totalH-d.height*sc)/2,
        width:d.width*sc, height:d.height*sc
      })
    }
  }

  // Pre-calculated section heights (for imgBox pre-draw)
  const H_HERRAJES     = 16 + 2*ROW_H + CMNT_H        // 110
  const H_PRENSACABLES = 16 + 3*ROW_H + CMNT_H        // 132
  const H_COMBINED     = H_HERRAJES + 12 + H_PRENSACABLES  // 254 (gap included)
  const H_TRAMOS       = 16 + 3*ROW_H + CMNT_H        // 132
  const H_CERT         = 16 + 34                        // 50

  // Section header: plain bold text, no border box
  const secHeader = (num, title, badge_text) => {
    page.drawText(num,   { x:ML+2,    y:y-12, size:8, font:fontB, color:C.text })
    page.drawText(title, { x:ML+12,   y:y-12, size:8, font:fontB, color:C.text })
    if (badge_text) page.drawText(s(badge_text), { x:ML+12+fontB.widthOfTextAtSize(title,8)+12, y:y-12, size:7, font, color:C.light })
    y -= 16
  }

  // Label in a data row
  const lbl = (x, rowY, text, sz=7) =>
    page.drawText(text, { x, y:rowY-ROW_H/2-sz/2+1, size:sz, font, color:C.text })

  // ══════════════════════════════════════════════════════════
  // SECTION 1 — HERRAJES
  // ══════════════════════════════════════════════════════════
  const topH = y
  // Draw combined diagram directly — no border box, image fills right column naturally
  if (diagCombined) {
    const dc = diagCombined.scale(1)
    // Scale to fit IMG_W exactly (width-constrained), let height be natural
    const sc = (IMG_W - 4) / dc.width
    const dh = dc.height * sc
    page.drawImage(diagCombined, {
      x: IMG_X + 2,
      y: topH - dh,
      width: dc.width * sc,
      height: dh
    })
  }
  secHeader('1', 'HERRAJES')

  // Row 1: HERRAJE INFERIOR [badge] ........... DIAMETRO DEL CABLE [badge]
  dataRow(ry => {
    lbl(ML+2, ry, 'HERRAJE INFERIOR')
    badge(ML+BADGE_L, ry, stLabel(herrajes.herrajeInferior), BADGE_LW)
    lbl(ML+RLBL_X, ry, 'DIAMETRO DEL CABLE')
    badge(ML+BADGE_R, ry, herrajes.diametroCable, BADGE_RW)
  })

  // Row 2: HERRAJE SUPERIOR [badge] ........... ESTADO DEL CABLE [badge — Mal=large]
  dataRow(ry => {
    lbl(ML+2, ry, 'HERRAJE SUPERIOR')
    badge(ML+BADGE_L, ry, stLabel(herrajes.herrajeSuperior), BADGE_LW)
    lbl(ML+RLBL_X, ry, 'ESTADO DEL CABLE')
    const ecVal = stLabel(herrajes.estadoCable)
    badge(ML+BADGE_R, ry, ecVal, BADGE_RW, ecVal==='Mal')
  })

  comentario(herrajes.comentarioHerrajeInferior||herrajes.comentarioCable||herrajes.comentarioOxidacion||'')
  // imgBox already drawn above
  y -= 12

  // ══════════════════════════════════════════════════════════
  // SECTION 2 — PRENSACABLES
  // ══════════════════════════════════════════════════════════
  const topP = y
  // combined image already drawn above (spans Herrajes+Prensacables)
  secHeader('2', 'PRENSACABLES', 'ACTUAL')

  // CANTIDAD, DISTANCIAMIENTO, ESTADO — badges all align at ML+BADGE_L
  dataRow(ry => {
    lbl(ML+2, ry, 'CANTIDAD')
    badge(ML+BADGE_L, ry, prensacables.cantidadPrensacables, BADGE_LW)
  })
  dataRow(ry => {
    lbl(ML+2, ry, 'DISTANCIAMIENTO')
    badge(ML+BADGE_L, ry, prensacables.distanciamiento, BADGE_LW)
  })
  dataRow(ry => {
    lbl(ML+2, ry, 'ESTADO')
    badge(ML+BADGE_L, ry, stLabel(prensacables.estadoPrensacables), BADGE_LW+30)
  })

  comentario(prensacables.comentarioPrensacables||'')
  // imgBox already drawn above
  y -= 12

  // ══════════════════════════════════════════════════════════
  // SECTION 3 — TRAMOS
  // ══════════════════════════════════════════════════════════
  const topT = y
  imgBox(imgEscalera, topT, H_TRAMOS)  // draw first
  secHeader('3', 'TRAMOS (escaleras)', 'ACTUAL')

  // CANTIDAD (tramos) [9] ..... ESTADO ESCALERA [Bueno]
  dataRow(ry => {
    lbl(ML+2, ry, 'CANTIDAD (tramos)')
    badge(ML+BADGE_L, ry, tramos.cantidadTramos, BADGE_LW)
    lbl(ML+RLBL_X, ry, 'ESTADO ESCALERA')
    badge(ML+BADGE_R, ry, stLabel(tramos.estadoEscalera), BADGE_RW)
  })

  // CANTIDAD (uniones) [10] ... TRAMOS DAÑADOS [No]
  dataRow(ry => {
    lbl(ML+2, ry, 'CANTIDAD (uniones)')
    badge(ML+BADGE_L, ry, tramos.cantidadUniones, BADGE_LW)
    lbl(ML+RLBL_X, ry, 'TRAMOS DAÑADOS')
    badge(ML+BADGE_R, ry, tramos.tramosDañados||tramos.tramosDanados||'No', BADGE_RW)
  })

  // DIAMETRO TORNILLO [16]
  dataRow(ry => {
    lbl(ML+2, ry, 'DIAMETRO TORNILLO')
    badge(ML+BADGE_L, ry, tramos.diametroTornillo, BADGE_LW)
  })

  comentario(tramos.comentarioEscalera||tramos.comentarioTornillos||'')
  // imgBox already drawn above
  y -= 12

  // ══════════════════════════════════════════════════════════
  // CERTIFICACIÓN
  // ══════════════════════════════════════════════════════════
  const topC = y
  imgBox(imgCertificacion, topC, H_CERT)  // draw first
  secHeader('2', 'CERTIFICACIÓN', 'ACTUAL')

  // SI / NO checkboxes row
  {
    const h = 34
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    const cv=(certificacion.tieneCertificacion||'').toLowerCase()
    const isSi=cv==='si'||cv==='sí'||cv==='yes'
    page.drawText('SI', { x:ML+14, y:y-h+14, size:8, font, color:C.text })
    page.drawRectangle({ x:ML+28, y:y-h+6, width:18, height:14, borderColor:C.border, borderWidth:0.8 })
    if(isSi) page.drawText('X',{x:ML+33,y:y-h+8,size:9,font:fontB,color:C.text})
    page.drawText('NO', { x:ML+78, y:y-h+14, size:8, font, color:C.text })
    page.drawRectangle({ x:ML+96, y:y-h+6, width:18, height:14, borderColor:C.border, borderWidth:0.8 })
    if(!isSi) page.drawText('X',{x:ML+101,y:y-h+8,size:9,font:fontB,color:C.text})
    y -= h
  }

  // imgBox already drawn above

  // ── Observación general — al pie de p1, full-width ───────────
  y -= 10
  {
    const OBS_H = 44
    const HW2 = (CW - 6) / 2
    const obs = certificacion.observacionCertificacion||certificacion.observaciones||''
    // Left: texto observación
    page.drawRectangle({x:ML, y:y-OBS_H, width:HW2, height:OBS_H, borderColor:C.border, borderWidth:0.5})
    if (obs) {
      const obsClean=s(String(obs))
      const maxW=HW2-14, words=obsClean.split(' ').filter(w=>w.length>0), lines=[]
      let cur=''
      for(const w of words){const t=cur?cur+' '+w:w;if(font.widthOfTextAtSize(t,8)>maxW){if(cur)lines.push(cur);cur=w}else cur=t}
      if(cur)lines.push(cur)
      lines.slice(0,3).forEach((ln,i)=>page.drawText(ln,{x:ML+8,y:y-15-i*12,size:8,font,color:C.text}))
    }
    // Right: caja vacía
    page.drawRectangle({x:ML+HW2+6, y:y-OBS_H, width:HW2, height:OBS_H, borderColor:C.border, borderWidth:0.5})
    y -= OBS_H
  }

  // Footer p1
  page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
    {x:ML,y:16,size:5.5,font,color:C.light})
  page.drawText('Página 1',
    {x:PW-MR-font.widthOfTextAtSize('Página 1',5.5),y:16,size:5.5,font,color:C.light})

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — Photo evidence
  // Header: ONLY thin red line + "ESTADO FÍSICO" (no black PTI bar)
  // ════════════════════════════════════════════════════════════
  page = doc.addPage([PW,PH])
  y = PH - MT

  // Thin red top line
  page.drawRectangle({ x:ML, y:y-3, width:CW, height:3, color:C.red })
  y -= 5

  // "ESTADO FÍSICO" centered gray bar
  page.drawRectangle({ x:ML, y:y-16, width:CW, height:16, color:C.gray, borderColor:C.border, borderWidth:0.5 })
  page.drawText('ESTADO FÍSICO', {
    x: ML+CW/2-fontB.widthOfTextAtSize('ESTADO FÍSICO',9)/2,
    y: y-12, size:9, font:fontB, color:C.text
  })
  y -= 20

  // Fixed photo pairs (labels from reference PDF) + fotoOtras at the end
  const pairs = [
    { left:'HERRAJE INFERIOR',             leftId:'fotoHerrajeInferior',
      right:'HERRAJE SUPERIOR',            rightId:'fotoHerrajeSuperior' },
    { left:'PRENSACABLE SUPERIOR',         leftId:'fotoPrensacableSuperior',
      right:'PRENSACABLE INFERIOR',        rightId:'fotoPrensacableInferior' },
    { left:'TIPO DE CARRO',                leftId:'fotoTipoCarro',
      right:'OBSERVACIÓN UNIÓN (Tramos)',  rightId:'fotoUnionTramos' },
    { left:'OTRAS FOTOS 1',               leftId:'fotoOtras1',
      right:'OTRAS FOTOS 2',              rightId:'fotoOtras2' },
  ]

  // Any extra photos
  const fixedIds = new Set(pairs.flatMap(p=>[p.leftId,p.rightId]))
  const extras = []
  for (const [key,url] of Object.entries(photoMap)) {
    const EXCLUDED = new Set(['fotoCertificacion','fotoEscalera','fotoOtras1','fotoOtras2'])
    if (!fixedIds.has(key) && !EXCLUDED.has(key)) {
      extras.push({ label:key.replace(/^foto/,'').replace(/([A-Z])/g,' $1').trim().toUpperCase(), id:key })
    }
  }
  for (let i=0;i<extras.length;i+=2)
    pairs.push({left:extras[i].label,leftId:extras[i].id,right:extras[i+1]?.label||null,rightId:extras[i+1]?.id||null})

  const HW   = (CW-6)/2
  const HDRH = 18
  const PHOH = 188

  for (const pair of pairs) {
    if (y-HDRH-PHOH < 60) {
      page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
        {x:ML,y:16,size:5.5,font,color:C.light})
      page=doc.addPage([PW,PH]); y=PH-MT
    }
    // Left photo
    page.drawRectangle({x:ML,y:y-HDRH,width:HW,height:HDRH,color:C.black})
    page.drawText(pair.left||'',{x:ML+6,y:y-HDRH+6,size:7,font:fontB,color:C.white})
    page.drawRectangle({x:ML,y:y-HDRH-PHOH,width:HW,height:PHOH,borderColor:C.border,borderWidth:0.5})
    if (pair.leftId) {
      const img=await fetchImg(doc,photoMap[pair.leftId])
      if (img) {
        const d=img.scale(1),sc=Math.min((HW-8)/d.width,(PHOH-8)/d.height)
        page.drawImage(img,{x:ML+(HW-d.width*sc)/2,y:y-HDRH-PHOH+(PHOH-d.height*sc)/2,width:d.width*sc,height:d.height*sc})
      }
    }
    // Right photo
    if (pair.right) {
      const RX=ML+HW+6
      page.drawRectangle({x:RX,y:y-HDRH,width:HW,height:HDRH,color:C.black})
      page.drawText(pair.right||'',{x:RX+6,y:y-HDRH+6,size:7,font:fontB,color:C.white})
      page.drawRectangle({x:RX,y:y-HDRH-PHOH,width:HW,height:PHOH,borderColor:C.border,borderWidth:0.5})
      if (pair.rightId) {
        const img=await fetchImg(doc,photoMap[pair.rightId])
        if (img) {
          const d=img.scale(1),sc=Math.min((HW-8)/d.width,(PHOH-8)/d.height)
          page.drawImage(img,{x:RX+(HW-d.width*sc)/2,y:y-HDRH-PHOH+(PHOH-d.height*sc)/2,width:d.width*sc,height:d.height*sc})
        }
      }
    }
    y -= HDRH+PHOH+8
  }

  // (Observation boxes moved to end of page 1)

  page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
    {x:ML,y:16,size:5.5,font,color:C.light})
  page.drawText('Página 2',
    {x:PW-MR-font.widthOfTextAtSize('Página 2',5.5),y:16,size:5.5,font,color:C.light})

  return await doc.save()
}

export async function downloadSafetyPdf(submission, assets=[]) {
  const bytes=await generateSafetyPdf(submission,assets)
  const blob=new Blob([bytes],{type:'application/pdf'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  const d=submission?.payload?.payload?.data||submission?.payload?.data||{}
  const datos=d.datos||d.formData||d
  a.download=`ascenso_${datos.idSitio||submission?.id?.slice(0,8)||'report'}.pdf`
  document.body.appendChild(a);a.click();document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
