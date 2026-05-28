import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['jserver', 'jserver.taila7a291.ts.net', '.rosenbaum.us'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['jserver', 'jserver.taila7a291.ts.net', '.rosenbaum.us'],
  },
})
