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
    // Forward Pages Functions routes (/<slug>/api/*, /<slug>/files/*) to the local
    // `wrangler pages dev` backend on :8788, so the HMR dev server (:5173) also has a
    // working chat/interview/assets backend. Needs `npm run preview` running too.
    proxy: {
      '^/[^/]+/api/': { target: 'http://localhost:8788', changeOrigin: true },
      '^/[^/]+/files/': { target: 'http://localhost:8788', changeOrigin: true },
    },
  },
})
