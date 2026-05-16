---
title: Empresas y regiones
order: 4
icon: Building2
description: Cómo se modelan empresas, regiones y sitios, y cómo se relacionan entre sí.
---

# Empresas y regiones

## El modelo de datos

```
companies (empresas)
   │ M:N
   ├─── company_regions ───┐
   │                       │ M:N
regions (regiones)         │
   │ 1:N                   │
   └─── sites (sitios)─────┘
```

- Una **empresa** opera en varias regiones (relación muchos-a-muchos via `company_regions`).
- Una **región** agrupa varios sitios (1-a-muchos).
- Un **sitio** es un punto físico identificado por `site_id` (texto único globalmente).

Ejemplo conceptual:

- Empresa: Empresa A, con `org_code` `EMPA`.
- Regiones asociadas: Región Norte, Región Sur.
- Sitios en Región Norte: `SITIO-001`, `SITIO-002`, etc.

## Sección Empresas

### Crear una empresa nueva

1. **Administración → Empresas → Nueva empresa**.
2. Campos:
   - **Nombre** — visible en toda la UI.
   - **Código org** (`org_code`) — único, en mayúsculas. Es la clave que une la empresa con las entregas e inspectores.
   - **País** — selector.
   - **Regiones asociadas** — multi-select de regiones activas. Acá decidís dónde opera la empresa.
   - **Empresa interna** (toggle rojo) — si lo activás, solo los admins la verán. Usar para empresas del operador o de prueba.
   - **Estado activo** — desactivada = oculta del sistema sin borrarla.
3. Guardar.

> El `org_code` es **inmutable en la práctica**: todas las entregas y visitas históricas lo referencian. Si lo cambias después, podés desconectar datos. Definilo bien la primera vez.

### Editar una empresa

Click en el lápiz. El modal te deja modificar todo excepto el `org_code` (técnicamente sí, pero ver advertencia arriba). El multi-select de regiones funciona en dos direcciones:

- **Agregar regiones** que la empresa empieza a operar.
- **Quitar regiones** que ya no opera. ⚠️ **Si hay usuarios asignados a esa combinación**, el sistema bloquea el cambio con mensaje claro: tenés que reasignarlos primero desde Usuarios.

### Eliminar una empresa

Botón rojo "Eliminar" en el modal. Ten en cuenta:

- Se borran sus filas en `company_regions` (asociaciones a regiones).
- **No se borran sus entregas históricas** — quedan con su `org_code` referenciado, pero la JOIN con `companies` queda vacía. Para auditoría es preferible **desactivar** en vez de eliminar.

## Sección Regiones

### Crear una región nueva

1. **Administración → Regiones → Nueva región**.
2. Campos:
   - **Nombre** — único.
   - **Región interna** (toggle rojo) — igual que en empresas, oculta para no-admins.
3. Guardar.

### Agregar sitios a una región

Click en una región para expandirla. Aparece la tabla de sitios. Botón "Agregar sitio":

- **ID Sitio** — texto único globalmente, en mayúsculas (ej: `SITIO-001`). Es lo que el inspector escribe en el app móvil.
- **Nombre** — descriptivo del sitio.
- **Coordenadas** — lat/lng (opcional pero útil para el mapa).
- **Altura (m)** — altura de la torre (opcional).
- **Provincia** — texto libre.

### Eliminar una región

Botón rojo en el modal. El sistema bloquea si:

- Hay usuarios asignados a esa región en alguna empresa → mensaje "hay usuarios asignados, reasignalos primero".

Si no hay usuarios:

- Se borran los sitios de la región en cascada.
- Las entregas con `region_id` apuntando a esa región quedan con `region_id = NULL` (no se pierden, solo pierden el vínculo).

## La relación empresa ↔ región es crítica

Para que un supervisor o viewer **scoped** pueda tener regiones asignadas, **su empresa debe primero tener esas regiones en `company_regions`**.

El sistema te lo recuerda en el modal de Usuarios: si elegís una empresa sin regiones, aparece un warning amarillo bloqueando el guardado hasta resolver.

Flujo recomendado al darle acceso a un cliente nuevo:

1. Crear la **región** (si no existe).
2. Crear los **sitios** dentro de la región.
3. Crear la **empresa** y asociarle esa región.
4. Crear los **usuarios** (supervisores, viewers) de esa empresa y asignarles regiones si quieren scope fino.

## Empresas y regiones internas

Toggle rojo en ambos modales. Marca el flag `internal = true` en la BD. Resultados:

- **Solo admins** ven la empresa/región y todo lo que cuelga de ella (visitas, entregas, fotos).
- Aparece badge rojo "INTERNA" en la lista para que visualmente distingas.

Casos típicos:

- La empresa del operador del sistema (no es un cliente, es uso interno).
- Regiones de prueba o staging para no contaminar la operación real.

Podés agregar o quitar el flag a cualquier empresa/región en cualquier momento. El cambio aplica al instante para nuevas consultas.

## Sitios

Los sitios se gestionan **dentro de cada región** (no tienen sección propia). Click en una región para expandir.

- **`site_id` único globalmente** — no puede haber dos sitios con el mismo `site_id` en distintas regiones. Si te aparece error de unicidad, buscá el `site_id` con SQL.
- **Mover un sitio entre regiones** — no hay UI directa. Si lo necesitás, actualizá `sites.region_id` por SQL.
- **Coordenadas** — usadas en el reporte de mapa geo (sección Reportes).
- **Activo** — sitios inactivos no aparecen en el app móvil para nuevas inspecciones, pero las visitas históricas se conservan.

## Buenas prácticas

- **No reutilices nombres de empresas o regiones.** Aunque borres una, sus datos históricos siguen referenciándola.
- **Mantené `org_code` corto y estable.** Mejor `EMPA-MX` que `EMPRESA-A-MEXICO-2026`.
- **Marcá las pruebas como `internal` desde el inicio.** Evita contaminación de los datos de producción.
- **Para clientes que se autosupervisan** (ej: gerentes que quieren ver lo suyo), creá una empresa única, asignale sus regiones, y dale acceso vía viewer scoped.
