---
title: Control de acceso
order: 2
icon: ShieldCheck
description: Roles, scope, empresas, regiones y permisos granulares. Cómo se decide qué ve cada usuario.
---

# Control de acceso

Este capítulo es **el más importante del manual**. Explica cómo el sistema decide, para cada usuario, qué datos puede ver y qué acciones puede realizar.

El modelo combina cuatro dimensiones:

1. **Rol** — qué tipo de usuario es (admin, supervisor, inspector, viewer).
2. **Scope** — el alcance: ver todo el sistema (global) o solo una empresa (scoped).
3. **Empresa y regiones asignadas** — si es scoped, exactamente cuáles.
4. **Flag `internal`** — empresas o regiones marcadas como internas (solo admins).

## Los 4 roles

| Rol | Qué hace | Modifica datos | Accede al panel |
|---|---|---|---|
| **admin** | Administra todo el sistema | Sí | Sí |
| **supervisor** | Revisa entregas, gestiona órdenes | Sí (con permisos) | Sí |
| **inspector** | Crea órdenes y completa formularios en campo | Sí (solo lo suyo) | **No** — usa el app móvil |
| **viewer** | Solo lectura, ideal para auditoría | No | Sí |

> **Importante:** un `inspector` no puede iniciar sesión en el panel web. Si necesitás que alguien vea datos sin modificarlos, creá un `viewer`, no un inspector.

## Scope: global vs scoped

Cada usuario `supervisor` o `viewer` tiene un campo `scope` con uno de dos valores:

### Scope `global`

El usuario ve **todo el sistema**, excepto empresas y regiones marcadas como `internal` (ver más abajo). Útil para:

- Supervisores generales que cubren múltiples clientes.
- Auditores externos que necesitan visibilidad amplia.
- Roles de revisión interna de PTI.

En la lista de usuarios, estos aparecen con un badge rojo **GLOBAL**.

### Scope `scoped`

El usuario está vinculado a **una empresa específica** y solo ve datos de esa empresa. Opcionalmente, también puede estar limitado a un subconjunto de las regiones donde opera esa empresa.

Tres variantes:

- **Empresa, sin regiones asignadas** → ve toda la empresa (todas sus regiones).
- **Empresa + algunas regiones** → ve solo esas regiones de esa empresa.
- **Empresa + todas las regiones** → equivalente a "sin regiones asignadas" pero explícito.

## Cómo decide el sistema qué mostrar

Cuando un usuario abre una pantalla con datos (Dashboard, Visitas, Formularios, Reportes, etc), el sistema aplica este árbol de decisión **en la base de datos**, antes de devolver nada:

```
¿Es admin?
  └─ Sí → ve todo, sin excepciones.
  └─ No → ¿La fila pertenece a una empresa o región marcada como `internal`?
          └─ Sí → OCULTA.
          └─ No → ¿Cuál es el scope?
                  ├─ global → mostrar.
                  └─ scoped → ¿Coincide el `org_code` con la empresa del usuario?
                              └─ No → OCULTA.
                              └─ Sí → ¿Tiene regiones asignadas?
                                      ├─ No → mostrar.
                                      └─ Sí → ¿La fila está en alguna de esas regiones?
                                              ├─ Sí → mostrar.
                                              └─ No → OCULTA.
```

Esto se llama **Row-Level Security (RLS)** y vive en la base de datos. El frontend no puede saltarse este filtro — incluso si alguien intentara consultar la BD con un cliente custom, las políticas lo bloquean.

## Empresas y regiones internas

Una empresa o región puede marcarse como **interna** desde su modal de edición (toggle rojo "Empresa interna" / "Región interna"). Cuando está marcada:

- **Solo los admins** la ven.
- Cualquier supervisor o viewer, incluso con `scope = 'global'`, **no la ve**.
- En la lista de Empresas y Regiones aparece con badge rojo **INTERNA**.

Casos de uso típicos:

- **HenkanCX** está marcada como interna por defecto: es la empresa proveedora, no un cliente. Los usuarios externos no deberían verla.
- **Regiones de prueba** (Cocle Prueba, sitios de testing): también internas para que no contaminen las vistas de usuarios reales.

Para marcar/desmarcar: editar la empresa o región y togglar el switch. El cambio aplica al instante para nuevas consultas.

## Tabla de visibilidad por rol y scope

Esta es la "regla de oro" del sistema:

| Rol + scope | Empresas internas | Regiones internas | Otras empresas | Otras regiones |
|---|---|---|---|---|
| `admin` | ✅ Ve | ✅ Ve | ✅ Ve | ✅ Ve |
| `supervisor` global | ❌ Oculto | ❌ Oculto | ✅ Ve | ✅ Ve |
| `supervisor` scoped | Solo si es su empresa\* | Solo si la tiene asignada\* | Solo su empresa | Solo las asignadas |
| `viewer` global | ❌ Oculto | ❌ Oculto | ✅ Ve (solo lectura) | ✅ Ve (solo lectura) |
| `viewer` scoped | Solo si es su empresa\* | Solo si la tiene asignada\* | Solo su empresa | Solo las asignadas |
| `inspector` | (no entra al panel) | (no entra al panel) | (no entra al panel) | (no entra al panel) |

\* *En la práctica nunca asignás un usuario externo a una empresa interna, pero el modelo lo permite.*

## Permisos granulares (`role_permissions`)

Además del rol y el scope, hay una capa más fina llamada **role_permissions**. Es una tabla en BD que define qué acciones específicas puede hacer cada rol. Ejemplos:

| Permiso | admin | supervisor | viewer |
|---|---|---|---|
| `submissions.change_status` (cerrar entrega) | ✅ | ✅ | ❌ |
| `visits.change_status` (cerrar/abrir visita) | ✅ | ✅ | ❌ |
| `reports.view` | ✅ | ✅ | ✅ |
| `reports.export_excel` | ✅ | ✅ | ✅ |
| `admin.companies` | ✅ | ❌ | ❌ |

Estos permisos se administran en la sección **Permisos** del panel. Son ortogonales al scope: un viewer scoped y un viewer global tienen exactamente los mismos permisos, solo cambian los datos sobre los que esos permisos aplican.

## Ejemplos prácticos

### Caso 1: supervisor regional

> *"Juan supervisa las inspecciones de Connect Costa Rica, pero solo en la región Central."*

- **Rol:** `supervisor`
- **Scope:** `scoped`
- **Empresa:** Connect Costa Rica
- **Regiones asignadas:** Región Central

Juan verá solo las órdenes, entregas y reportes de Connect Costa Rica que estén en la Región Central. No verá nada de otras regiones de Connect ni de otras empresas.

### Caso 2: auditor general

> *"María hace auditorías mensuales de calidad y necesita ver entregas de todos los clientes."*

- **Rol:** `viewer`
- **Scope:** `global`
- **Empresa:** — (vacío, porque es global)
- **Regiones asignadas:** — (vacío, porque es global)

María verá todas las empresas (excepto HenkanCX y las internas) y todas las regiones no internas. No podrá modificar nada.

### Caso 3: cliente que se autosupervisa

> *"Quieren darle acceso al gerente de OFGSA para que vea las inspecciones de su empresa."*

- **Rol:** `viewer`
- **Scope:** `scoped`
- **Empresa:** OFGSA
- **Regiones asignadas:** — (vacío = todas las de OFGSA)

Verá solo lo de OFGSA, en cualquiera de las regiones donde OFGSA opera, sin permisos de edición.

### Caso 4: supervisor general interno

> *"Carlos del equipo de PTI revisa el trabajo de todos los clientes y también el interno."*

- **Rol:** `admin` (mejor) o `supervisor` global
- Si es `supervisor` global → **no verá HenkanCX ni las regiones de prueba**. Si necesita ver eso, debe ser `admin`.

## Validaciones que el sistema impone

Al crear o editar un usuario, el sistema verifica automáticamente:

1. **Supervisor o viewer scoped sin empresa** → bloqueado. Tenés que asignar empresa.
2. **Usuario global con empresa o regiones** → bloqueado. Si es global, esos campos deben quedar vacíos.
3. **Regiones asignadas a un usuario que no pertenezcan a su empresa** → bloqueado. Solo podés asignar regiones donde su empresa opera.
4. **Quitar una región a una empresa con usuarios asignados a esa combinación** → bloqueado, con mensaje "hay N usuarios asignados, reasignalos primero".
5. **Eliminar una región usada por algún usuario en alguna empresa** → bloqueado.

Estas validaciones corren tanto en el frontend (para feedback rápido) como en la base de datos (para garantía absoluta).

## Buenas prácticas

- **Empezá restrictivo, abrí después.** Un usuario scoped es siempre más seguro que uno global. Solo creá globales cuando hay una razón clara.
- **Las regiones son opcionales.** No le asignes regiones a un supervisor si va a cubrir toda la empresa. Vacío = todas, y queda más limpio de mantener.
- **El badge GLOBAL en rojo es intencional.** Cada vez que veas un usuario con ese badge, asegurate de que es lo que querés.
- **Auditá `scope = 'global'` periódicamente.** Consultá en SQL: `SELECT email, full_name, role, scope FROM app_users WHERE scope = 'global';` para revisar quiénes tienen ese privilegio.
