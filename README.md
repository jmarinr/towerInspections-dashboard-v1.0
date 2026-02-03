# Módulo de Inspecciones HenkanCX - Admin Panel v1.1.0

Dashboard (Supervisor) para visualizar órdenes de inspección generadas por la app de inspecciones.

## Stack
- React + Vite
- Tailwind CSS
- React Router (HashRouter, compatible con GitHub Pages)
- Zustand
- lucide-react

## Ejecutar
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```


## Publicar en GitHub Pages (solo Frontend)

Este proyecto está configurado para funcionar bien en **GitHub Pages** :

- Usa **HashRouter** para evitar problemas de rutas en Pages.
- `vite.config.js` tiene `base: './'` para que funcione sin importar el nombre del repo.

### Pasos
1. Sube este repo a GitHub (rama `main`).
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. Haz push a `main` (o ejecuta manualmente el workflow).
4. La URL quedará publicada en la sección **Environments → github-pages**.

### Local
```bash
npm install
npm run dev
```

