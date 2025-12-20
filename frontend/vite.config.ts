import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true, // Needed for Docker on some systems
    },
    proxy: {
      '/api': {
        target: process.env.DOCKER_ENV === 'true' ? 'http://backend:8000' : 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})



