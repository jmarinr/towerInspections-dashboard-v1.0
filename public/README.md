# PTI Admin Panel v2.0

Panel de supervisión para inspecciones PTI Inspect. Conectado a Supabase en **modo solo lectura**.

## Stack

- React 18 + Vite 5
- Tailwind CSS 3
- Zustand 4 (state management)
- Supabase JS (read-only queries)
- pdf-lib (PDF generation)
- Lucide React (icons)

## Conexión a datos

Este panel lee de la **misma base de datos Supabase** donde el app PTI Inspect (formularios) escribe las inspecciones:

- **Tabla `submissions`**: Cada fila = un formulario enviado por un inspector
- **Tabla `submission_assets`**: Fotos/archivos vinculados a cada submission
- **Storage bucket `pti-inspect`**: Fotos subidas por los inspectores

### ⚠️ Solo lectura

Este panel **NUNCA** modifica datos. Solo ejecuta consultas SELECT.

## Acceso

Usa el mismo `permissions.json` que PTI Inspect. Solo los roles con `access: "admin"` pueden ingresar:

| Usuario | PIN | Rol |
|---------|-----|-----|
| supervisor1 | 2001 | Supervisor |
| supervisor2 | 2002 | Supervisor |
| 101010 | 1010 | Testing |

## Desarrollo local

```bash
npm install
npm run dev
```

## Variables de entorno (opcionales)

```env
VITE_SUPABASE_URL=https://kmdkiyrjmvxnmfdvsofq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_CxNVu9USPtgY2pozE6YiMA_fUds9QZ4
```

## Deploy

Push a `main` → GitHub Actions → GitHub Pages automático.

## CORS

Asegúrate de agregar el dominio del admin panel en Supabase:
`Project Settings → API → CORS allowed origins`
