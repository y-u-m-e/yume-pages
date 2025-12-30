import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      input: {
        // Main app (emuy.gg)
        main: resolve(__dirname, 'index.html'),
        // Events app (ironforged-events.emuy.gg)
        events: resolve(__dirname, 'events.html'),
      },
    },
  },
})

