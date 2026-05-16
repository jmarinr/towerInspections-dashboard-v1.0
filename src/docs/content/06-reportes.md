---
title: Reportes
order: 6
icon: BarChart3
description: Los 10 reportes disponibles, qué muestran y cómo usarlos.
---

# Reportes

La sección **Reportes** ofrece 10 reportes interactivos. Todos respetan el scope del usuario que los abre (un supervisor scoped solo ve datos de su empresa/regiones).

## Lista de reportes

| # | Reporte | Para qué sirve |
|---|---|---|
| 1 | **Cumplimiento de formularios** | % de visitas con cada formulario completado |
| 2 | **Productividad por inspector** | Visitas y entregas por inspector y mes |
| 3 | **Calidad por inspector** | Tasa de checklists "buenos" vs "malos", indicador de cuidado |
| 4 | **SLA de cierre** | Tiempo entre apertura y cierre de visita, vs umbral |
| 5 | **Cobertura de sitios** | Cuáles sitios fueron visitados, cuáles no, en qué período |
| 6 | **Tendencia mensual** | Volumen de inspecciones por mes (línea de tiempo) |
| 7 | **Mapa geográfico** | Visitas plotadas en mapa Leaflet, con clusters |
| 8 | **Daños detectados** | Filas individuales de elementos marcados como dañados |
| 9 | **Daños agrupados** | Mismo dato del 8 pero agregado por sitio/región |
| 10 | **Inventario de equipos** | Snapshot del último inventario por sitio |
| 11 | **Historial de sitios** | Línea de tiempo de todas las visitas a un sitio |

## Cómo usar un reporte

Estructura común:

1. **Filtros arriba** — rango de fechas, empresa (si admin), región, inspector, etc. Cada reporte tiene los suyos.
2. **Visualización central** — gráfico (Recharts), tabla, o mapa según el reporte.
3. **Tabla de detalle abajo** — datos crudos, paginados.
4. **Exportar Excel** — botón arriba a la derecha. Descarga `.xlsx` con los datos filtrados actuales.

## Permisos

- `reports.view` — abrir y filtrar reportes (admin, supervisor, viewer).
- `reports.export_excel` — descargar Excel (admin, supervisor, viewer por defecto, configurable).

Todos los reportes respetan **scope + filtro de internas**: un supervisor scoped solo ve datos de su empresa y regiones asignadas. Un viewer global no ve datos de empresas ni regiones internas.

## Reportes destacados

### Mapa geográfico

Usa coordenadas (lat/lng) de los sitios + GPS de las visitas. Si un sitio no tiene coords cargadas, no aparece. Útil para detectar concentración geográfica o sitios sin actividad reciente.

> **Tip:** los sitios sin coordenadas aparecen en la sección Empresas → Regiones. Editar el sitio y agregar lat/lng.

### Daños detectados vs agrupados

- **Detectados** — una fila por elemento dañado en cada inspección. Útil para crear listas de trabajo.
- **Agrupados** — mismo dato pero contando: "El sitio CR-001 tiene 4 elementos dañados detectados en 2 visitas". Útil para priorizar.

### SLA de cierre

Calcula el tiempo entre `started_at` y `closed_at` de cada visita. Configurás un umbral (ej: 7 días) y el reporte muestra cuántas visitas estuvieron dentro vs fuera.

### Calidad por inspector

Mide qué porcentaje de checklist items un inspector marca como "bueno" vs "malo". No es una métrica de qué tan buen inspector es; **es una métrica de qué tan crítico es al revisar**. Si un inspector marca el 95% como "bueno" puede ser que esté revisando bien O que esté pasando por alto problemas. Cruzar con Daños detectados.

## Exportar a Excel

Click en el botón **Excel** arriba a la derecha. Descarga un `.xlsx` con:

- Hoja 1: filtros aplicados al momento de exportar (auditoría).
- Hoja 2+: datos del reporte.

Los archivos se nombran con la fecha + nombre del reporte. Tamaño típico: pocos KB a algunos MB.

## Buenas prácticas

- **Cargar el dashboard semanal con los mismos filtros** te da consistencia para comparar mes a mes.
- **Si un reporte tarda mucho en cargar**, reducí el rango de fechas. La BD no tiene materialized views — todo se calcula al vuelo.
- **Exportar a Excel para análisis profundo**. La UI es para vistazo rápido; Excel es para slicing.
- **Reportes y permisos granulares**: si querés que viewers no exporten Excel pero sí vean, desactivá `reports.export_excel` para viewer en Permisos.
