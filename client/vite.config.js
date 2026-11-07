import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El proxy /api -> API de Express (puerto 3000). Las imágenes y audios
// también salen por /api/media, así que no hace falta nada más.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
})
