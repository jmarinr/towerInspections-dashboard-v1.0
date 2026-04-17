/**
 * quarterUtils.js
 * Lógica de cuatrimestres compartida entre todos los reportes.
 * Q1 = Ene–Abr · Q2 = May–Ago · Q3 = Sep–Dic
 */

export const QUARTER_RANGES = {
  Q1: { label: 'Q1 (Ene–Abr)', start: '-01-01', end: '-04-30' },
  Q2: { label: 'Q2 (May–Ago)', start: '-05-01', end: '-08-31' },
  Q3: { label: 'Q3 (Sep–Dic)', start: '-09-01', end: '-12-31' },
}

export function getCurrentQuarter() {
  const month = new Date().getMonth() + 1
  if (month <= 4) return 'Q1'
  if (month <= 8) return 'Q2'
  return 'Q3'
}

export function getQuarterKey(date) {
  const d     = new Date(date)
  const year  = d.getFullYear()
  const month = d.getMonth() + 1
  const q     = month <= 4 ? 'Q1' : month <= 8 ? 'Q2' : 'Q3'
  return `${q}-${year}`
}

export function getQuarterOptions(dates) {
  const seen = new Set()
  return dates
    .filter(Boolean)
    .map(d => {
      const date  = new Date(d)
      const year  = date.getFullYear()
      const month = date.getMonth() + 1
      const q     = month <= 4 ? 'Q1' : month <= 8 ? 'Q2' : 'Q3'
      return { key: `${q}-${year}`, q, year }
    })
    .filter(o => { if (seen.has(o.key)) return false; seen.add(o.key); return true })
    .sort((a, b) => b.year - a.year || b.q.localeCompare(a.q))
    .map(o => ({
      value: o.key,
      label: `${QUARTER_RANGES[o.q].label} ${o.year}`,
      start: new Date(`${o.year}${QUARTER_RANGES[o.q].start}`),
      end:   new Date(`${o.year}${QUARTER_RANGES[o.q].end}T23:59:59`),
    }))
}

export function isInQuarter(dateStr, quarter) {
  if (!dateStr || !quarter) return true
  const date = new Date(dateStr)
  return date >= quarter.start && date <= quarter.end
}

export function getCurrentQuarterOption(options) {
  const currentKey = `${getCurrentQuarter()}-${new Date().getFullYear()}`
  return options.find(o => o.value === currentKey) || options[0] || null
}
