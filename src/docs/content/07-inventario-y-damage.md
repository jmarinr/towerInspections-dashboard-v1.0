---
title: Inventario de torres y daños
order: 7
icon: Radio
description: Visualización de equipos por torre, diagrama de niveles y registro de daños detectados.
---

# Inventario de torres y daños

## Inventario de torres

La sección **Inv. Torres** del panel muestra, para cada sitio, el inventario consolidado de equipos basado en las entregas tipo `inventario-v2` realizadas.

### Lista de torres

Una fila por sitio inspeccionado al menos una vez. Columnas:

- **Sitio** — site_id + nombre.
- **Región / Empresa** — derivado.
- **Última actualización** — fecha de la última inspección de inventario.
- **Estado del sitio** — badge calculado: activo, sin equipos, desactualizado (>6 meses sin inspección), etc.

### Detalle de una torre

Click en una torre te lleva a `/tower-inventory/:id`. Pantalla con dos componentes principales:

1. **Diagrama vertical de la torre** (SVG generado dinámicamente).
   - Muestra niveles de altura.
   - Equipos posicionados según la altura registrada.
   - Color codificado por tipo de equipo.

2. **Tabla detallada por nivel**.
   - Cada nivel de altura agrupa los equipos instalados.
   - Datos técnicos: modelo, fabricante, número de serie, dimensiones, peso, fecha de instalación.
   - Permite expandir/contraer secciones por nivel.

## Damage tracking

Los formularios `preventive-maintenance` y `executed-maintenance` incluyen checklists donde cada ítem puede marcarse como **bueno** o **malo**. Los ítems marcados como "malo" se consideran **daños detectados**.

### ¿Cómo se registra un daño?

En el app móvil, durante la inspección, el inspector marca cada elemento del checklist:

- Estado: `bueno` / `malo`.
- Comentario opcional.
- Fotografía opcional (referencia visual).

Al sincronizar, los ítems marcados "malo" alimentan los reportes de **Daños detectados** y **Daños agrupados**.

### Visualización en el panel

Desde el detalle de una entrega (sección Formularios):

- Los ítems con problema aparecen resaltados.
- Si tienen foto asociada, click amplia.
- El comentario del inspector se ve junto al ítem.

Desde los reportes:

- **Daños detectados** lista cada problema individual con sitio, fecha, comentario.
- **Daños agrupados** suma por sitio y por elemento, útil para priorizar.

### Workflow recomendado

1. Inspector marca daños en campo (app móvil).
2. Supervisor revisa entregas finalizadas (panel → Formularios o Visitas).
3. Supervisor abre el reporte **Daños agrupados** para ver el estado consolidado.
4. Genera lista de trabajos correctivos.
5. Crea órdenes de mantenimiento correctivo según sea necesario.

## Equipos esperados vs inventariados

El sistema tiene un catálogo de equipos esperados por tipo de torre. El reporte **Inventario de equipos** compara lo encontrado vs lo esperado y resalta:

- Equipos faltantes (en catálogo pero no inspeccionados).
- Equipos extra (en sitio pero no catalogados).
- Discrepancias de datos (ej: modelo distinto del registrado).

## Limitaciones conocidas

- La altura de los equipos depende de que el inspector la registre. Si falta el dato, el equipo aparece al pie de la torre en el diagrama.
- Daños solo se registran en `preventive-maintenance` y `executed-maintenance`. Otros formularios no contribuyen a estos reportes.
- El diagrama de torre asume una geometría vertical simple. Torres con estructuras complejas (lattice ramificada) se simplifican visualmente.
