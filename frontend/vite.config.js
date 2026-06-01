import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — needed on every route, cache it separately so app
          // code changes don't bust the React bundle.
          react: ['react', 'react-dom', 'react-router-dom'],
          // recharts pulls in d3 (~heavy) and is only used on a couple of
          // pages — isolate it so the rest of the app stays small.
          charts: ['recharts'],
        },
      },
    },
  },
})
