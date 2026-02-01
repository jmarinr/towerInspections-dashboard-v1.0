import { MapPin, Calendar, ClipboardList,  Wrench, Camera, Calculator } from "lucide-react";

export const groundingSystemTestConfig = {
  id: "grounding-system-test",
  title: "Prueba de puesta a tierra",
  subtitle: "Medición de resistencia del sistema de puesta a tierra y evidencia.",
  sections: [
    {
      id: "datos",
      title: "Datos del sitio",
      description: "Identificación del sitio y datos de la visita.",
      icon: MapPin,
      fields: [
        { id: "proveedor", label: "Proveedor", type: "text", placeholder: "Ej: PTI / Contratista" },
        { id: "tipoVisita", label: "Tipo de visita", type: "select", options: ["Inspección", "Mantenimiento", "Prueba", "Otro"] },

        { id: "idSitio", label: "ID del sitio", type: "text", placeholder: "Ej: CR-SJ-001" },
        { id: "nombreSitio", label: "Nombre del sitio", type: "text", placeholder: "Ej: Torre Escazú" },
        { id: "direccion", label: "Dirección", type: "text", placeholder: "Dirección del sitio" },

        { id: "tipoSitio", label: "Tipo de sitio", type: "select", options: ["Torre", "Rooftop", "Indoor", "Otro"] },
        { id: "tipoEstructura", label: "Tipo de estructura", type: "select", options: ["Autosoportada", "Arriostrada", "Monopolo", "Otro"] },
        { id: "alturaMts", label: "Altura (mts)", type: "number", placeholder: "0" },

        { id: "latitud", label: "Latitud", type: "text", placeholder: "Ej: 9.93" },
        { id: "longitud", label: "Longitud", type: "text", placeholder: "Ej: -84.10" },

        { id: "fechaInicio", label: "Fecha inicio", type: "date" },
        { id: "fechaTermino", label: "Fecha término", type: "date" },
      ],
    },

    {
      id: "condiciones",
      title: "Condiciones del terreno",
      description: "Contexto de la medición según condiciones ambientales.",
      icon: ClipboardList,
      fields: [
        {
          id: "estadoTerreno",
          label: "Estado del terreno",
          type: "select",
          options: ["Húmedo", "Seco", "Mixto"],
          default: "Húmedo",
        },
        {
          id: "tipoTerreno",
          label: "Tipo de terreno",
          type: "select",
          options: ["Arcilloso", "Arenoso", "Rocoso", "Mixto", "Otro"],
        },
        {
          id: "ultimoDiaLluvia",
          label: "Último día de lluvia",
          type: "select",
          options: ["Hoy", "Ayer", "Hace 2 días", "Hace 3+ días", "No aplica / Desconocido"],
        },
        { id: "hora", label: "Hora de medición", type: "text", placeholder: "Ej: 14:30" },
        {
          id: "notaMetodo",
          label: "Nota (método)",
          type: "textarea",
          placeholder:
            "Si el sitio es un rooftop y no se pueden colocar picas/estacas, describa el método alterno de medición y ubicación del electrodo.",
        },
      ],
    },

    {
      id: "equipo",
      title: "Equipo de medición",
      description: "Datos del equipo utilizado (según disponibilidad).",
      icon: Wrench,
      fields: [
        { id: "equipoMarca", label: "Marca", type: "text", placeholder: "Ej: Fluke" },
        { id: "equipoModelo", label: "Modelo", type: "text", placeholder: "Ej: 1625-2" },
        { id: "equipoSerial", label: "Serial", type: "text", placeholder: "Número de serie" },
        { id: "equipoCalibracion", label: "Fecha de calibración", type: "date" },
      ],
    },

    {
      id: "medicion",
      title: "Medición de resistencia",
      description: "Registre los valores medidos (Ohms) por punto.",
      icon: Calculator,
      fields: [
        { id: "distanciaElectrodoCorriente", label: "Distancia elect. corriente (mts)", type: "number", placeholder: "0" },

        { id: "rPataTorre", label: "Pata de la torre (Ohms)", type: "number", placeholder: "0" },
        { id: "rCerramiento", label: "Cerramiento (Ohms)", type: "number", placeholder: "0" },
        { id: "rPorton", label: "Portón (Ohms)", type: "number", placeholder: "0" },
        { id: "rPararrayos", label: "Pararrayos (Ohms)", type: "number", placeholder: "0" },
        { id: "rBarraSPT", label: "Barra SPT (Ohms)", type: "number", placeholder: "0" },
        { id: "rEscalerilla1", label: "Escalerilla (Ohms) #1", type: "number", placeholder: "0" },
        { id: "rEscalerilla2", label: "Escalerilla (Ohms) #2", type: "number", placeholder: "0" },

        { id: "sumResistencias", label: "Sumatoria (automática)", type: "calculated" },
        { id: "rg", label: "Rg (promedio automático)", type: "calculated" },

        { id: "observaciones", label: "Observaciones", type: "textarea", placeholder: "Notas relevantes de la medición." },
      ],
    },

    {
      id: "evidencia",
      title: "Evidencia fotográfica",
      description: "Tome fotos por punto (opcional).",
      icon: Camera,
      fields: [
        { id: "fotoPataTorre", label: "Foto - Pata de la torre", type: "photo" },
        { id: "fotoCerramiento", label: "Foto - Cerramiento", type: "photo" },
        { id: "fotoPorton", label: "Foto - Portón", type: "photo" },
        { id: "fotoPararrayos", label: "Foto - Pararrayos", type: "photo" },
        { id: "fotoBarraSPT", label: "Foto - Barra SPT", type: "photo" },
        { id: "fotoEscalerilla1", label: "Foto - Escalerilla #1", type: "photo" },
        { id: "fotoEscalerilla2", label: "Foto - Escalerilla #2", type: "photo" },
      ],
    },
  ],
};
