---
title: Glosario
order: 9
icon: BookMarked
description: Términos técnicos y de negocio usados en el sistema, ordenados alfabéticamente.
---

# Glosario

Términos que aparecen en el sistema y en este manual.

## A

**`admin`** — Rol con acceso total al sistema. Único rol que ve empresas y regiones marcadas como `internal`. Único que puede crear, editar y eliminar usuarios, empresas y regiones.

**`app_users`** — Tabla en la BD con los perfiles de usuario del sistema. Se vincula a `auth.users` (Supabase Auth) por el `id`.

**`app_user_regions`** — Tabla junction que asigna regiones específicas a un usuario scoped. Si está vacía para un usuario, ese usuario ve todas las regiones de su empresa.

**`asset` / `submission_asset`** — Foto u otro archivo adjunto a una entrega. Se almacena en Supabase Storage y se referencia en la tabla `submission_assets`.

## C

**`canWrite`** — Flag derivado del rol. `false` para viewer, `true` para los demás. Usado para mostrar/ocultar botones de edición en la UI.

**`closed_at`** — Timestamp de cuándo se cerró una visita. NULL si está abierta.

**`company` / `companies`** — Empresa cliente o entidad operativa. Tiene `org_code` único, país, regiones asociadas, flag `active` y flag `internal`.

**`company_regions`** — Tabla junction que asocia empresas con las regiones donde operan.

**`company.internal`** — Flag boolean. Si es `true`, solo los admins ven la empresa. Default `false`.

## E

**Edge function** — Función serverless de Deno que corre en Supabase. Usadas para operaciones que requieren `service_role` (crear usuarios) o llamadas a APIs externas (IA del manual).

**Entrega** — Sinónimo de `submission`. Un formulario completado dentro de una visita.

## F

**`finalized`** — Flag boolean en una entrega. `true` significa que el inspector la marcó como completa. Sigue siendo editable después de finalizar.

**`form_code`** — Identificador del tipo de formulario. Los 8 valores posibles son `preventive-maintenance`, `executed-maintenance`, `inventario-v2`, `safety-system`, `additional-photo`, `reporte-fotos`, `puesta-tierra`, `grounding-system-test`.

## G

**`global` (scope)** — Valor del campo `scope`. Indica que el usuario ve todo el sistema (excepto empresas/regiones internas).

## I

**`inspector`** — Rol para inspectores de campo. Usa el app móvil, no entra al panel web. Cada inspector pertenece a una empresa, opcionalmente con regiones asignadas (futuro: Fase 2 del app móvil).

**`internal` (flag)** — Boolean en `companies` y `regions`. Si `true`, solo admins ven la fila.

## O

**`order_number`** — Número de orden de trabajo, formato `{REGIÓN}-{YYMM}-{NNN}`. Generado al crear la visita en el app móvil.

**`org_code`** — Código único de empresa (texto corto en mayúsculas, ej: `EMPA`). Es la clave que vincula entregas con empresas.

## P

**`payload`** — Campo `jsonb` en `submissions` que contiene todos los datos del formulario completado (checklist, mediciones, comentarios, datos del inspector).

**Permiso granular** — Fila en la tabla `role_permissions` que define si un rol puede hacer una acción específica. Ortogonal al rol y al scope.

**PWA** — Progressive Web App. El app móvil del inspector es una PWA instalable, no una app nativa.

## R

**`region`** — Área geográfica. Una empresa puede operar en varias. Cada región tiene un nombre único, flag `active`, flag `internal`.

**RLS (Row-Level Security)** — Mecanismo de PostgreSQL que filtra filas según políticas. El sistema lo usa para que cada usuario solo reciba de la BD lo que su rol/scope permite.

**`role_permissions`** — Tabla en BD con permisos por rol y acción.

## S

**`scope`** — Campo en `app_users` con valores `global` o `scoped`. Determina si el usuario ve todo o solo lo de su empresa.

**`scoped`** — Valor de scope. El usuario está vinculado a una empresa (`company_id`) y opcionalmente a regiones específicas.

**`site` / `sites`** — Sitio físico de inspección. Identificado por `site_id` único globalmente. Pertenece a una región.

**`site_id`** — Texto único globalmente que identifica un sitio físico (ej: `CR-001`).

**`site_visit`** — Visita programada o ejecutada a un sitio. También llamada "orden de trabajo" en la UI.

**`status` (visita)** — Uno de `open`, `closed`, `cancelled`.

**`subState` (visita)** — Estado calculado a partir del status + las entregas: `sin-iniciar`, `en-curso`, `con-avance`, `closed`, `cancelled`.

**`submission`** — Entrega individual de un formulario. Una visita puede tener varias submissions.

**`submission_edits`** — Tabla con historial de ediciones hechas desde el panel a entregas existentes.

**`supabase`** — Plataforma backend usada. Provee PostgreSQL, autenticación, storage y edge functions.

**`supervisor`** — Rol con permisos de gestión (modificar entregas, cerrar visitas, ver reportes) sobre los datos a los que su scope le da acceso.

## T

**Trigger (SQL)** — Función que se ejecuta automáticamente antes o después de un INSERT/UPDATE/DELETE. El sistema usa varios:

- `enforce_user_scope` — valida coherencia scope/company_id al crear/editar usuarios.
- `enforce_user_region_company` — valida que las regiones asignadas a un usuario pertenezcan a su empresa.
- `protect_company_region_in_use` — bloquea desvincular una región de una empresa si hay usuarios asignados.

## V

**`viewer`** — Rol de solo lectura. No puede modificar nada. Puede tener scope global o scoped igual que supervisor.

**Visita** — Sinónimo de `site_visit` u "orden de trabajo".
