import { inspectionSections } from './schemas/inspectionItems.js'
import { groundingSystemTestConfig } from './schemas/groundingSystemTestConfig.js'
import { safetySectionFields, safetyClimbingSections } from './schemas/safetyClimbingDeviceConfig.js'
import { maintenanceFormConfig } from './schemas/maintenanceFormConfig.js'

const IMG = [
  '/photos/p1.png',
  '/photos/p2.png',
  '/photos/p3.png',
  '/photos/p4.png',
]

const pickImg = (i) => IMG[i % IMG.length]

const makePhoto = (id, label, i = 0) => ({ id, label, url: pickImg(i) })

const nowISO = () => new Date().toISOString()

function buildInspectionPayload() {
  const siteInfo = {
    proveedor: 'PTI · Contratista Regional',
    idSitio: 'PTI-CR-SJ-001',
    nombreSitio: 'San José Centro',
    tipoSitio: 'rawland',
    coordenadas: '9.933210, -84.082930',
    direccion: 'San José, Costa Rica (referencia: rotonda La Hispanidad)',
    fecha: '2026-02-01',
    hora: '09:15',
    tipoTorre: 'autosoportada',
    alturaTorre: '45',
  }

  const sections = inspectionSections
    .filter((s) => Array.isArray(s.items))
    .map((s, si) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      items: s.items.map((it, ii) => ({
        id: it.id,
        question: it.text,
        status: (ii % 7 === 0 ? 'regular' : 'bueno'),
        observation: it.hasPhoto
          ? 'Se adjuntó evidencia antes/después. Revisar en mantenimiento semestral.'
          : (ii % 5 === 0 ? 'Sin hallazgos relevantes.' : 'Operación normal.'),
        evidenceRequired: !!it.hasPhoto,
      })),
    }))

  return { siteInfo, sections }
}

function buildGroundingPayload() {
  // Valores base
  const v = {
    proveedor: 'PTI · Contratista Regional',
    tipoVisita: 'Prueba',
    idSitio: 'PTI-CR-SJ-014',
    nombreSitio: 'Torre Escazú',
    direccion: 'Escazú, San José, Costa Rica',
    tipoSitio: 'Torre',
    tipoEstructura: 'Autosoportada',
    alturaMts: 52,
    latitud: '9.947810',
    longitud: '-84.141220',
    fechaInicio: '2026-01-29',
    fechaTermino: '2026-01-29',

    estadoTerreno: 'Húmedo',
    tipoTerreno: 'Arcilloso',
    ultimoDiaLluvia: 'Ayer',
    hora: '14:30',
    notaMetodo: 'Método 62% / estacas a 5m, 10m y 15m; rooftop no aplica.',

    equipoMarca: 'Fluke',
    equipoModelo: '1625-2',
    equipoSerial: 'FLK-1625-2-CR-0091',
    equipoCalibracion: '2025-12-03',

    distanciaElectrodoCorriente: 20,
    rPataTorre: 1.8,
    rCerramiento: 2.1,
    rPorton: 2.4,
    rPararrayos: 1.6,
    rBarraSPT: 1.9,
    rEscalerilla1: 2.2,
    rEscalerilla2: 2.3,

    observaciones: 'Valores estables. Recomendación: inspección visual de uniones y soldaduras en próxima visita.',

    fotoPataTorre: pickImg(0),
    fotoCerramiento: pickImg(1),
    fotoPorton: pickImg(2),
    fotoPararrayos: pickImg(3),
    fotoBarraSPT: pickImg(0),
    fotoEscalerilla1: pickImg(1),
    fotoEscalerilla2: pickImg(2),
  }

  const sum = Number(v.rPataTorre) + Number(v.rCerramiento) + Number(v.rPorton) + Number(v.rPararrayos) + Number(v.rBarraSPT) + Number(v.rEscalerilla1) + Number(v.rEscalerilla2)
  const rg = Math.round((sum / 7) * 100) / 100

  // Estructura por secciones (para visualización completa)
  const sections = groundingSystemTestConfig.sections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    fields: s.fields.reduce((acc, f) => {
      if (f.id === 'sumResistencias') return { ...acc, sumResistencias: sum }
      if (f.id === 'rg') return { ...acc, rg }
      return { ...acc, [f.id]: v[f.id] ?? '' }
    }, {}),
  }))

  return { sections, calculated: { sumResistencias: sum, rg } }
}

function buildSafetyPayload() {
  const base = {
    proveedor: 'PTI · Contratista Regional',
    tipoVisita: 'Inspección',
    idSitio: 'PTI-CR-AL-007',
    nombreSitio: 'Alajuela Norte',
    tipoSitio: 'Torre',
    tipoEstructura: 'Monopolo',
    altura: 38,
    latitud: '10.015430',
    longitud: '-84.214120',
    direccion: 'Alajuela, Costa Rica',
    fechaInicio: '2026-01-31',
    fechaTermino: '2026-01-31',

    herrajeInferior: 'Modelo A-12',
    diametroCable: '8mm',
    comentarioHerrajeInferior: 'Sin deformaciones. Apretado correcto.',
    herrajeSuperior: 'Modelo A-12',
    estadoCable: 'Bueno',
    comentarioCable: 'Sin hebras expuestas. Tensión adecuada.',
    oxidacion: false,
    comentarioOxidacion: 'No se observa oxidación.',

    prensacableInferior: 'Actual',
    cantidadPrensacables: 4,
    distanciamiento: '10cm',
    estadoPrensacables: 'Bueno',
    comentarioPrensacables: 'Sin desgaste visible.',
    prensacableSuperior: 'Actual',
    tipoCarro: 'Carro estándar',
    observacionMordaza: 'Mordaza funciona correctamente.',
    malaSujecion: 'No',
    comentarioMalaSujecion: 'Sujeción estable.',

    fotoEscalera: pickImg(2),
    cantidadTramos: 8,
    estadoEscalera: 'Regular',
    comentarioEscalera: 'Revisar uniones en próximo mantenimiento.',
    cantidadUniones: 7,
    tramosDañados: 'N/A',
    diametroTornillo: 'M12',
    comentarioTornillos: 'Tornillería completa. Torque OK.',

    cantidadPlatinas: 12,
    observacionPlatinas: 'Cantidad correcta. Sin deformaciones.',

    fotoCertificacion: pickImg(3),
    observacionCertificacion: 'Certificación vigente hasta 2026-11-30.',
  }

  const sections = safetyClimbingSections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    fields: (safetySectionFields[s.id] || []).reduce((acc, f) => ({
      ...acc,
      [f.id]: base[f.id] ?? (f.type === 'checkbox' ? false : ''),
    }), {}),
  }))

  return { sections }
}

function buildEquipmentInventoryPayload() {
  return {
    siteInfo: {
      proveedor: 'PTI · Contratista Regional',
      tipoVisita: 'RawLand',
      idSitio: 'PTI-CR-HR-010',
      nombreSitio: 'Heredia Este',
      fechaInicio: '2026-01-28',
      fechaTermino: '2026-01-28',
      direccion: 'Heredia, Costa Rica',
      alturaMts: '42.3',
      tipoSitio: 'RawLand',
      tipoEstructura: 'Autosoportada',
      latitud: '9.998120',
      longitud: '-84.117510',
    },
    torre: {
      items: [
        { alturaMts: '12', orientacion: 'N', tipoEquipo: 'Antena', cantidad: '2', dimensionesMts: '1.2 x 0.3', areaM2: '0.72', carrier: 'Carrier A' },
        { alturaMts: '24', orientacion: 'E', tipoEquipo: 'RRU', cantidad: '3', dimensionesMts: '0.4 x 0.25', areaM2: '0.30', carrier: 'Carrier B' },
        { alturaMts: '36', orientacion: 'S', tipoEquipo: 'Radioenlace', cantidad: '1', dimensionesMts: '0.6 x 0.4', areaM2: '0.24', carrier: 'Carrier C' },
      ],
    },
    piso: {
      clientes: [
        {
          tipoCliente: 'ancla',
          nombreCliente: 'Cliente Ancla',
          areaArrendada: '12 m²',
          areaEnUso: '10 m²',
          placaEquipos: 'PLACA-ANCLA-001',
          gabinetes: [
            { gabinete: 'GAB-01', largo: '0.8', ancho: '0.6', alto: '2.0', fotoRef: pickImg(0) },
            { gabinete: 'GAB-02', largo: '1.0', ancho: '0.6', alto: '2.0', fotoRef: pickImg(1) },
          ],
        },
        {
          tipoCliente: 'colo',
          nombreCliente: 'Cliente COLO 1',
          areaArrendada: '6 m²',
          areaEnUso: '4.5 m²',
          placaEquipos: 'PLACA-COLO-014',
          gabinetes: [
            { gabinete: 'GAB-03', largo: '0.8', ancho: '0.6', alto: '2.0', fotoRef: pickImg(2) },
          ],
        },
      ],
    },
    distribucionTorre: {
      scene: { objects: [{ type: 'antenna', x: 120, y: 80, rot: 0 }, { type: 'rru', x: 220, y: 140, rot: 90 }] },
      pngDataUrl: pickImg(3),
      fotoTorreDataUrl: pickImg(1),
    },
    croquisEsquematico: {
      drawing: 'plantilla-corte-v1',
      pngDataUrl: pickImg(2),
      niveles: { nivel1: '3.2m', nivel2: '6.4m', nivel3: '9.6m', banqueta: '1.2m' },
    },
    planoPlanta: {
      drawing: 'plano-planta-v1',
      pngDataUrl: pickImg(0),
    },
  }
}

function buildMaintenancePayload() {
  // FormData (campos del formulario)
  const formData = {
    proveedor: 'PTI · Contratista Regional',
    tipoVisita: 'preventivo',
    nombreSitio: 'Cartago Sur',
    idSitio: 'PTI-CR-CT-022',
    coordenadas: '9.864120, -83.919880',
    tipoSitio: 'rawland',
    fechaInicio: '2026-01-27',
    fechaTermino: '2026-01-27',
    horaEntrada: '08:05',
    horaSalida: '11:40',

    tipoTorre: 'autosoportada',
    alturaTorre: '48',
    alturaEdificio: '0',
    condicionTorre: 'bueno',
    numSecciones: '5',
    tipoSeccion: 'triangular',
    tipoPierna: 'angular',
    tieneCamuflaje: 'no',
    tipoCamuflaje: '',
    fotoTorre: pickImg(0),

    calle: 'Ruta 2',
    numero: 'S/N',
    colonia: 'Cartago',
    ciudad: 'Cartago',
    estado: 'Cartago',
    codigoPostal: '30101',
    pais: 'Costa Rica',

    descripcionSitio: 'abierto',
    restriccionHorario: 'no',
    descripcionAcceso: 'Ingreso por portón principal, 150m hasta la caseta.',
    propietarioLocalizable: 'no',
    tipoLlave: 'candado',
    claveCombinacion: '',
    memorandumRequerido: 'no',
    problemasAcceso: 'Sin inconvenientes.',
    fotoCandado: pickImg(1),

    ubicacionMedidores: 'Caseta principal',
    tipoConexion: 'monofasica',
    capacidadTransformador: '50 kVA',
    numMedidores: 2,
    medidorSeparadoLuces: 'si',
    fibraOptica: 'si',

    vandalismo: 'no',
    descripcionVandalismo: '',
    equiposFaltantes: 'no',
    defectosOperacion: 'no',
    observacionesGenerales: 'Mantenimiento completado. Se recomienda revisión menor en 90 días.',
  }

  // Checklist (a partir del config original)
  const checklistItems = []
  maintenanceFormConfig.steps
    .filter((s) => s.type === 'checklist' && Array.isArray(s.items))
    .forEach((step, stepIndex) => {
      step.items.forEach((it, i) => {
        // Responder TODO para evitar faltantes
        const status = (i % 9 === 0 ? 'regular' : 'bueno')
        const includePhotos = stepIndex === 0 && i < 8 // solo primeras evidencias, para no saturar
        checklistItems.push({
          id: it.id,
          stepId: step.id,
          stepTitle: step.title,
          question: it.text || it.label || it.title || `Ítem ${it.id}`,
          status,
          observation: (i % 4 === 0 ? 'Requiere seguimiento menor.' : 'OK.'),
          beforePhoto: includePhotos ? pickImg(i) : '',
          afterPhoto: includePhotos ? pickImg(i + 1) : '',
        })
      })
    })

  return {
    formData,
    checklistItems,
  }
}

// ======================= ORDERS =======================

export const mockOrders = [
  {
    id: 'PTI-INS-0001',
    type: 'Inspección General',
    status: 'submitted',
    siteId: 'PTI-CR-SJ-001',
    siteName: 'San José Centro',
    inspectorName: 'Kevin Morales',
    createdAt: '2026-02-01T14:22:00.000Z',
    updatedAt: '2026-02-01T15:08:00.000Z',
    completion: 0.92,
    notes: 'Inspección general completada. Se adjuntó evidencia en puntos críticos (acceso y malla).',
    fields: {
      Proveedor: 'PTI · Contratista Regional',
      'Tipo de sitio': 'Rawland',
      'Tipo de torre': 'Autosoportada',
      'Altura (m)': '45',
      Coordenadas: '9.933210, -84.082930',
    },
    photos: [
      makePhoto('acc-3-before', 'Candado/Acceso · Antes', 0),
      makePhoto('acc-3-after', 'Candado/Acceso · Después', 1),
      makePhoto('seg-1-before', 'Malla perimetral · Antes', 2),
      makePhoto('seg-1-after', 'Malla perimetral · Después', 3),
    ],
    payload: buildInspectionPayload(),
  },

  {
    id: 'PTI-MAN-0001',
    type: 'Mantenimiento Preventivo',
    status: 'reviewed',
    siteId: 'PTI-CR-CT-022',
    siteName: 'Cartago Sur',
    inspectorName: 'Daniela Rojas',
    createdAt: '2026-01-27T14:10:00.000Z',
    updatedAt: '2026-01-27T17:50:00.000Z',
    completion: 0.88,
    notes: 'Mantenimiento preventivo ejecutado. Evidencia adjunta en torre, candado y checklist inicial.',
    fields: {
      Proveedor: 'PTI · Contratista Regional',
      'Tipo de sitio': 'Rawland',
      'Tipo de torre': 'Autosoportada',
      'Altura (m)': '48',
      Coordenadas: '9.864120, -83.919880',
    },
    photos: [
      makePhoto('fotoTorre', 'Foto de la torre', 0),
      makePhoto('fotoCandado', 'Candado/Llave', 1),
      makePhoto('chk-1-before', 'Checklist · Antes', 2),
      makePhoto('chk-1-after', 'Checklist · Después', 3),
    ],
    payload: buildMaintenancePayload(),
  },

  {
    id: 'PTI-INV-0001',
    type: 'Inventario de Equipos',
    status: 'submitted',
    siteId: 'PTI-CR-HR-010',
    siteName: 'Heredia Este',
    inspectorName: 'Luis Vargas',
    createdAt: '2026-01-28T13:30:00.000Z',
    updatedAt: '2026-01-28T16:05:00.000Z',
    completion: 0.95,
    notes: 'Inventario de equipos completado. Incluye croquis, distribución y plano de planta.',
    fields: {
      Proveedor: 'PTI · Contratista Regional',
      'Tipo de visita': 'RawLand',
      'Tipo de estructura': 'Autosoportada',
      'Altura (m)': '42.3',
      Coordenadas: '9.998120, -84.117510',
    },
    photos: [
      makePhoto('gab-01', 'Gabinete GAB-01', 0),
      makePhoto('gab-02', 'Gabinete GAB-02', 1),
      makePhoto('gab-03', 'Gabinete GAB-03', 2),
      makePhoto('distribucion', 'Distribución de torre', 3),
      makePhoto('croquis', 'Croquis esquemático', 0),
      makePhoto('plano', 'Plano de planta', 1),
    ],
    payload: buildEquipmentInventoryPayload(),
  },

  {
    id: 'PTI-ASC-0001',
    type: 'Sistema de ascenso',
    status: 'draft',
    siteId: 'PTI-CR-AL-007',
    siteName: 'Alajuela Norte',
    inspectorName: 'María Fernanda P.',
    createdAt: '2026-01-31T15:20:00.000Z',
    updatedAt: '2026-01-31T16:10:00.000Z',
    completion: 0.72,
    notes: 'Revisión de sistema de ascenso en progreso. Evidencia de escalera y certificación adjunta.',
    fields: {
      Proveedor: 'PTI · Contratista Regional',
      'Tipo de estructura': 'Monopolo',
      'Altura (m)': '38',
      Coordenadas: '10.015430, -84.214120',
      'Estado cable': 'Bueno',
    },
    photos: [
      makePhoto('fotoEscalera', 'Foto escalera', 2),
      makePhoto('fotoCertificacion', 'Certificación', 3),
    ],
    payload: buildSafetyPayload(),
  },

  {
    id: 'PTI-GND-0001',
    type: 'Prueba de puesta a tierra',
    status: 'reviewed',
    siteId: 'PTI-CR-SJ-014',
    siteName: 'Torre Escazú',
    inspectorName: 'Andrea Solís',
    createdAt: '2026-01-29T20:10:00.000Z',
    updatedAt: '2026-01-29T22:35:00.000Z',
    completion: 1.0,
    notes: 'Medición completada con valores estables. Evidencia por punto incluida.',
    fields: {
      Proveedor: 'PTI · Contratista Regional',
      'Tipo de visita': 'Prueba',
      'Tipo de estructura': 'Autosoportada',
      'Altura (m)': '52',
      Coordenadas: '9.947810, -84.141220',
    },
    photos: [
      makePhoto('fotoPataTorre', 'Pata de la torre', 0),
      makePhoto('fotoCerramiento', 'Cerramiento', 1),
      makePhoto('fotoPorton', 'Portón', 2),
      makePhoto('fotoPararrayos', 'Pararrayos', 3),
      makePhoto('fotoBarraSPT', 'Barra SPT', 0),
      makePhoto('fotoEscalerilla1', 'Escalerilla #1', 1),
      makePhoto('fotoEscalerilla2', 'Escalerilla #2', 2),
    ],
    payload: buildGroundingPayload(),
  },
]
