// Estructura completa del formulario de Mantenimiento Preventivo
// Basado en: 1_Preventive_Maintenance_Inspection__Check_list___5_.xlsx

export const maintenanceFormConfig = {
  categories: [
    { id: 'info', name: 'Info', icon: '📋', steps: [1, 2, 3, 4, 5] },
    { id: 'sitio', name: 'Sitio', icon: '🔍', steps: [6, 7, 8, 9, 10] },
    { id: 'torre', name: 'Torre', icon: '🗼', steps: [11, 12, 13, 14, 15, 16] },
    { id: 'cierre', name: 'Cierre', icon: '📝', steps: [17] },
  ],
  steps: [
    // ============ CATEGORÍA: INFO (Pasos 1-5) ============
    {
      id: 1,
      category: 'info',
      title: 'Información General',
      subtitle: 'Datos del sitio y visita',
      icon: '📋',
      type: 'form',
      fields: [
        { id: 'proveedor', label: 'Proveedor', type: 'text', required: true, placeholder: 'Ej: Servicios de Torres CR' },
        { id: 'tipoVisita', label: 'Tipo de Visita', type: 'select', required: true, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'preventivo', label: 'Mantenimiento Preventivo' },
          { value: 'correctivo', label: 'Mantenimiento Correctivo' },
          { value: 'emergencia', label: 'Emergencia' },
        ]},
        { id: 'nombreSitio', label: 'Nombre del Sitio', type: 'text', required: true, placeholder: 'Ej: San José Centro' },
        { id: 'idSitio', label: 'ID/Número del Sitio', type: 'text', required: true, placeholder: 'Ej: PTI-CR-SJ-001' },
        { id: 'tipoSitio', label: 'Tipo de Sitio', type: 'toggle', required: true, options: [
          { value: 'urbano', label: 'Urbano' },
          { value: 'rural', label: 'Rural' },
          { value: 'rawland', label: 'Rawland' },
          { value: 'rooftop', label: 'Rooftop' },
        ]},
        { id: 'horaSalida', label: 'Hora de Salida', type: 'time', required: true },
      ]
    },
    {
      id: 2,
      category: 'info',
      title: 'Información de la Torre',
      subtitle: 'Datos técnicos de la estructura',
      icon: '🗼',
      type: 'form',
      fields: [
        { id: 'tipoTorre', label: 'Tipo de Torre', type: 'select', required: true, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'autosoportada', label: 'Autosoportada' },
          { value: 'monopolo', label: 'Monopolo' },
          { value: 'arriostrada', label: 'Arriostrada' },
          { value: 'mastil', label: 'Mástil' },
        ]},
        { id: 'alturaTorre', label: 'Altura de la Torre (m)', type: 'number', required: true, placeholder: 'Ej: 45' },
        { id: 'alturaEdificio', label: 'Altura del Edificio (m)', type: 'number', required: false, placeholder: 'Solo Rooftop', showIf: { field: 'tipoSitio', value: 'rooftop' } },
        { id: 'alturaTotal', label: 'Altura Total (m)', type: 'calculated', formula: 'alturaTorre + alturaEdificio' },
        { id: 'condicionTorre', label: 'Condición General de la Torre', type: 'status', required: true },
        { id: 'numSecciones', label: 'Número de Secciones', type: 'number', placeholder: 'Ej: 5' },
        { id: 'tipoSeccion', label: 'Tipo de Sección', type: 'select', showIf: { field: 'tipoTorre', values: ['autosoportada', 'arriostrada'] }, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'triangular', label: 'Triangular' },
          { value: 'cuadrada', label: 'Cuadrada' },
        ]},
        { id: 'tipoPierna', label: 'Tipo de Pierna', type: 'select', showIf: { field: 'tipoTorre', values: ['autosoportada', 'arriostrada'] }, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'tubular', label: 'Tubular' },
          { value: 'angular', label: 'Angular' },
        ]},
        { id: 'tieneCamuflaje', label: '¿Tiene Camuflaje?', type: 'select', options: [
          { value: '', label: 'Seleccione...' },
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ]},
        { id: 'tipoCamuflaje', label: 'Tipo de Camuflaje', type: 'text', showIf: { field: 'tieneCamuflaje', value: 'si' }, placeholder: 'Describir tipo' },
        { id: 'fotoTorre', label: 'Foto de la Torre', type: 'photo', required: true },
      ]
    },
    {
      id: 3,
      category: 'info',
      title: 'Dirección del Sitio',
      subtitle: 'Ubicación física completa',
      icon: '📍',
      type: 'form',
      fields: [
        { id: 'calle', label: 'Calle', type: 'text', required: true, placeholder: 'Nombre de la calle' },
        { id: 'numero', label: 'Número', type: 'text', placeholder: 'Número exterior' },
        { id: 'colonia', label: 'Colonia/Barrio', type: 'text', required: true, placeholder: 'Nombre de la colonia' },
        { id: 'ciudad', label: 'Ciudad', type: 'text', required: true, placeholder: 'Ciudad' },
        { id: 'estado', label: 'Estado/Provincia', type: 'text', required: true, placeholder: 'Estado' },
        { id: 'codigoPostal', label: 'Código Postal', type: 'text', placeholder: 'Ej: 10101' },
        { id: 'pais', label: 'País', type: 'text', required: true, placeholder: 'Ej: Costa Rica' },
      ]
    },
    {
      id: 4,
      category: 'info',
      title: 'Acceso al Sitio',
      subtitle: 'Información de acceso y llaves',
      icon: '🔑',
      type: 'form',
      fields: [
        { id: 'descripcionSitio', label: 'Descripción del Sitio', type: 'select', required: true, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'facil', label: 'Fácil acceso' },
          { value: 'restringido', label: 'Acceso restringido' },
          { value: 'dificil', label: 'Difícil acceso' },
        ]},
        { id: 'restriccionHorario', label: 'Restricción de Horario', type: 'select', options: [
          { value: '', label: 'Seleccione...' },
          { value: 'sin', label: 'Sin restricción' },
          { value: 'limitado', label: 'Horario limitado' },
          { value: 'habiles', label: 'Solo días hábiles' },
        ]},
        { id: 'descripcionAcceso', label: 'Descripción de Acceso', type: 'textarea', placeholder: 'Indicaciones para llegar al sitio...' },
        { id: 'propietarioLocalizable', label: 'Propietario Localizable en Sitio', type: 'select', options: [
          { value: '', label: 'Seleccione...' },
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ]},
        { id: 'tipoLlave', label: 'Tipo de Llave', type: 'select', required: true, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'candado_pti', label: 'Candado PTI' },
          { value: 'llave_especial', label: 'Llave especial' },
          { value: 'combinacion', label: 'Combinación' },
          { value: 'sin_llave', label: 'Sin llave' },
        ]},
        { id: 'claveCombinacion', label: 'Clave/Combinación', type: 'text', showIf: { field: 'tipoLlave', value: 'combinacion' }, placeholder: 'Ingresar combinación' },
        { id: 'memorandumRequerido', label: 'Memorándum Requerido', type: 'select', options: [
          { value: '', label: 'Seleccione...' },
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ]},
        { id: 'problemasAcceso', label: 'Problemas de Acceso', type: 'textarea', placeholder: 'Describir problemas si existen...' },
        { id: 'fotoCandado', label: 'Foto de Candado/Llave', type: 'photo', required: true },
      ]
    },
    {
      id: 5,
      category: 'info',
      title: 'Servicios Eléctricos',
      subtitle: 'Información del suministro eléctrico',
      icon: '⚡',
      type: 'form',
      fields: [
        { id: 'ubicacionMedidores', label: 'Ubicación de Medidores', type: 'text', placeholder: 'Describir ubicación' },
        { id: 'tipoConexion', label: 'Tipo de Conexión Eléctrica', type: 'select', required: true, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'monofasica', label: 'Monofásica' },
          { value: 'bifasica', label: 'Bifásica' },
          { value: 'trifasica', label: 'Trifásica' },
        ]},
        { id: 'capacidadTransformador', label: 'Capacidad del Transformador', type: 'text', placeholder: 'Ej: 50 kVA' },
        { id: 'numMedidores', label: 'Número de Medidores', type: 'number', placeholder: 'Ej: 2' },
        { id: 'medidorSeparadoLuces', label: 'Medidor Separado para Luces de Torre', type: 'select', options: [
          { value: '', label: 'Seleccione...' },
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ]},
        { id: 'fibraOptica', label: 'Fibra Óptica en Sitio', type: 'select', options: [
          { value: '', label: 'Seleccione...' },
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ]},
      ]
    },

    // ============ CATEGORÍA: SITIO (Pasos 6-10) ============
    {
      id: 6,
      category: 'sitio',
      title: 'Inspección - Acceso',
      subtitle: '5 ítems de evaluación',
      icon: '🚪',
      type: 'checklist',
      items: [
        { id: '1.1', name: 'Camino de Acceso', description: 'Verificar condición del camino de acceso al sitio' },
        { id: '1.2', name: 'Limpieza Exterior', description: 'Estado de limpieza en el área exterior del sitio' },
        { id: '1.3', name: 'Candado y Acceso Principal', description: 'Condición del candado y puerta de acceso principal' },
        { id: '1.4', name: 'Escaleras de Acceso', description: 'Escaleras de acceso al inmueble y azotea' },
        { id: '1.5', name: 'Limpieza General Interior', description: 'Estado de limpieza en el área interior del sitio' },
      ]
    },
    {
      id: 7,
      category: 'sitio',
      title: 'Inspección - Seguridad',
      subtitle: '7 ítems de evaluación',
      icon: '🔒',
      type: 'checklist',
      items: [
        { id: '2.1', name: 'Condición de la Malla Ciclónica', description: 'Verificar estado de toda la malla perimetral' },
        { id: '2.2', name: 'Cimentación de Malla Ciclónica', description: 'Condición de la base y cimentación de la malla' },
        { id: '2.3', name: 'Condición de Muros', description: 'Estado de los muros perimetrales' },
        { id: '2.4', name: 'Alambre de Púas y Concertina', description: 'Condición del alambre de seguridad superior' },
        { id: '2.5', name: 'Puerta se Puede Cerrar con Candado', description: 'Verificar que la puerta cierra correctamente' },
        { id: '2.6', name: 'Condición de Puerta Principal', description: 'Estado general de la puerta de acceso' },
        { id: '2.7', name: 'Cámaras o Sistema de Monitoreo', description: 'Funcionamiento del sistema de vigilancia' },
      ]
    },
    {
      id: 8,
      category: 'sitio',
      title: 'Inspección - Sistema de Tierras',
      subtitle: '6 ítems de evaluación',
      icon: '⚡',
      type: 'checklist',
      items: [
        { id: '3.1', name: 'Condición del Cable', description: 'Estado del cable de tierra principal' },
        { id: '3.2', name: 'Condición de las Soldaduras', description: 'Verificar soldaduras exotérmicas' },
        { id: '3.3', name: 'Prueba de Resistividad', description: 'Realizar medición de resistividad', hasValueInput: true, valueLabel: 'Valor (Ω)' },
        { id: '3.4', name: 'Registros / Cámaras de Inspección', description: 'Condición de los registros de tierra' },
        { id: '3.5', name: 'Conexiones para Aterrizar la Torre', description: 'Verificar conexiones de tierra de la torre' },
        { id: '3.6', name: 'Conexiones para Aterrizar Malla/Muros', description: 'Conexiones de tierra de malla y muros' },
      ]
    },
    {
      id: 9,
      category: 'sitio',
      title: 'Inspección - Sistema Eléctrico',
      subtitle: '12 ítems de evaluación',
      icon: '🔌',
      type: 'checklist',
      items: [
        { id: '4.1', name: 'Estado del Nicho Eléctrico', description: 'Condición general del nicho o gabinete eléctrico' },
        { id: '4.2', name: 'Candado de Seguridad y Protección', description: 'Verificar candado del nicho eléctrico' },
        { id: '4.3', name: 'Registros Eléctricos', description: 'Condición de los registros eléctricos' },
        { id: '4.4', name: 'Postes', description: 'Condición de postes eléctricos en el sitio' },
        { id: '4.5', name: 'Transformador o Subestación', description: 'Estado general del transformador' },
        { id: '4.6', name: 'Tipo de Transformador', description: 'Pedestal o Poste', hasValueInput: true, valueLabel: 'Tipo' },
        { id: '4.7', name: 'Marca del Transformador', description: 'Registrar marca', hasValueInput: true, valueLabel: 'Marca' },
        { id: '4.8', name: 'Capacidad del Transformador', description: 'Registrar capacidad', hasValueInput: true, valueLabel: 'kVA' },
        { id: '4.9', name: 'Número de Serie del Transformador', description: 'Registrar número de serie', hasValueInput: true, valueLabel: 'Serie' },
        { id: '4.10', name: 'Poste del Transformador', description: 'Condición del poste donde está el transformador' },
        { id: '4.11', name: 'Número de Medidor de cada Cliente', description: 'Registrar números de medidores', hasValueInput: true, valueLabel: 'Números' },
        { id: '4.12', name: 'Tierras del Sistema Eléctrico', description: 'Condición de las tierras eléctricas' },
      ]
    },
    {
      id: 10,
      category: 'sitio',
      title: 'Inspección - Sitio en General',
      subtitle: '11 ítems de evaluación',
      icon: '🏗️',
      type: 'checklist',
      items: [
        { id: '5.1', name: 'Condición y Nivel de Grava', description: 'Verificar nivel y estado de la grava' },
        { id: '5.2', name: 'Malla Antivegetal (Antipasto)', description: 'Condición de la malla contra maleza' },
        { id: '5.3', name: 'Protección de Nicho', description: 'Estado de la protección del nicho eléctrico' },
        { id: '5.4', name: 'Drenaje del Sitio', description: 'Verificar que el drenaje esté libre y funcionando' },
        { id: '5.5', name: 'Pintura Exterior e Interior', description: 'Condición de la pintura en general' },
        { id: '5.6', name: 'Grietas en Base de Torre', description: 'Verificar grietas o asentamientos en base' },
        { id: '5.7', name: 'Grietas en Dados de Torre', description: 'Verificar grietas en dados de concreto' },
        { id: '5.8', name: 'Grietas en Base de Equipos', description: 'Verificar asentamientos en bases de equipos' },
        { id: '5.9', name: 'Grietas/Encharcamientos en Azotea', description: 'Solo para sitios Rooftop', showIf: { field: 'tipoSitio', value: 'rooftop' } },
        { id: '5.10', name: 'Impermeabilizado en Área Rentada', description: 'Condición del impermeabilizado', showIf: { field: 'tipoSitio', value: 'rooftop' } },
        { id: '5.11', name: 'Condición General de Azotea', description: 'Estado general del área rentada', showIf: { field: 'tipoSitio', value: 'rooftop' } },
      ]
    },

    // ============ CATEGORÍA: TORRE (Pasos 11-16) ============
    {
      id: 11,
      category: 'torre',
      title: 'Inspección - Miembros de Torre',
      subtitle: '15 ítems de evaluación',
      icon: '🔩',
      type: 'checklist',
      items: [
        { id: '6.1', name: 'Miembros de Torre Dañados', description: 'Verificar si hay miembros estructurales dañados' },
        { id: '6.2', name: 'Miembros Flojos', description: 'Verificar si hay miembros sueltos o flojos' },
        { id: '6.3', name: 'Miembros Faltantes', description: 'Verificar si faltan miembros estructurales' },
        { id: '6.4', name: 'Escalera de Ascenso', description: 'Condición de la escalera de la torre' },
        { id: '6.5', name: 'Tornillos en Bridas Completos', description: 'Verificar que todos los tornillos estén presentes' },
        { id: '6.6', name: 'Tornillos en Bridas de Abajo hacia Arriba', description: 'Verificar orientación correcta de tornillos' },
        { id: '6.7', name: 'Tornillos en Celosías Completos', description: 'Verificar tornillos en elementos de celosía' },
        { id: '6.8', name: 'Tornillos en Celosías de Adentro hacia Afuera', description: 'Verificar orientación correcta' },
        { id: '6.9', name: 'Soldadura entre Pierna y Brida', description: 'Condición de soldaduras estructurales' },
        { id: '6.10', name: 'Cable de Vida', description: 'Condición del cable de vida para ascenso' },
        { id: '6.11', name: 'Step Bolt y Equipo de Seguridad', description: 'Condición de peldaños y equipos de seguridad' },
        { id: '6.12', name: 'Dren de Piernas de Torre', description: 'Verificar que los drenes estén presentes y funcionales' },
        { id: '6.13', name: 'Grout', description: 'Verificar que el grout esté presente y en buen estado' },
        { id: '6.14', name: 'Estado del Camuflaje', description: 'Verificar condición del camuflaje si existe' },
        { id: '6.15', name: 'Verticalidad', description: 'Verificar que la torre esté vertical' },
      ]
    },
    {
      id: 12,
      category: 'torre',
      title: 'Inspección - Acabado',
      subtitle: '3 ítems de evaluación',
      icon: '🎨',
      type: 'checklist',
      items: [
        { id: '7.1', name: 'Condición de la Pintura', description: 'Estado de la pintura de la torre' },
        { id: '7.2', name: 'Condición del Galvanizado', description: 'Estado del galvanizado estructural' },
        { id: '7.3', name: 'Oxidación', description: 'Verificar presencia de oxidación' },
      ]
    },
    {
      id: 13,
      category: 'torre',
      title: 'Inspección - Luces de Torre',
      subtitle: '10 ítems de evaluación',
      icon: '💡',
      type: 'checklist',
      items: [
        { id: '8.1', name: 'Sistema de Balizamiento Instalado', description: 'Tipo de sistema instalado', hasValueInput: true, valueLabel: 'Tipo' },
        { id: '8.2', name: 'Sistema de Luz Funcionando', description: 'Verificar que las luces funcionen correctamente' },
        { id: '8.3', name: 'Tubería, Cajas y Sujetadores', description: 'Condición de la instalación eléctrica' },
        { id: '8.4', name: 'Condición del Cable', description: 'Estado del cableado de las luces' },
        { id: '8.5', name: 'Condición de la Fotocelda', description: 'Funcionamiento del sensor de luz' },
        { id: '8.6', name: 'Condición del Controlador', description: 'Estado del controlador de luces' },
        { id: '8.7', name: 'Condición de las Luces', description: 'Estado físico de las luminarias' },
        { id: '8.8', name: 'Número de Medidor para Luces', description: 'Registrar número de medidor', hasValueInput: true, valueLabel: 'Número' },
        { id: '8.9', name: 'Medidor Conectado al QO2', description: 'Verificar conexión al controlador' },
        { id: '8.10', name: 'Voltaje en Interruptor QO2', description: 'Medir voltaje', hasValueInput: true, valueLabel: 'Volts' },
      ]
    },
    {
      id: 14,
      category: 'torre',
      title: 'Inspección - Tierras en Torre',
      subtitle: '12 ítems de evaluación',
      icon: '⚡',
      type: 'checklist',
      items: [
        { id: '9.1', name: 'Tapas y Registros', description: 'Condición de tapas y registros de tierra' },
        { id: '9.2', name: 'Conexiones Exotérmicas', description: 'Estado de las conexiones soldadas' },
        { id: '9.3', name: 'Condición de Cables', description: 'Estado de los cables de tierra' },
        { id: '9.4', name: 'Sujeción, Condición y Tipo', description: 'Verificar sujetadores de cables' },
        { id: '9.5', name: 'Aterrizaje de Piernas de Torre', description: 'Conexión a tierra de las piernas' },
        { id: '9.6', name: 'Aterrizaje de Retenidas', description: 'Conexión a tierra de retenidas', showIf: { field: 'tipoTorre', value: 'arriostrada' } },
        { id: '9.7', name: 'Aterrizaje de Malla Ciclónica', description: 'Conexión a tierra de la malla' },
        { id: '9.8', name: 'Aterrizaje de Mástil-Monopolo', description: 'Conexión a tierra del mástil' },
        { id: '9.9', name: 'Aterrizaje de Portacablera', description: 'Conexión a tierra de bandejas' },
        { id: '9.10', name: 'Oxidación', description: 'Verificar oxidación en sistema de tierras' },
        { id: '9.11', name: 'Pararrayo y Cable', description: 'Condición del pararrayo y su cable' },
        { id: '9.12', name: 'Sistema de Tierra en General', description: 'Evaluación general del sistema' },
      ]
    },
    {
      id: 15,
      category: 'torre',
      title: 'Inspección - Retenidas',
      subtitle: '6 ítems de evaluación',
      icon: '🔗',
      type: 'checklist',
      showIf: { field: 'tipoTorre', value: 'arriostrada' },
      items: [
        { id: '10.1', name: 'Dados de Concreto', description: 'Condición de los dados de anclaje' },
        { id: '10.2', name: 'Condición de las Anclas', description: 'Estado de las anclas de retenidas' },
        { id: '10.3', name: 'Uniones entre Retenidas y Anclas', description: 'Condición de las conexiones' },
        { id: '10.4', name: 'Retenidas Libres de Oxidación', description: 'Verificar ausencia de oxidación' },
        { id: '10.5', name: 'Tensión de las Retenidas', description: 'Inspección visual de tensión' },
        { id: '10.6', name: 'Tornillos y Sujetadores', description: 'Condición de tornillería en retenidas' },
      ]
    },
    {
      id: 16,
      category: 'torre',
      title: 'Inspección - Cimentación',
      subtitle: '5 ítems de evaluación',
      icon: '🧱',
      type: 'checklist',
      items: [
        { id: '11.1', name: 'Erosión', description: 'Verificar erosión alrededor de la cimentación' },
        { id: '11.2', name: 'Acabado en Dados', description: 'Condición del acabado de los dados' },
        { id: '11.3', name: 'Condición de Anclas', description: 'Estado de las anclas de cimentación' },
        { id: '11.4', name: 'Fisuras o Grietas', description: 'Verificar fisuras en la cimentación' },
        { id: '11.5', name: 'Estructuras Metálicas y Vigas', description: 'Condición de elementos metálicos en base' },
      ]
    },

    // ============ CATEGORÍA: CIERRE (Paso 17) ============
    {
      id: 17,
      category: 'cierre',
      title: 'Vandalismo y Observaciones',
      subtitle: 'Cierre del reporte',
      icon: '📝',
      type: 'form',
      fields: [
        { id: 'vandalismo', label: '¿Se Observa Vandalismo?', type: 'select', required: true, options: [
          { value: '', label: 'Seleccione...' },
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ]},
        { id: 'descripcionVandalismo', label: 'Descripción del Vandalismo', type: 'textarea', showIf: { field: 'vandalismo', value: 'si' }, placeholder: 'Describir el vandalismo observado...' },
        { id: 'equiposFaltantes', label: 'Equipos de Sistema Faltantes', type: 'textarea', placeholder: 'Listar equipos faltantes si los hay...' },
        { id: 'defectosOperacion', label: 'Defectos que Puedan Detener Operación', type: 'textarea', placeholder: 'Reportar defectos críticos...' },
        { id: 'observacionesGenerales', label: 'Observaciones Generales', type: 'textarea', placeholder: 'Cualquier observación adicional...' },
        { id: 'firmaProveedor', label: 'Firma del Proveedor', type: 'signature' },
      ]
    },
  ]
};

// Función para obtener estadísticas
export const getFormStats = (steps) => {
  let totalFormFields = 0;
  let totalChecklistItems = 0;
  
  steps.forEach(step => {
    if (step.type === 'form') {
      totalFormFields += step.fields.length;
    } else if (step.type === 'checklist') {
      totalChecklistItems += step.items.length;
    }
  });
  
  return {
    totalSteps: steps.length,
    totalFormFields,
    totalChecklistItems,
    totalElements: totalFormFields + totalChecklistItems
  };
};

// Función para obtener steps por categoría
export const getStepsByCategory = (categoryId) => {
  return maintenanceFormConfig.steps.filter(step => step.category === categoryId);
};

// Función para obtener step por ID
export const getStepById = (stepId) => {
  return maintenanceFormConfig.steps.find(step => step.id === stepId);
};

export default maintenanceFormConfig;
