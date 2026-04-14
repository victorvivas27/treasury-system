

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@core': path.resolve(__dirname, './src/core'),
      '@presentation': path.resolve(__dirname, './src/presentation'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Opcional: Para que no intente procesar archivos CSS pesados en los tests
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'], // 'html' genera una carpeta para ver el reporte visual
      clean: true, // Esto reemplaza al fallido --cleanOnRerender
      open: true, // <--- Esto abre el navegador automáticamente
      all: true, // Incluye archivos que no tienen tests aún
    },
  },
})
