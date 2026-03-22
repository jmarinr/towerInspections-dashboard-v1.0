/**
 * PTI TeleInspect — Reporte Adicional de Fotografias PDF
 * Usa pdf-lib (igual que equipmentV2Pdf.js)
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { PHOTO_CATEGORIES } from '../../data/additionalPhotoConfig'

const C = {
  black:     rgb(0.10, 0.10, 0.10),
  navy:      rgb(0.05, 0.13, 0.22),
  accent:    rgb(0.01, 0.52, 0.78),
  pink:      rgb(0.86, 0.15, 0.47),
  white:     rgb(1,    1,    1),
  gray:      rgb(0.93, 0.93, 0.93),
  grayMid:   rgb(0.75, 0.75, 0.75),
  darkGray:  rgb(0.20, 0.20, 0.20),
  green:     rgb(0.09, 0.64, 0.29),
  amber:     rgb(0.71, 0.33, 0.04),
  text:      rgb(0.10, 0.10, 0.10),
  textLight: rgb(0.50, 0.50, 0.50),
}

const PW = 612, PH = 792
const ML = 36, MR = 36, MT = 36
const CW = PW - ML - MR

const s = (val) => {
  if (val == null) return ''
  return String(val)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/[\u0100-\uFFFF]/g, (c) => {
      const map = {
        'a\u0301':'a','e\u0301':'e','i\u0301':'i','o\u0301':'o','u\u0301':'u',
        '\u00e1':'a','\u00e9':'e','\u00ed':'i','\u00f3':'o','\u00fa':'u',
        '\u00fc':'u','\u00f1':'n','\u00e4':'a','\u00f6':'o',
        '\u00c1':'A','\u00c9':'E','\u00cd':'I','\u00d3':'O','\u00da':'U',
        '\u00dc':'U','\u00d1':'N',
        '\u2019':"'",'–':'-','\u2014':'-','\u201C':'"','\u201D':'"','\u2026':'...',
      }
      return map[c] || ''
    })
    .trim()
}

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

class PB {
  constructor(doc, fonts) { this.doc = doc; this.fonts = fonts; this.page = null; this.y = 0 }
  newPage() { this.page = this.doc.addPage([PW, PH]); this.y = PH - MT; return this }
  need(n)   { if (this.y - n < 40) this.newPage(); return this }

  txt(t, x, y, { font, size = 10, color = C.text, mw } = {}) {
    const f = this.fonts[font] || this.fonts.r
    const clean = s(t); if (!clean) return this
    if (mw) {
      const words = clean.split(' '); let line = ''; let cy = y
      for (const w of words) {
        const test = line ? line + ' ' + w : w
        if (f.widthOfTextAtSize(test, size) > mw && line) {
          this.page.drawText(line, { x, y: cy, size, font: f, color }); cy -= size * 1.35; line = w
        } else line = test
      }
      if (line) this.page.drawText(line, { x, y: cy, size, font: f, color })
      return this
    }
    this.page.drawText(clean, { x, y, size, font: f, color }); return this
  }

  box(x, y, w, h, { fill, stroke, sw = 0.5 } = {}) {
    if (fill)   this.page.drawRectangle({ x, y, width: w, height: h, color: fill })
    if (stroke) this.page.drawRectangle({ x, y, width: w, height: h, borderColor: stroke, borderWidth: sw })
    return this
  }

  ln(x1, y1, x2, y2, { color = C.grayMid, thickness = 0.5 } = {}) {
    this.page.drawLine({ start:{x:x1,y:y1}, end:{x:x2,y:y2}, color, thickness }); return this
  }

  img(image, x, y, w, h) {
    if (!image) return this
    try {
      const d = image.scale(1), sc = Math.min(w/d.width, h/d.height)
      const iw = d.width*sc, ih = d.height*sc
      this.page.drawImage(image, { x: x+(w-iw)/2, y: y+(h-ih)/2, width: iw, height: ih })
    } catch {}
    return this
  }
}

function cover(pb, si, total, done) {
  pb.newPage()
  pb.box(0, 0, PW, PH, { fill: C.navy })
  pb.box(0, PH-5, PW, 5, { fill: C.pink })
  pb.txt('PTI TELEINSPECT', ML, PH-48, { font:'b', size:9, color:rgb(0.4,0.7,0.9) })
  pb.txt('REPORTE ADICIONAL', ML, PH-86, { font:'b', size:24, color:C.white })
  pb.txt('DE FOTOGRAFIAS', ML, PH-112, { font:'b', size:16, color:rgb(0.78,0.82,0.90) })
  pb.box(ML, PH-121, 76, 2, { fill: C.pink })

  // Info box
  pb.box(ML, PH-215, CW, 66, { fill: rgb(0.08,0.18,0.30) })
  pb.ln(ML, PH-149, ML+CW, PH-149, { color: C.pink, thickness: 1 })
  pb.txt(s(si.nombreSitio||si.nombre_sitio||'—'), ML+14, PH-169, { font:'b', size:13, color:C.white })
  pb.txt(s(si.idSitio||si.id_sitio||'—'), ML+14, PH-184, { size:9, color:rgb(0.6,0.75,0.9) })
  if (si.fecha||si.fechaInicio)
    pb.txt('Fecha: '+s(si.fecha||si.fechaInicio), ML+14, PH-198, { size:8, color:C.textLight })
  if (si.proveedor)
    pb.txt('Proveedor: '+s(si.proveedor), ML+180, PH-198, { size:8, color:C.textLight })

  pb.txt(`${total} categorias fotograficas`, ML, PH-232, { size:8, color:rgb(0.55,0.65,0.75) })
  pb.txt(`${done} completadas`, ML, PH-245, { size:8, color: done===total ? C.green : C.amber })
  pb.txt('Generado con PTI TeleInspect Admin Panel', ML, 18, { size:7, color:rgb(0.3,0.4,0.5) })
}

function index(pb, assetMap, rawPhotos) {
  pb.newPage()
  pb.box(0, PH-MT-20, PW, 24, { fill: C.navy })
  pb.box(0, PH-MT-20, 4, 24, { fill: C.pink })
  pb.txt('INDICE DE CATEGORIAS', ML+8, PH-MT-9, { font:'b', size:11, color:C.white })
  pb.y = PH-MT-36

  for (let i = 0; i < PHOTO_CATEGORIES.length; i++) {
    const cat = PHOTO_CATEGORIES[i]
    pb.need(14)
    const count = Math.max(
      (assetMap[cat.id]||[]).filter(p=>p?.public_url).length,
      (rawPhotos[cat.id]||[]).filter(Boolean).length
    )
    const ok = count >= cat.minPhotos
    if (i%2===0) pb.box(ML-4, pb.y-10, CW+8, 14, { fill: C.gray })
    pb.page.drawCircle({ x:ML+4, y:pb.y-3, size:3.5, color: ok ? C.green : count>0 ? C.amber : C.grayMid })
    pb.txt(`${cat.id}  ${s(cat.title)}`, ML+12, pb.y, { size:9, color:C.text })
    pb.txt(`${count}/${cat.minPhotos}`, PW-MR-38, pb.y, { size:9, color: ok ? C.green : count>0 ? C.amber : C.grayMid })
    pb.y -= 14
  }
}

async function catSection(pb, cat, photos) {
  pb.newPage()
  pb.box(0, PH-MT-20, PW, 24, { fill: C.navy })
  pb.box(0, PH-MT-20, 4, 24, { fill: C.pink })
  const badge = s(cat.id); const bw = badge.length*6+8
  pb.box(PW-MR-bw, PH-MT-18, bw, 18, { fill: C.pink })
  pb.txt(badge, PW-MR-bw+4, PH-MT-6, { font:'b', size:8, color:C.white })
  pb.txt(s(cat.title), ML+8, PH-MT-9, { font:'b', size:11, color:C.white })
  pb.y = PH-MT-34

  const descLines = Math.min(Math.ceil(s(cat.description).length/95)+1, 5)
  pb.need(descLines*12+30)
  pb.txt(s(cat.description), ML, pb.y, { size:8, color:C.textLight, mw:CW })
  pb.y -= descLines*11+6

  pb.txt(`Min. ${cat.minPhotos} foto${cat.minPhotos!==1?'s':''}`, ML, pb.y, { size:8, color:C.accent })
  pb.txt(s(cat.quality), ML+65, pb.y, { size:8, color:C.textLight })
  if (cat.variable) pb.txt('Cantidad variable', ML+140, pb.y, { size:8, color:C.amber })
  pb.y -= 14

  pb.ln(ML, pb.y, PW-MR, pb.y)
  pb.y -= 10

  if (!photos.length) {
    pb.box(ML, pb.y-26, CW, 28, { fill:C.gray })
    pb.txt('Sin fotos capturadas', ML+CW/2-45, pb.y-9, { size:9, color:C.textLight })
    return
  }

  const cols=2, gut=10, cw=(CW-gut)/cols, ih=cw*0.65, lh=16, ch=ih+lh+8
  let col=0

  for (let i=0; i<photos.length; i++) {
    const ph = photos[i]; if (!ph) continue
    const url = ph.public_url||ph.storage_url||ph.url||null
    const sub = cat.subLabels?.[i] ?? `Foto ${i+1}`
    const code = `${cat.id}_${String(i+1).padStart(2,'0')}`

    pb.need(ch+10)
    const x = ML + col*(cw+gut)

    pb.box(x, pb.y-ih, cw, ih, { fill:C.gray, stroke:C.grayMid })
    if (url) { const img = await fetchImg(pb.doc, url); if (img) pb.img(img, x, pb.y-ih, cw, ih) }

    const codew = code.length*4.5+6
    pb.box(x+2, pb.y-12, codew, 10, { fill:C.navy })
    pb.txt(code, x+4, pb.y-10, { font:'b', size:5.5, color:C.white })

    pb.box(x, pb.y-ih-lh, cw, lh, { fill:C.navy })
    pb.txt(s(sub), x+4, pb.y-ih-lh+5, { font:'b', size:7, color:C.white })

    col++
    if (col>=cols) { col=0; pb.y -= ch+8 }
  }
  if (col>0) pb.y -= ch+8
}

export async function generateAdditionalPhotoPdf(submission, assets) {
  const doc = await PDFDocument.create()
  const [r, b] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ])
  const pb = new PB(doc, { r, b, regular:r, bold:b })

  const raw      = submission?.payload?.payload?.data || submission?.payload?.data || {}
  const siteInfo = raw.siteInfo || {}
  const photos   = raw.photos  || {}
  const notes    = raw.notes   || ''

  const assetMap = {}
  if (assets) {
    for (const a of assets) {
      const parts = (a.asset_type||a.type||'').split(':')
      if (parts[0]==='photos' && parts[1]) {
        const ac=parts[1], idx=parseInt(parts[2]??'0')
        if (!assetMap[ac]) assetMap[ac]=[]
        assetMap[ac][idx]=a
      }
    }
  }

  const done = PHOTO_CATEGORIES.filter(cat => {
    const n = Math.max((assetMap[cat.id]||[]).filter(p=>p?.public_url).length, (photos[cat.id]||[]).filter(Boolean).length)
    return n >= cat.minPhotos
  }).length

  cover(pb, siteInfo, PHOTO_CATEGORIES.length, done)
  index(pb, assetMap, photos)

  for (const cat of PHOTO_CATEGORIES) {
    const merged = (assetMap[cat.id]||[]).filter(Boolean).length > 0
      ? (assetMap[cat.id]||[]).filter(Boolean)
      : (photos[cat.id]||[]).filter(Boolean).map(u=>({public_url:u}))
    if (merged.length > 0) await catSection(pb, cat, merged)
  }

  if (notes) {
    pb.newPage()
    pb.box(0, PH-MT-20, PW, 24, { fill:C.navy })
    pb.box(0, PH-MT-20, 4, 24, { fill:C.pink })
    pb.txt('OBSERVACIONES', ML+8, PH-MT-9, { font:'b', size:11, color:C.white })
    pb.y = PH-MT-44
    pb.box(ML, pb.y-60, CW, 64, { fill:C.gray })
    pb.txt(s(notes), ML+8, pb.y-12, { size:9, color:C.text, mw:CW-16 })
  }

  const bytes = await doc.save()
  const blob  = new Blob([bytes], { type:'application/pdf' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href = url
  a.download = `PTI_ReporteFotos_${s(siteInfo.idSitio||'sitio')}_${s(siteInfo.fecha||new Date().toISOString().slice(0,10))}.pdf`
    .replace(/[^a-zA-Z0-9_\-.]/g,'_')
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
