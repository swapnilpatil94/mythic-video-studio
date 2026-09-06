import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Run from the repo root via `npm run studio:web` (script cwd = repo root), so `root: 'web'` here
// is relative to that cwd. Proxies /api to the Studio API server (src/studio/server.ts) — one
// backend, no duplicated logic, the frontend is purely a client of the existing pipeline via that API.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {target: 'http://localhost:4321', changeOrigin: true},
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
