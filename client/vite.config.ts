import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://warehouse.ldhuy.name.vn',
        changeOrigin: true,
        secure: false,
      },
      '/core-api': {
        target: 'https://coreapi.ldhuy.name.vn',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/core-api/, ''),
      },
    }
  }
})
