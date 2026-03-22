import { ClipboardCheck, Wrench, Camera, Package, Shield, Zap, LayoutList, Image } from 'lucide-react'

export const FORM_TYPES = {
  'inspection-general': {
    label: 'Inspección General',
    shortLabel: 'Inspección',
    icon: ClipboardCheck,
    color: 'bg-blue-500',
    colorLight: 'bg-blue-50 text-blue-700',
  },
  'preventive-maintenance': {
    label: 'Mantenimiento Preventivo',
    shortLabel: 'Mant. Preventivo',
    icon: Wrench,
    color: 'bg-orange-500',
    colorLight: 'bg-orange-50 text-orange-700',
  },
  'executed-maintenance': {
    label: 'Mantenimiento Ejecutado',
    shortLabel: 'Mant. Ejecutado',
    icon: Camera,
    color: 'bg-emerald-500',
    colorLight: 'bg-emerald-50 text-emerald-700',
  },
  'equipment': {
    label: 'Inventario de Equipos',
    shortLabel: 'Inventario',
    icon: LayoutList,
    color: 'bg-rose-500',
    colorLight: 'bg-rose-50 text-rose-700',
  },
  'equipment-v2': {
    label: 'Inventario de Equipos v2',
    shortLabel: 'Inventario v2',
    icon: Package,
    color: 'bg-cyan-400',
    colorLight: 'bg-cyan-50 text-cyan-700',
  },
  'safety-system': {
    label: 'Sistema de Ascenso',
    shortLabel: 'Ascenso',
    icon: Shield,
    color: 'bg-yellow-400',
    colorLight: 'bg-yellow-50 text-yellow-700',
  },
  'grounding-system-test': {
    label: 'Prueba de Puesta a Tierra',
    shortLabel: 'Puesta a Tierra',
    icon: Zap,
    color: 'bg-purple-500',
    colorLight: 'bg-purple-50 text-purple-700',
  },
  'additional-photo-report': {
    label: 'Reporte Adicional de Fotografías',
    shortLabel: 'Reporte de Fotos',
    icon: Image,
    color: 'bg-pink-500',
    colorLight: 'bg-pink-50 text-pink-700',
  },
}

const CODE_ALIASES = {
  'inspeccion':            'inspection-general',
  'mantenimiento':         'preventive-maintenance',
  'mantenimiento-ejecutado':'executed-maintenance',
  'inventario':            'equipment',
  'inventario-v2':         'equipment-v2',
  'puesta-tierra':         'grounding-system-test',
  'sistema-ascenso':       'safety-system',
  'inspection-general':    'inspection-general',
  'preventive-maintenance':'preventive-maintenance',
  'executed-maintenance':  'executed-maintenance',
  'equipment':             'equipment',
  'equipment-v2':          'equipment-v2',
  'safety-system':         'safety-system',
  'grounding-system-test': 'grounding-system-test',
  'additional-photo-report': 'additional-photo-report',
  'additional-photo':        'additional-photo-report',
  'reporte-fotos':           'additional-photo-report',
}

export function normalizeFormCode(code) {
  if (!code) return code
  return CODE_ALIASES[code] || code
}

export function getFormCodeSiblings(code) {
  if (!code) return []
  const canonical = normalizeFormCode(code)
  return Object.entries(CODE_ALIASES)
    .filter(([, v]) => v === canonical)
    .map(([k]) => k)
    .filter(k => k !== code)
}

export const FORM_CODES = Object.keys(FORM_TYPES)

export const HIDDEN_FORM_CODES = new Set(['inspection-general', 'inspeccion'])

export function isFormVisible(formCode) {
  const normalized = normalizeFormCode(formCode)
  return !HIDDEN_FORM_CODES.has(normalized) && !HIDDEN_FORM_CODES.has(formCode)
}

export function getFormMeta(formCode) {
  const direct = FORM_TYPES[formCode]
  if (direct) return direct
  const normalized = normalizeFormCode(formCode)
  return FORM_TYPES[normalized] || {
    label: formCode || 'Desconocido',
    shortLabel: formCode || '?',
    icon: ClipboardCheck,
    color: 'bg-gray-500',
    colorLight: 'bg-gray-50 text-gray-700',
  }
}
