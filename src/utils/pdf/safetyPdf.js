/**
 * PTI TeleInspect — Sistema de Ascenso PDF
 * Replica exacta del PDF de referencia PTI (ascenso_1_.pdf)
 *
 * Diferencias críticas vs versiones anteriores:
 *  - Section headers (1 HERRAJES, etc.) son texto plano SIN caja/borde
 *  - "Mal" en ESTADO DEL CABLE usa fuente más grande (~10pt)
 *  - Col derecha de imagen comienza desde el header de sección
 *  - Página 2: solo línea roja fina + "ESTADO FÍSICO" (SIN barra negra PTI)
 *  - Diagramas de referencia embebidos (BIEN/MAL y wire rope grips)
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
    const lw = Math.min(ld.width,108), lh = Math.min(ld.height,38)
    page.drawImage(logo, { x:ML+6, y:y-LR_H+(LR_H-lh)/2, width:lw, height:lh })
  }
  const PX = ML + 118
  page.drawText('Proveedor:', { x:PX, y:y-16, size:7.5, font:fontB, color:C.text })
  page.drawText(v('proveedor'), { x:PX+65, y:y-16, size:7.5, font, color:C.text })
  for (let dx=PX+65; dx<ML+CW-4; dx+=4)
    page.drawLine({ start:{x:dx,y:y-18}, end:{x:dx+2,y:y-18}, thickness:0.5, color:C.border })
  page.drawText('Tipo de Visita', { x:PX, y:y-34, size:7.5, font:fontB, color:C.text })
  page.drawText(v('tipoVisita'), { x:PX+76, y:y-34, size:7.5, font, color:C.text })
  for (let dx=PX+76; dx<ML+CW-4; dx+=4)
    page.drawLine({ start:{x:dx,y:y-36}, end:{x:dx+2,y:y-36}, thickness:0.5, color:C.border })
  page.drawRectangle({ x:ML, y:y-LR_H-2, width:CW, height:2, color:C.red })
  y -= LR_H + 4

  // ESTADO FÍSICO header
  page.drawRectangle({ x:ML, y:y-16, width:CW, height:16, color:C.gray, borderColor:C.border, borderWidth:0.5 })
  page.drawText('ESTADO FÍSICO', {
    x: ML + CW/2 - fontB.widthOfTextAtSize('ESTADO FÍSICO',9)/2,
    y: y-12, size:9, font:fontB, color:C.text
  })
  y -= 18

  // 5 site info rows
  const siteRow = (l1,v1,l2,v2) => {
    const h = 13
    page.drawRectangle({ x:ML, y:y-h, width:CW, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawLine({ start:{x:ML+CW/2,y}, end:{x:ML+CW/2,y:y-h}, thickness:0.4, color:C.border })
    page.drawText(l1, { x:ML+4, y:y-h+4, size:7, font:fontB, color:C.text })
    page.drawText(String(v1||''), { x:ML+4+fontB.widthOfTextAtSize(l1,7)+3, y:y-h+4, size:7, font, color:C.text })
    page.drawText(l2, { x:ML+CW/2+4, y:y-h+4, size:7, font:fontB, color:C.text })
    page.drawText(String(v2||''), { x:ML+CW/2+4+fontB.widthOfTextAtSize(l2,7)+3, y:y-h+4, size:7, font, color:C.text })
    y -= h
  }
  siteRow('ID Sitio:',      v('idSitio'),     'Altura (Mts):', v('altura'))
  siteRow('Nombre Sitio:',  v('nombreSitio'), 'Tipo Sitio:',   v('tipoSitio'))
  siteRow('Fecha Inicio:',  meta.startedAt||v('fechaInicio')||'', 'Tipo Estructura:', v('tipoEstructura'))
  siteRow('Fecha Termino:', meta.endedAt||v('fechaTermino')||'',  'Latitud:',  meta.lat?String(meta.lat):'')
  siteRow('Direccion:',     v('direccion'),   'Longitud:', meta.lng?String(meta.lng):'')
  y -= 12

  // ── Column layout ─────────────────────────────────────────────
  // Reference proportions: data ~60%, image ~37%, gap ~3%
  const DATA_W = 326   // px  (left data column, including comentario strip)
  const IMG_W  = 194   // px  (right image column)
  const IMG_X  = ML + DATA_W + (CW - DATA_W - IMG_W)  // = ML+346 ≈ 382

  const CMNT_W = 18    // width of rotated "Comentario" strip

  // ── Helpers ──────────────────────────────────────────────────

  // Draw a small value badge: bordered rectangle with text inside
  // size: 'normal' (7pt) or 'large' (10pt bold) for "Mal" style
  const drawBadge = (x, y, val, w=48, h=13, large=false) => {
    page.drawRectangle({ x, y:y-h+2, width:w, height:h-4, borderColor:C.border, borderWidth:0.7 })
    if (val) {
      const sz = large ? 10 : 7
      const fnt= large ? fontB : fontB
      page.drawText(String(val), { x:x+4, y:y-h+4+(large?1:0), size:sz, font:fnt, color:C.text })
    }
  }

  // Draw image in the right column spanning a given height
  const drawRightImg = (img, topY, totalH) => {
    page.drawRectangle({ x:IMG_X, y:topY-totalH, width:IMG_W, height:totalH, borderColor:C.border, borderWidth:0.5 })
    if (img) {
      const d = img.scale(1)
      const sc = Math.min((IMG_W-8)/d.width, (totalH-8)/d.height)
      page.drawImage(img, {
        x: IMG_X+(IMG_W-d.width*sc)/2,
        y: topY-totalH+(totalH-d.height*sc)/2,
        width: d.width*sc, height: d.height*sc
      })
    }
  }

  // Draw a data row (bordered rectangle in left data column)
  const drawDataRow = (h, drawFn) => {
    page.drawRectangle({ x:ML, y:y-h, width:DATA_W, height:h, borderColor:C.border, borderWidth:0.5 })
    drawFn(y)
    y -= h
  }

  // Draw the "Comentario" row: rotated label strip + text area
  const drawComentario = (text, h=44) => {
    // Left strip (rotated label)
    page.drawRectangle({ x:ML, y:y-h, width:CMNT_W, height:h, borderColor:C.border, borderWidth:0.5 })
    page.drawText('Comentario', {
      x: ML+CMNT_W-4,
      y: y - h/2 - font.widthOfTextAtSize('Comentario',6)/2,
      size:6, font, color:C.light,
      rotate: degrees(90)
    })
    // Text area
    const TX = ML+CMNT_W, TW = DATA_W-CMNT_W
    page.drawRectangle({ x:TX, y:y-h, width:TW, height:h, borderColor:C.border, borderWidth:0.5 })
    if (text) {
      const maxW = TW - 14
      const words = String(text).split(' ')
      const lines = []
      let cur = ''
      for (const w of words) {
        const t = cur ? cur+' '+w : w
        if (font.widthOfTextAtSize(t,7.5) > maxW) { if(cur) lines.push(cur); cur=w } else cur=t
      }
      if (cur) lines.push(cur)
      lines.slice(0,3).forEach((ln,i) =>
        page.drawText(ln, { x:TX+8, y:y-15-i*12, size:7.5, font, color:C.text })
      )
    }
    y -= h
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 1 — HERRAJES
  // ══════════════════════════════════════════════════════════
  const topHerrajes = y

  // Section header — plain text, NO border box (matches reference)
  page.drawText('1', { x:ML+4, y:y-11, size:8, font:fontB, color:C.text })
  page.drawText('HERRAJES', { x:ML+14, y:y-11, size:8, font:fontB, color:C.text })
  y -= 14

  // Row: HERRAJE INFERIOR [badge] | DIAMETRO DEL CABLE [badge]
  drawDataRow(14, (ry) => {
    const half = DATA_W/2
    page.drawLine({ start:{x:ML+half,y:ry}, end:{x:ML+half,y:ry-14}, thickness:0.4, color:C.border })
    page.drawText('HERRAJE INFERIOR', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+96, ry, stLabel(herrajes.herrajeInferior), 48, 14)
    page.drawText('DIAMETRO DEL CABLE', { x:ML+half+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+half+102, ry, herrajes.diametroCable, 36, 14)
  })

  // Row: HERRAJE SUPERIOR [badge] | ESTADO DEL CABLE [badge — LARGE for "Mal"]
  drawDataRow(14, (ry) => {
    const half = DATA_W/2
    page.drawLine({ start:{x:ML+half,y:ry}, end:{x:ML+half,y:ry-14}, thickness:0.4, color:C.border })
    page.drawText('HERRAJE SUPERIOR', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+96, ry, stLabel(herrajes.herrajeSuperior), 48, 14)
    page.drawText('ESTADO DEL CABLE', { x:ML+half+4, y:ry-10, size:6.5, font, color:C.text })
    // "Mal" is displayed larger in the reference
    const ecVal = stLabel(herrajes.estadoCable)
    const isLarge = ecVal === 'Mal'
    drawBadge(ML+half+94, ry, ecVal, isLarge?44:48, 14, isLarge)
  })

  drawComentario(herrajes.comentarioHerrajeInferior||herrajes.comentarioCable||herrajes.comentarioOxidacion||'')

  // Right col: BIEN/MAL reference diagram
  drawRightImg(diagBM, topHerrajes, topHerrajes - y)
  y -= 10

  // ══════════════════════════════════════════════════════════
  // SECTION 2 — PRENSACABLES
  // ══════════════════════════════════════════════════════════
  const topPresa = y

  page.drawText('2', { x:ML+4, y:y-11, size:8, font:fontB, color:C.text })
  page.drawText('PRENSACABLES', { x:ML+14, y:y-11, size:8, font:fontB, color:C.text })
  page.drawText('ACTUAL', { x:ML+DATA_W-44, y:y-11, size:7, font, color:C.light })
  y -= 14

  // CANTIDAD row
  drawDataRow(14, (ry) => {
    page.drawText('CANTIDAD', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+58, ry, prensacables.cantidadPrensacables, 46, 14)
  })

  // DISTANCIAMIENTO row
  drawDataRow(14, (ry) => {
    page.drawText('DISTANCIAMIENTO', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+88, ry, prensacables.distanciamiento, 46, 14)
  })

  // ESTADO row
  drawDataRow(14, (ry) => {
    page.drawText('ESTADO', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+42, ry, stLabel(prensacables.estadoPrensacables), 48, 14)
  })

  drawComentario(prensacables.comentarioPrensacables||'')

  // Right col: wire rope grips reference diagram
  drawRightImg(diagWR, topPresa, topPresa - y)
  y -= 10

  // ══════════════════════════════════════════════════════════
  // SECTION 3 — TRAMOS
  // ══════════════════════════════════════════════════════════
  const topTramos = y

  page.drawText('3', { x:ML+4, y:y-11, size:8, font:fontB, color:C.text })
  page.drawText('TRAMOS (escaleras)', { x:ML+14, y:y-11, size:8, font:fontB, color:C.text })
  page.drawText('ACTUAL', { x:ML+DATA_W-44, y:y-11, size:7, font, color:C.light })
  y -= 14

  // CANTIDAD (tramos) | ESTADO ESCALERA
  drawDataRow(14, (ry) => {
    const half = DATA_W/2
    page.drawLine({ start:{x:ML+half,y:ry}, end:{x:ML+half,y:ry-14}, thickness:0.4, color:C.border })
    page.drawText('CANTIDAD (tramos)', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+94, ry, tramos.cantidadTramos, 32, 14)
    page.drawText('ESTADO ESCALERA', { x:ML+half+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+half+88, ry, stLabel(tramos.estadoEscalera), 48, 14)
  })

  // CANTIDAD (uniones) | TRAMOS DAÑADOS
  drawDataRow(14, (ry) => {
    const half = DATA_W/2
    page.drawLine({ start:{x:ML+half,y:ry}, end:{x:ML+half,y:ry-14}, thickness:0.4, color:C.border })
    page.drawText('CANTIDAD (uniones)', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+96, ry, tramos.cantidadUniones, 32, 14)
    page.drawText('TRAMOS DAÑADOS', { x:ML+half+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+half+84, ry, tramos.tramosDañados||tramos.tramosDanados||'No', 32, 14)
  })

  // DIAMETRO TORNILLO
  drawDataRow(14, (ry) => {
    page.drawText('DIAMETRO TORNILLO', { x:ML+4, y:ry-10, size:6.5, font, color:C.text })
    drawBadge(ML+96, ry, tramos.diametroTornillo, 32, 14)
  })

  drawComentario(tramos.comentarioEscalera||tramos.comentarioTornillos||'')

  // Right col: inspector photo (empty box until uploaded)
  drawRightImg(imgEscalera, topTramos, topTramos - y)
  y -= 10

  // ══════════════════════════════════════════════════════════
  // CERTIFICACIÓN
  // ══════════════════════════════════════════════════════════
  const topCert = y

  page.drawText('2', { x:ML+4, y:y-11, size:8, font:fontB, color:C.text })
  page.drawText('CERTIFICACIÓN', { x:ML+14, y:y-11, size:8, font:fontB, color:C.text })
  page.drawText('ACTUAL', { x:ML+DATA_W-44, y:y-11, size:7, font, color:C.light })
  y -= 14

  // SI / NO checkboxes
  drawDataRow(34, (ry) => {
    const cv = (certificacion.tieneCertificacion||'').toLowerCase()
    const isSi = cv==='si'||cv==='sí'||cv==='yes'
    // SI
    page.drawText('SI', { x:ML+14, y:ry-20, size:8, font, color:C.text })
    page.drawRectangle({ x:ML+28, y:ry-30, width:18, height:14, borderColor:C.border, borderWidth:0.8 })
    if (isSi) page.drawText('X', { x:ML+33, y:ry-27, size:9, font:fontB, color:C.text })
    // NO
    page.drawText('NO', { x:ML+78, y:ry-20, size:8, font, color:C.text })
    page.drawRectangle({ x:ML+96, y:ry-30, width:18, height:14, borderColor:C.border, borderWidth:0.8 })
    if (!isSi) page.drawText('X', { x:ML+101, y:ry-27, size:9, font:fontB, color:C.text })
  })

  // Right col: inspector photo (empty until uploaded)
  drawRightImg(imgCertificacion, topCert, topCert - y)

  // Footer p1
  page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
    { x:ML, y:16, size:5.5, font, color:C.light })
  page.drawText('Página 1',
    { x:PW-MR-font.widthOfTextAtSize('Página 1',5.5), y:16, size:5.5, font, color:C.light })

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — Photo evidence
  // Exact match to reference: ONLY red line + "ESTADO FÍSICO" header, no black PTI bar
  // ════════════════════════════════════════════════════════════
  page = doc.addPage([PW, PH])
  y = PH - MT

  // Thin red top line (matches reference page 2 exactly)
  page.drawRectangle({ x:ML, y:y-3, width:CW, height:3, color:C.red })
  y -= 5

  // "ESTADO FÍSICO" gray bar centered
  page.drawRectangle({ x:ML, y:y-16, width:CW, height:16, color:C.gray, borderColor:C.border, borderWidth:0.5 })
  page.drawText('ESTADO FÍSICO', {
    x: ML+CW/2 - fontB.widthOfTextAtSize('ESTADO FÍSICO',9)/2,
    y: y-12, size:9, font:fontB, color:C.text
  })
  y -= 20

  // 3 fixed photo pairs (exact labels from reference)
  const pairs = [
    { left:'HERRAJE INFERIOR',          leftId:'fotoHerrajeInferior',
      right:'HERRAJE SUPERIOR',         rightId:'fotoHerrajeSuperior' },
    { left:'PRENSACABLE SUPERIOR',      leftId:'fotoPrensacableSuperior',
      right:'PRENSACABLE INFERIOR',     rightId:'fotoPrensacableInferior' },
    { left:'TIPO DE CARRO',             leftId:'fotoCarro',
      right:'OBSERVACIÓN UNIÓN (Tramos)', rightId:'fotoUnion' },
  ]

  // Collect extra photos not in defined pairs
  const fixedIds = new Set(pairs.flatMap(p=>[p.leftId,p.rightId]))
  const extras = []
  for (const [key, url] of Object.entries(photoMap)) {
    if (!fixedIds.has(key) && key!=='fotoCertificacion' && key!=='fotoEscalera') {
      extras.push({ label: key.replace(/^foto/,'').replace(/([A-Z])/g,' $1').trim().toUpperCase(), id: key })
    }
  }
  for (let i=0; i<extras.length; i+=2)
    pairs.push({ left:extras[i].label, leftId:extras[i].id, right:extras[i+1]?.label||null, rightId:extras[i+1]?.id||null })

  const HW   = (CW - 6) / 2  // half-width for each photo box
  const HDRH = 18             // label header height
  const PHOH = 188            // photo box height

  for (const pair of pairs) {
    if (y - HDRH - PHOH < 60) {
      page.drawText('Phoenix Tower International — Reporte de Sistema de Ascenso',
        { x:ML, y:16, size:5.5, font, color:C.light })
      page = doc.addPage([PW,PH]); y = PH - MT
    }

    // Left
    page.drawRectangle({ x:ML, y:y-HDRH, width:HW, height:HDRH, color:C.black })
    page.drawText(pair.left||'', { x:ML+6, y:y-HDRH+6, size:7, font:fontB, color:C.white })
    page.drawRectangle({ x:ML, y:y-HDRH-PHOH, width:HW, height:PHOH, borderColor:C.border, borderWidth:0.5 })
    if (pair.leftId) {
      const img = await fetchImg(doc, photoMap[pair.leftId])
      if (img) {
        const d=img.scale(1), sc=Math.min((HW-8)/d.width,(PHOH-8)/d.height)
        page.drawImage(img,{x:ML+(HW-d.width*sc)/2,y:y-HDRH-PHOH+(PHOH-d.height*sc)/2,width:d.width*sc,height:d.height*sc})
      }
    }

    // Right
    if (pair.right) {
      const RX = ML+HW+6
      page.drawRectangle({ x:RX, y:y-HDRH, width:HW, height:HDRH, color:C.black })
      page.drawText(pair.right||'', { x:RX+6, y:y-HDRH+6, size:7, font:fontB, color:C.white })
      page.drawRectangle({ x:RX, y:y-HDRH-PHOH, width:HW, height:PHOH, borderColor:C.border, borderWidth:0.5 })
      if (pair.rightId) {
        const img = await fetchImg(doc, photoMap[pair.rightId])
        if (img) {
          const d=img.scale(1), sc=Math.min((HW-8)/d.width,(PHOH-8)/d.height)
          page.drawImage(img,{x:RX+(HW-d.width*sc)/2,y:y-HDRH-PHOH+(PHOH-d.height*sc)/2,width:d.width*sc,height:d.height*sc})
        }
      }
    }
    y -= HDRH + PHOH + 8
  }

  // Observation text + empty box at bottom (matches reference)
  if (y > 55) {
    const OBS_H = 44
    const obs = certificacion.observacionCertificacion||herrajes.comentarioCable||''
    page.drawRectangle({ x:ML, y:y-OBS_H, width:HW, height:OBS_H, borderColor:C.border, borderWidth:0.5 })
    if (obs) {
      const maxW = HW - 14
      const words = String(obs).split(' ')
      const lines = []
      let cur = ''
      for(const w of words){const t=cur?cur+' '+w:w;if(font.widthOfTextAtSize(t,7.5)>maxW){if(cur)lines.push(cur);cur=w}else cur=t}
      if(cur)lines.push(cur)
      lines.slice(0,3).forEach((ln,i)=>page.drawText(ln,{x:ML+8,y:y-15-i*12,size:7.5,font,color:C.text}))
    }
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
