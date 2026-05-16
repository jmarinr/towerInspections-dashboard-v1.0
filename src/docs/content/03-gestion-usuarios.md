---
title: Gestión de usuarios
order: 3
icon: Users
description: Crear, editar, desactivar y borrar usuarios paso a paso.
---

# Gestión de usuarios

La sección **Administración → Usuarios** del panel es donde gestionás todos los accesos. Solo los admins pueden entrar.

## La lista de usuarios

Al abrir la sección ves una tabla con todos los usuarios del sistema, sus avatares, rol, empresa, alcance y estado. La columna **Alcance** es nueva desde v4.13.0 y muestra de un vistazo cómo está configurado el acceso:

- **Badge rojo "GLOBAL"** → usuario ve todo (excepto internas).
- **Badge azul "Empresa X · Todas las regiones"** → scoped a una empresa, sin filtro de regiones.
- **Badge azul "Empresa X · 2 regiones"** → scoped a empresa + N regiones específicas.

Los filtros arriba te dejan filtrar por rol o por empresa.

## Crear un usuario nuevo

Click en **Nuevo usuario**. Se abre un modal con los siguientes campos:

### Campos básicos

- **Nombre completo** — visible en la lista y reportes.
- **Correo electrónico** — único, usado para login. No se puede cambiar después.
- **Contraseña inicial** — al menos 6 caracteres. El usuario puede cambiarla después.
- **Rol** — admin, supervisor, inspector o viewer.

### Toggle "Alcance de acceso" (solo para supervisor y viewer)

Apenas seleccionás rol supervisor o viewer aparece un toggle con dos botones grandes:

- **Por empresa** (azul, recomendado) — el usuario se vincula a una empresa y opcionalmente a regiones específicas.
- **Global** (rojo, alerta) — el usuario ve todo el sistema (excepto internas). Aparece una advertencia explicando el alcance.

### Selector "Empresa" (si scope = scoped)

Lista desplegable con todas las empresas activas. Cada opción muestra el nombre + org_code.

> Si la empresa elegida **no tiene regiones asignadas**, aparece una alerta amarilla pidiéndote que primero le asignes regiones desde la sección **Empresas**. No podés guardar el usuario hasta resolverlo.

### Multi-select "Regiones asignadas" (si scope = scoped)

Aparece después de elegir empresa. Muestra **solo las regiones donde esa empresa opera**. Podés marcar varias o ninguna:

- **Sin marcar nada** → el usuario verá todas las regiones de la empresa.
- **Marcar 1 o más** → el usuario verá solo esas.

El contador abajo del selector te indica cuántas seleccionaste.

### "Supervisor asignado" (solo para inspector)

Lista de supervisores activos de la misma empresa. Sirve para que el inspector tenga un supervisor de referencia (uso operativo, no de seguridad).

### Toggle "Usuario activo"

Si lo desactivás, el usuario no puede iniciar sesión pero no se borra. Útil para baja temporal.

### Guardar

Click en **Guardar**. Si todo es válido, se crea el usuario en Auth + perfil en `app_users` + sus regiones asignadas. Si algo falla, todo se revierte (no quedan inconsistencias).

## Editar un usuario existente

Click en el ícono de lápiz al final de la fila. Se abre el mismo modal precargado con los datos actuales. Restricciones:

- **El email no se puede cambiar.** Si necesitás cambiarlo, borrá y recreá.
- **Cambiar el rol** está permitido — si cambiás de inspector a supervisor, los campos se ajustan en vivo.
- **Cambiar de scoped a global** está permitido, pero aparece la advertencia roja en pantalla.
- **Cambiar la empresa** limpia las regiones previamente seleccionadas (porque ya no aplican).

## Desactivar vs eliminar

- **Desactivar** (toggle "Usuario activo" en off) — el usuario no puede entrar pero su historial queda intacto. Recomendado para bajas que pueden revertirse.
- **Eliminar** (botón rojo "Eliminar") — borra el usuario en Auth y en `app_users`. Sus regiones asignadas se borran en cascada. **Su historial en logs y entregas se mantiene** porque esas tablas usan `ON DELETE SET NULL` — los registros quedan pero pierden el vínculo al usuario.

> Recomendación: **desactiva, no elimines**. Eliminar es para cuando estás seguro que no vas a recuperar al usuario.

## Casos prácticos paso a paso

### Crear un supervisor regional

> *Necesitás darle acceso a Juan para que supervise las inspecciones de **Connect Costa Rica** solo en la **Región Central**.*

1. Click **Nuevo usuario**.
2. Nombre: `Juan Pérez`. Email: `juan@connect.cr`. Contraseña inicial: `Connect2026!`.
3. Rol: `Supervisor`.
4. Toggle "Por empresa" (azul).
5. Empresa: `Connect Costa Rica`.
6. Multi-select: marcar solo `Región Central`.
7. Activo: sí.
8. Guardar.

Resultado: Juan al hacer login verá únicamente órdenes y entregas de Connect Costa Rica en Región Central.

### Crear un viewer global para auditoría

> *El equipo legal necesita acceso de solo lectura a todo el sistema (excepto datos internos de PTI).*

1. **Nuevo usuario**.
2. Nombre: `Auditor Legal`. Email: `legal@auditor.com`.
3. Rol: `Viewer`.
4. Toggle "Global" (rojo) → leer la advertencia.
5. (No aparece selector de empresa ni regiones.)
6. Guardar.

Resultado: ve todo excepto HenkanCX y regiones de prueba. No puede modificar nada.

### Convertir un supervisor scoped en multi-región

> *Marta cubre la región Central y ahora le sumás Pacífico.*

1. Click lápiz en la fila de Marta.
2. En el multi-select de regiones, marcar también `Región Pacífico`.
3. Guardar.

Marta verá las dos regiones desde su próximo login (o refresh).

## Errores comunes

| Mensaje | Causa | Cómo resolverlo |
|---|---|---|
| "Email y nombre son obligatorios" | Campos vacíos | Completarlos |
| "Supervisor scoped debe tener empresa asignada" | Elegiste scope por empresa sin empresa | Elegir empresa o cambiar a global |
| "Esta empresa no tiene regiones asignadas. Asigna regiones a la empresa primero" | La empresa elegida está sin regiones en `company_regions` | Ir a Empresas, editar la empresa, asignar regiones, volver |
| "La región X no pertenece a la empresa del usuario" | Pasaste una región que no opera para esa empresa (raro vía UI, posible vía API) | Refrescar el modal |
| "Tiempo de espera agotado" | Lentitud o caída momentánea de la edge function `create-user` | Reintentar; si persiste, ver Logs |

## Permisos especiales del modal de usuarios

- **Solo los admins** ven y usan este módulo.
- Un admin **no puede editarse a sí mismo** desde acá (para evitar bloquearse). Si necesita cambiar su propio email o rol, debe hacerlo desde SQL o desde otro admin.
