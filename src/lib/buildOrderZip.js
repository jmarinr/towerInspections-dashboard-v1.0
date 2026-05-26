import { fetchSubmissionsWithAssetsForVisit } from './supabaseQueries'
import { normalizeFormCode, isFormVisible } from '../data/formTypes'
import { generateMaintenancePdf } from '../utils/pdf/maintenancePdf'
import { generateGroundingPdf } from '../utils/pdf/groundingPdf'
import { generatePMExecutedPdf } from '../utils/pdf/pmExecutedPdf'
import { generateSafetyPdf } from '../utils/pdf/safetyPdf'
import { generateSubmissionPdf } from '../utils/pdf/generateReport'
import { generateEquipmentV2Pdf } from '../utils/pdf/equipmentV2Pdf'

// Sanitiza un nombre para usarlo dentro del ZIP (sin caracteres problemáticos).
const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80)

// Genera los bytes del PDF de una submission, replicando EXACTAMENTE la lógica
// de downloadAllPdfs (paridad con el botón de PDFs sueltos).
async function pdfBytesForSubmission(sub) {
  const fc = normalizeFormCode(sub.form_code)
  if      (fc === 'preventive-maintenance') return await generateMaintenancePdf(sub, sub.assets || [])
  else if (fc === 'grounding-system-test')  return await generateGroundingPdf(sub, sub.assets || [])
  else if (fc === 'executed-maintenance')   return await generatePMExecutedPdf(sub, sub.assets || [])
  else if (fc === 'safety-system')          return await generateSafetyPdf(sub, sub.assets || [])
  else if (fc === 'equipment-v2') {
    const photoMap = {}
    ;(sub.assets || []).forEach(a => {
      const key = a.asset_type || a.type || ''
      const url = a.public_url || a.storage_url || a.url
      if (key && url) photoMap[key] = url
    })
    return await generateEquipmentV2Pdf(sub, photoMap)
  }
  return await generateSubmissionPdf(sub, sub.assets || [])
}

/**
 * Construye y descarga UN ZIP para una orden cerrada con la estructura:
 *   /PDFs/<orden>_<form>.pdf   (todos los formularios visibles)
 *   /Fotos/<categoria>_<n>.jpg (solo fotos del Additional Photo Report)
 *
 * @param {Object}   order      { id, order_number }
 * @param {Function} onProgress (patch) => void  — reporta { phase, progress }
 */
export async function buildOrderZip(order, onProgress = () => {}) {
  const orderId     = order.id
  const orderNumber = order.order_number || orderId.slice(0, 8)

  onProgress({ phase: 'pdfs', progress: 5 })

  const subs    = await fetchSubmissionsWithAssetsForVisit(orderId)
  const visible = subs.filter(s => isFormVisible(s.form_code))
  if (!visible.length) {
    throw new Error('La orden no tiene formularios para empaquetar')
  }

  const JSZip = (await import('jszip')).default
  const zip   = new JSZip()
  const pdfsFolder  = zip.folder('PDFs')
  const fotosFolder = zip.folder('Fotos')

  // ── 1) PDFs (todos los formularios visibles) ───────────────────────────
  let i = 0
  for (const sub of visible) {
    const fc = normalizeFormCode(sub.form_code)
    try {
      const bytes = await pdfBytesForSubmission(sub)
      if (bytes) {
        const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
        pdfsFolder.file(`${safe(orderNumber)}_${safe(fc)}.pdf`, arr)
      }
    } catch (e) {
      console.error(`[buildOrderZip] PDF error (${fc}):`, e?.message)
      // No abortamos el paquete completo por un PDF; seguimos con los demás.
    }
    i++
    onProgress({ phase: 'pdfs', progress: 5 + Math.round((i / visible.length) * 55) }) // 5→60%
  }

  // ── 2) Fotos del Additional Photo Report ───────────────────────────────
  onProgress({ phase: 'fotos', progress: 62 })
  const photoSubs = visible.filter(s => normalizeFormCode(s.form_code) === 'additional-photo-report')
  const photoAssets = []
  for (const sub of photoSubs) {
    for (const a of (sub.assets || [])) {
      const url = a.public_url || a.storage_url || a.url
      if (url) photoAssets.push({ ...a, _url: url })
    }
  }

  let p = 0
  for (const a of photoAssets) {
    try {
      const resp = await fetch(a._url)
      if (resp.ok) {
        const blob = await resp.blob()
        const ext  = (a.mime || a._url || '').includes('png') ? 'png' : 'jpg'
        const base = safe(a.asset_type || a.type || `foto_${p}`)
        fotosFolder.file(`${base}.${ext}`, blob)
      }
    } catch (e) {
      console.error('[buildOrderZip] foto error:', e?.message)
    }
    p++
    if (photoAssets.length) {
      onProgress({ phase: 'fotos', progress: 62 + Math.round((p / photoAssets.length) * 23) }) // 62→85%
    }
  }

  // Si no hubo fotos, eliminamos la carpeta vacía para no confundir.
  if (!photoAssets.length) {
    zip.remove('Fotos')
  }

  // ── 3) Comprimir y descargar ───────────────────────────────────────────
  onProgress({ phase: 'zip', progress: 88 })
  const content = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => onProgress({ phase: 'zip', progress: 88 + Math.round((meta.percent / 100) * 11) }) // 88→99%
  )

  const url = URL.createObjectURL(content)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safe(orderNumber)}_paquete.zip`
  document.body.appendChild(link); link.click(); document.body.removeChild(link)
  URL.revokeObjectURL(url)

  onProgress({ phase: 'zip', progress: 100 })
}
