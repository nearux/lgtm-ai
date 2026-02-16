import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5050,
    proxy: {
      '/api': {
        target: 'http://localhost:5051',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5050,
    proxy: {
      '/api': {
        target: 'http://localhost:5051',
        changeOrigin: true
      }
    }
  }
})
