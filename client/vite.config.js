import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    dedupe: ['three']
  },
  optimizeDeps: {
    include: ['react-globe.gl', 'three']
  }
})
