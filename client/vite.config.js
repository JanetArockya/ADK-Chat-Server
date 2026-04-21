import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

<<<<<<< HEAD
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
=======
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
>>>>>>> 6a46a420d0e2ae4daf47134576f902ee1ebb8036
})
