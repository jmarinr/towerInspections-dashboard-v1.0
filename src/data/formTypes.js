import { ClipboardCheck, Wrench, Camera, Package, Shield, Zap } from 'lucide-react'

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
    color: 'bg-teal-500',
    colorLight: 'bg-teal-50 text-teal-700',
  },
  'equipment': {
    label: 'Inventario de Equipos',
    shortLabel: 'Inventario',
    icon: Package,
    color: 'bg-emerald-500',
    colorLight: 'bg-emerald-50 text-emerald-700',
  },
  'safety-system': {
    label: 'Sistema de Ascenso',
    shortLabel: 'Ascenso',
    icon: Shield,
    color: 'bg-indigo-500',
    colorLight: 'bg-indigo-50 text-indigo-700',
  },
  'grounding-system-test': {
    label: 'Prueba de Puesta a Tierra',
    shortLabel: 'Puesta a Tierra',
    icon: Zap,
    color: 'bg-purple-500',
    colorLight: 'bg-purple-50 text-purple-700',
  },
}

export const FORM_CODES = Object.keys(FORM_TYPES)

export function getFormMeta(formCode) {
  return FORM_TYPES[formCode] || {
    label: formCode || 'Desconocido',
    shortLabel: formCode || '?',
    icon: ClipboardCheck,
    color: 'bg-gray-500',
    colorLight: 'bg-gray-50 text-gray-700',
  }
}
