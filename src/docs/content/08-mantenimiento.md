---
title: Mantenimiento y troubleshooting
order: 8
icon: Wrench
description: Logs del sistema, problemas comunes y cómo resolverlos.
---

# Mantenimiento y troubleshooting

## Logs del sistema

**Administración → Logs** muestra el historial completo de eventos del sistema, en orden cronológico inverso.

### Tipos de eventos registrados

| Tipo | Cuándo se registra |
|---|---|
| `auth.login` | Usuario inicia sesión correctamente |
| `auth.login_failed` | Intento fallido de login |
| `auth.logout` | Usuario cierra sesión |
| `user.created` | Admin crea un usuario nuevo |
| `user.updated` | Cambios en un usuario existente |
| `user.deactivated` | Usuario desactivado |
| `submission.received` | Nueva entrega del app móvil |
| `submission.edited` | Edición desde el panel |
| `visit.status_changed` | Visita abierta/cerrada/cancelada |
| `system.*` | Eventos internos (errores, jobs, etc) |

### Severidades

- `info` — operación normal.
- `warning` — algo inusual que no rompe nada.
- `error` — fallo recuperable.
- `critical` — fallo grave que requiere atención.

### Filtros

- Por tipo de evento.
- Por severidad.
- Por email de usuario (búsqueda parcial).
- Por contenido del mensaje (búsqueda libre).

Los logs **no se borran nunca automáticamente**. Si la tabla crece demasiado (>1M filas, después de muchos años), considerá archivar logs antiguos a otra tabla.

## Sistema (System Health)

**Administración → Sistema** muestra el estado actual del backend:

- Conectividad con Supabase (latencia de queries de prueba).
- Estado de las edge functions críticas.
- Última sincronización de datos.
- Versión actual desplegada vs versión en repo.

Si algo está rojo, revisar Logs por errores recientes.

## Problemas comunes

### "El panel se quedó cargando para siempre"

Causas típicas:

1. **Token expirado en background**. Solución: F5 o cerrar sesión y entrar de nuevo.
2. **Network lock del SDK de Supabase**. Detectable porque pasa al volver de un tab inactivo. El sistema tiene fallbacks de 15-30s pero a veces no alcanza.
3. **Cuota o caída de Supabase**. Verificar [status.supabase.com](https://status.supabase.com).

### "No veo datos que sé que existen"

Verificar en orden:

1. ¿Estás logueado con el usuario correcto?
2. ¿Cuál es tu rol y scope? Mirar el badge en el sidebar abajo.
3. Si sos scoped con regiones, ¿el dato pertenece a tus regiones asignadas?
4. ¿La empresa o región del dato está marcada como interna? (solo admin la ve)
5. ¿El dato tiene `region_id = NULL`? Para usuarios con regiones asignadas, NULL no pasa el filtro.

Para diagnosticar el último caso (con admin):

```sql
SELECT count(*) FROM submissions WHERE region_id IS NULL;
SELECT count(*) FROM site_visits WHERE region_id IS NULL;
```

Si hay muchas con NULL, posiblemente son legacy. Backfill manual:

```sql
UPDATE site_visits sv
   SET region_id = s.region_id
  FROM sites s
 WHERE s.site_id = sv.site_id
   AND sv.region_id IS NULL;
```

### "No puedo borrar una empresa o región"

Si aparece "hay N usuarios asignados", es la protección del trigger `protect_company_region_in_use`. Antes de borrar:

1. Ir a Usuarios.
2. Filtrar por empresa.
3. Reasignar o eliminar los usuarios que dependen de esa combinación.
4. Reintentar el borrado.

### "Subir foto falla con error 403"

Suele ser un problema de RLS en `submission_assets`. Verificar que:

- El usuario tiene rol que permite INSERT en submission_assets.
- El submission_id existe y es accesible para ese usuario.

Si la política RLS está mal, ejecutar la migración `MIGRATION_fix_assets_rls.sql` (debería ser correctiva).

### "Edge function `create-user` retorna 500"

Posibles causas:

1. **Sin permisos service_role**. Variable de entorno `SUPABASE_SERVICE_ROLE_KEY` mal configurada en Supabase Dashboard → Edge Functions → Settings.
2. **Email ya existe en Auth**. La función no maneja perfectamente este caso. Borrar el usuario fantasma desde Authentication antes de reintentar.
3. **Versión vieja desplegada**. La v4.13.0+ acepta `scope` y `region_ids`. Si la edge desplegada es anterior, va a ignorar esos campos y crear el usuario sin scope.

## Cuándo contactar al equipo técnico

Logueá un ticket cuando:

- Hay errores `critical` recurrentes (no aislados) en Logs.
- Los datos del Dashboard no coinciden con lo que ves en las páginas de detalle.
- Una migración SQL falló a mitad (debería revertirse sola, pero verificar).
- Hay sospecha de datos perdidos o duplicados.

Antes de contactar, prepará:

- Captura de pantalla del error.
- Email del usuario que lo experimentó.
- Hora aproximada.
- Versión del panel (ver en el sidebar abajo: `v4.X.X`).
- Si es posible, copiá las últimas 5-10 entradas de Logs con severidad `error` o superior.

## Mantenimiento recomendado

### Semanal

- Revisar Logs filtrando por severidad `error` y `critical`.
- Verificar System Health.
- Auditar nuevos usuarios creados.

### Mensual

- Auditar usuarios con `scope = 'global'`:
  ```sql
  SELECT email, full_name, role, scope FROM app_users WHERE scope = 'global';
  ```
- Revisar empresas y regiones recién marcadas como `internal`.
- Verificar tamaño de tablas grandes (`submissions`, `submission_assets`, `system_logs`).

### Trimestral

- Revisar el reporte de Cobertura de sitios: identificar sitios sin actividad reciente.
- Revisar usuarios inactivos: candidatos a desactivación o eliminación.
- Backup manual con `pg_dump` (además de los snapshots diarios de Supabase).
