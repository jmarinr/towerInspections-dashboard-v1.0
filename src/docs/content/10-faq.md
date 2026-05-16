---
title: Preguntas frecuentes
order: 10
icon: HelpCircle
description: Las dudas más comunes con respuestas directas.
---

# Preguntas frecuentes

## Sobre usuarios y accesos

### ¿Cómo le doy acceso a un cliente para que vea solo lo suyo?

1. La empresa del cliente debe existir con sus regiones asociadas.
2. Crear un usuario con rol `viewer`.
3. Scope: `por empresa`.
4. Empresa: la del cliente.
5. Regiones: vacías (verá todas las regiones de la empresa) o marcadas si querés limitar.

### ¿Puedo cambiar el rol de un usuario existente?

Sí, desde el modal de edición. Si cambias rol de inspector a supervisor o viceversa, los campos se reajustan en vivo. Si cambias a admin, los campos de scope se ocultan.

### ¿Qué pasa si elimino un usuario que tiene entregas asociadas?

Las entregas quedan, pero el FK `submitted_by_user_id` se setea en NULL. El nombre del inspector se preserva dentro del `payload` de cada entrega (no se pierde la trazabilidad operativa, solo el vínculo SQL).

### ¿Cuántos usuarios global puedo tener?

Técnicamente, sin límite. **En la práctica, deberían ser pocos** — usuarios global son los que ven todo y son el mayor riesgo de fuga de información. Audita periódicamente con:

```sql
SELECT email, full_name, role FROM app_users WHERE scope = 'global';
```

### ¿Un viewer global ve las empresas internas?

No, mientras la empresa tenga `internal = true`. Solo los admins ven empresas y regiones internas, sin excepciones.

### ¿Puedo asignar regiones a un inspector?

En la BD sí, en el panel también. **Pero** en la versión actual del app móvil (v2.7.x) los inspectores siguen viendo todos los sitios de su empresa. El filtro por regiones para inspectores es una funcionalidad planificada para la próxima versión del app.

### ¿Y si necesito que un usuario vea dos empresas?

El modelo actual no lo soporta — un usuario tiene una empresa. Soluciones:

- **Si va a ver muchas empresas**: hacerlo global y filtrar manualmente.
- **Si necesita acceso operativo a las dos**: crearle dos cuentas, una por empresa.
- **Futuro**: si esto se vuelve común, evaluamos modelar `app_user_companies` (junction M:N).

## Sobre empresas y regiones

### ¿Por qué no puedo borrar una región?

Si aparece "hay N usuarios asignados", el sistema te protege. Antes de borrar:

1. Ir a Usuarios.
2. Filtrar por la empresa que usa esa región.
3. Quitar la región de cada usuario asignado.
4. Reintentar.

### ¿Qué diferencia hay entre "Inactiva" e "Interna" para una empresa?

- **Inactiva** (`active = false`) — la empresa no aparece en los selectores nuevos (no podés asignarla a usuarios o entregas) pero sus datos históricos siguen visibles según el scope normal.
- **Interna** (`internal = true`) — la empresa y todos sus datos están ocultos para no-admins.

Podés combinar ambos flags.

### Una empresa cambió de nombre. ¿Edito o creo nueva?

**Edita.** El `org_code` es lo que une la empresa con sus datos históricos. Si creás una nueva, las entregas viejas seguirán referenciando el `org_code` viejo y no se vincularán a la nueva empresa.

### ¿Qué pasa con sitios que tienen visitas pero ya no existen?

Si un sitio se elimina (`DELETE FROM sites`), las `site_visits` con ese `site_id` quedan **huérfanas pero no se borran** — la columna `site_id` en `site_visits` es texto, no FK. Los datos se preservan pero ya no aparecen al hacer JOIN con `sites`.

### ¿Puedo mover un sitio de una región a otra?

Desde la UI, no. Por SQL:

```sql
UPDATE sites SET region_id = '<uuid-nueva-region>'
 WHERE site_id = 'CR-001';
```

⚠️ Esto **no actualiza** automáticamente el `region_id` de las visitas históricas del sitio. Para una migración completa, también:

```sql
UPDATE site_visits SET region_id = '<uuid-nueva-region>'
 WHERE site_id = 'CR-001';

UPDATE submissions SET region_id = '<uuid-nueva-region>'
 WHERE site_visit_id IN (SELECT id FROM site_visits WHERE site_id = 'CR-001');
```

## Sobre datos y rendimiento

### El Dashboard tarda en cargar

El Dashboard ejecuta varias queries pesadas (counts, agrupaciones). Causas y soluciones:

- **Muchas submissions** (>10K) → considerar implementar materialized views para los KPIs.
- **Filtros amplios** (un admin sin filtros ve toda la BD) → es esperable.
- **Caché frío** → primera carga después de un período inactivo es más lenta.

### Una entrega tiene datos que no coinciden con el PDF

El PDF se genera al momento de descargar, usando los datos actuales del `payload`. Si la entrega se editó, el PDF anterior queda desactualizado. **Volvé a descargar** para obtener la versión más reciente.

### Cómo verifico cuántos datos hay de cada empresa

```sql
SELECT c.name, c.org_code, c.internal,
       count(s.id) AS submissions,
       count(DISTINCT sv.id) AS visitas
  FROM companies c
  LEFT JOIN submissions s ON s.org_code = c.org_code
  LEFT JOIN site_visits sv ON sv.org_code = c.org_code
 GROUP BY c.id, c.name, c.org_code, c.internal
 ORDER BY submissions DESC;
```

## Sobre seguridad

### ¿Los datos están encriptados?

- **En tránsito**: sí, HTTPS obligatorio.
- **En reposo**: sí, encriptación a nivel de disco de Supabase.
- **Aplicación**: no hay encriptación adicional a nivel de columna. Si tenés datos extra sensibles, agregarlo en el roadmap.

### ¿Cómo funciona el reset de contraseñas?

Por ahora, manual: un admin elimina el usuario y lo recrea con nueva contraseña. **Próxima feature**: integrar el flujo de "Olvidé mi contraseña" de Supabase Auth (email con magic link).

### Un viewer puede ver datos de una empresa interna si conoce la URL del detalle?

No. Aun si copia/pega una URL del estilo `/orders/<uuid>` para una visita de una empresa interna:

1. La query del frontend pide el detalle.
2. La RLS de Supabase devuelve 0 filas porque la visita pertenece a una empresa `internal`.
3. El frontend muestra "No tienes acceso".

La defensa más fuerte está en la BD, no en el frontend.

### ¿Cómo audito quién accedió a qué?

- **Logins**: tabla `system_logs`, filtrar por `event_type = 'auth.login'`.
- **Ediciones de entregas**: tabla `submission_edits`.
- **Cambios de estado de visitas**: `system_logs`, filtrar por `event_type = 'visit.status_changed'`.

No hay log de "qué páginas miró cada usuario" — eso requeriría telemetría adicional.

## Sobre integraciones

### ¿Hay API pública?

No oficialmente. La API de Supabase está disponible con `anon_key` desde cualquier cliente, pero las RLS limitan lo que se puede leer. Si necesitás integración con otro sistema, contactá al equipo técnico para definir keys y endpoints.

### ¿Puedo exportar todo a Excel?

Sí, cada reporte tiene botón "Excel". Para una exportación masiva de todo el sistema, hay que hacerlo desde Supabase (Table Editor → Export, o `pg_dump`).

### ¿El sistema se conecta con WhatsApp / Email / Slack?

No directamente. Hay notificaciones internas en el panel (badges en la barra lateral). Notificaciones externas pueden integrarse vía edge functions + Twilio/SendGrid, pero no están implementadas en la versión actual.

## Sobre la documentación (este manual)

### ¿Cómo se actualiza este manual?

Los archivos viven en el repo `towerInspections-dashboard-v1.0` en `src/docs/content/`. Para editar, modificás el `.md` y hacés deploy. Cualquier admin puede sugerir cambios al equipo técnico.

### ¿La búsqueda funciona offline?

Sí. La búsqueda local usa un índice generado al cargar el manual y no depende de internet. La función "Preguntar a Claude" sí requiere conexión.

### ¿Cuánto cuesta usar "Preguntar a Claude"?

Aproximadamente USD $0.015 por consulta usando Claude Sonnet (modelo configurado actualmente). Para 100 consultas mensuales del equipo, son ~$1.50/mes. Si crece mucho el uso, podés cambiar a Haiku ($0.003/consulta) editando la edge function.

### ¿Puedo agregar capítulos al manual?

Sí. Crear `src/docs/content/NN-titulo.md` con el frontmatter correspondiente (title, order, icon, description) y el contenido en Markdown. Al hacer build, aparece automáticamente en el sidebar.
