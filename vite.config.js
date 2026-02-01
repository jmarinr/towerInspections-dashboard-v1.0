import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: base relativo para que funcione en cualquier repo.
// (Ej: https://<user>.github.io/<repo>/)
export default defineConfig({
  base: './',
  plugins: [react()],
})
