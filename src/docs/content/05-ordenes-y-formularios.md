---
title: Órdenes y formularios
order: 5
icon: ClipboardList
description: Los 8 tipos de formularios, ciclo de vida de una orden, sub-estados y edición.
---

# Órdenes y formularios

## Concepto: visita ↔ entregas

En PTI TeleInspect distinguimos dos cosas que en la práctica se confunden:

- **Visita** (`site_visit`, también llamada "orden de trabajo") — el evento de ir a un sitio. Tiene un único `order_number`, un sitio asociado, una fecha de inicio y un estado.
- **Entrega** (`submission`) — un formulario completado dentro de una visita. Una visita puede tener múltiples entregas (ej: mantenimiento + ascenso + fotos = 3 entregas para la misma visita).

## Los 8 tipos de formularios

| Form code | Nombre | Para qué sirve |
|---|---|---|
| `preventive-maintenance` | Mantenimiento Preventivo | Checklist + fotos del estado general del sitio |
| `executed-maintenance` | Mantenimiento Ejecutado | Actividades realizadas + materiales usados + fotos antes/después |
| `inventario-v2` | Inventario de Equipos | Listado de equipos en la torre con detalles técnicos |
| `safety-system` | Sistema de Ascenso (Anticaídas) | Verificación de líneas de vida, anclajes, cuerda |
| `additional-photo` / `reporte-fotos` | Reporte Fotográfico Adicional | Fotos extra fuera de los checklists estándar |
| `puesta-tierra` / `grounding-system-test` | Puesta a Tierra | Mediciones eléctricas de los sistemas de tierra |

Cada uno tiene su propia estructura de datos (`payload`), su propio PDF generador y sus propios assets (fotos asociadas).

## Sección Visitas

**Visitas** lista todas las órdenes (filtradas según scope del usuario). Columnas principales:

- **Número de orden** — auto-generado en el app móvil con formato región-mes-correlativo.
- **Sitio** — ID y nombre.
- **Inspector** — quien hizo la visita.
- **Fecha de inicio** — cuándo se abrió la visita.
- **Estado y sub-estado**:

### Estados (`status`)

- `open` — la visita está activa, se puede modificar.
- `closed` — la visita está cerrada, los datos son finales.
- `cancelled` — la visita fue anulada (con razón documentada).

### Sub-estados (`subState`)

Calculados a partir del estado + las entregas asociadas:

- `sin-iniciar` — visita abierta, sin entregas creadas todavía.
- `en-curso` — visita abierta, con entregas pero ninguna finalizada.
- `con-avance` — visita abierta, con al menos una entrega finalizada.
- `closed` — visita cerrada.
- `cancelled` — visita anulada.

### Filtros

- Por estado o sub-estado.
- Por región (extrae de `order_number` o de `region_id`).
- Búsqueda libre por número de orden, sitio o inspector.

## Detalle de una visita

Click en una fila te lleva a `/orders/:id`. Vas a ver:

- Datos generales: orden, sitio, inspector, fechas, GPS.
- Listado de entregas asociadas, agrupadas por tipo de formulario.
- Para cada entrega: estado (finalizada/borrador), cantidad de fotos, fecha de actualización.
- Acciones: abrir/cerrar visita, cancelar visita (con razón), exportar PDFs.

### Abrir / cerrar / cancelar una visita

- **Cerrar** — bloquea la visita y sus entregas. Solo admin o supervisor con permiso `visits.change_status`.
- **Reabrir** — disponible si la visita está cerrada y el usuario tiene permiso. Borra el `closed_at`.
- **Cancelar** — pide una razón y el usuario que cancela. La visita queda con `status = 'cancelled'` y no entra en conteos del Dashboard.

## Sección Formularios (entregas)

**Formularios** es similar a Visitas pero al nivel de entregas individuales. Útil cuando querés filtrar por tipo de formulario o ver entregas sin importar la visita.

Filtros:

- Por tipo de formulario (los 8 form codes).
- Búsqueda libre.

## Detalle de una entrega

Click en una fila te lleva a `/submissions/:id`. Es la pantalla más densa del sistema. Componentes:

1. **Header** — sitio, inspector, fechas, GPS, badge de finalización.
2. **Galería de fotos** — todas las fotos del formulario, agrupadas por sección. Click amplia.
3. **Datos del formulario** — el payload completo, organizado por secciones según el tipo de formulario.
4. **Modo edición** — botón "Editar" arriba. Disponible para admins y supervisores con permiso `submissions.change_status`.
5. **Historial de cambios** — qué se modificó, cuándo, por quién (auditoría).
6. **Exportar PDF** — botón que genera el PDF correspondiente al tipo de formulario.

### Edición de entregas

Solo admin/supervisor con permiso pueden editar. Cambios:

- Se aplican sobre el `payload` (campos del formulario).
- Se registran en `submission_edits` (qué campo, valor viejo, valor nuevo, quién, cuándo).
- **No se pueden borrar fotos** desde esta pantalla salvo que tengas permiso explícito.

### Finalizar una entrega

Toggle "Finalizado" arriba. Una vez finalizada:

- Cuenta como completada en estadísticas.
- Sigue siendo editable (no es inmutable), pero genera entradas en el historial.

## Numeración de órdenes

Los números de orden se generan en el app móvil con esta lógica:

```
{REGIÓN}-{YYMM}-{CORRELATIVO}
```

Ejemplo: `CRC-2605-042` = región CRC (Central Costa Rica), mayo 2026, orden #42 del mes.

El correlativo se reinicia cada mes y cada región. Si dos inspectores crean órdenes simultáneamente, el sistema garantiza unicidad porque el correlativo se calcula desde la BD al momento de crear.

## Buenas prácticas operativas

- **No reabrir visitas cerradas salvo necesidad real.** Toda reapertura queda registrada en logs.
- **Para correcciones menores en una entrega, usar Editar** — queda auditado, mucho mejor que borrar y recrear.
- **Las fotos pesadas pueden hacer lento el detalle.** Si una entrega tiene >30 fotos, considerá si todas son necesarias.
- **Para exportar varios PDFs de una visita, hacelo desde el detalle de la visita** (botón "Exportar PDFs") en lugar de uno por uno.
