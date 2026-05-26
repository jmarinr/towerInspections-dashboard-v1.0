import { getRegionName } from '../lib/regionsCatalog'

// Etiquetas de estado consistentes con la tabla de Visitas (Orders.jsx)
const STATE_LABELS = {
  'closed':      'Cerrada',
  'con-avance':  'Con avance',
  'sin-iniciar': 'Sin iniciar',
  'en-curso':    'En curso',
  'cancelled':   'Cancelada',
}

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return d.toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Genera y descarga un Excel con formato (colores) de las visitas filtradas.
 * Incluye datos de la visita + los campos de revisión (Revisado, Revisado por,
 * Fecha de revisión, Nota).
 *
 * @param {Array}  orders     dataset filtrado activo (filtered de Orders.jsx)
 * @param {Object} reviewsMap { [visit_id]: { reviewed, reviewed_by, reviewed_at, comment } }
 */
export async function exportVisitsExcel(orders = [], reviewsMap = {}) {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))
  const wb = new ExcelJS.Workbook()
  wb.creator = 'PTI Admin Panel'
  wb.created = new Date()
  const ws = wb.addWorksheet('Visitas', {
    views: [{ state: 'frozen', ySplit: 1 }], // congela la fila de encabezados
  })

  // Definición de columnas (orden y ancho)
  ws.columns = [
    { header: 'Orden',             key: 'orden',      width: 28 },
    { header: 'ID Sitio',          key: 'idSitio',    width: 14 },
    { header: 'Sitio',             key: 'sitio',      width: 26 },
    { header: 'Inspector',         key: 'inspector',  width: 20 },
    { header: 'Región',            key: 'region',     width: 18 },
    { header: 'Fecha',             key: 'fecha',      width: 12 },
    { header: 'Estado',            key: 'estado',     width: 13 },
    { header: 'Revisado',          key: 'revisado',   width: 11 },
    { header: 'Revisado por',      key: 'revisadoPor',width: 26 },
    { header: 'Fecha de revisión', key: 'fechaRev',   width: 18 },
    { header: 'Nota',              key: 'nota',       width: 48 },
  ]

  // ── Estilo de encabezados ──────────────────────────────────────────────
  const headerRow = ws.getRow(1)
  headerRow.height = 20
  headerRow.eachCell((cell, colNumber) => {
    // Verde para datos de visita (cols 1-7), azul para campos nuevos (cols 8-11)
    const isNew = colNumber >= 8
    cell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: isNew ? 'FF0C447C' : 'FF0F6E56' },
    }
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 8 ? 'center' : 'left' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    }
  })

  // ── Filas de datos ─────────────────────────────────────────────────────
  orders.forEach(o => {
    const rv = reviewsMap[o.id] || {}
    const subState = o.subState || (o.status === 'closed' ? 'closed' : 'sin-iniciar')

    const row = ws.addRow({
      orden:       o.order_number || '—',
      idSitio:     o.site_id || '—',
      sitio:       o.site_name || '—',
      inspector:   o.inspector_name || '—',
      region:      getRegionName(o.region_id),
      fecha:       fmtDate(o.started_at),
      estado:      STATE_LABELS[subState] || subState || '—',
      revisado:    rv.reviewed ? 'Sí' : 'No',
      revisadoPor: rv.reviewed_by || '—',
      fechaRev:    rv.reviewed ? fmtDateTime(rv.reviewed_at) : '—',
      nota:        rv.comment || '',
    })

    // Celda "Revisado" coloreada según valor
    const revCell = row.getCell('revisado')
    revCell.alignment = { horizontal: 'center' }
    if (rv.reviewed) {
      revCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1F5EE' } }
      revCell.font = { color: { argb: 'FF085041' }, bold: true }
    } else {
      revCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1EFE8' } }
      revCell.font = { color: { argb: 'FF5F5E5A' } }
    }

    row.getCell('nota').alignment = { wrapText: true, vertical: 'top' }
    row.alignment = { vertical: 'middle' }
  })

  // Autofiltro sobre el rango completo
  ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } }

  // ── Descargar ──────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Visitas_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
