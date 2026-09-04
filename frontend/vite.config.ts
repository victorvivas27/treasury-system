

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const avatarCatalogModuleId = 'virtual:avatar-catalog'
const resolvedAvatarCatalogModuleId = `\0${avatarCatalogModuleId}`
const avatarFilePattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i

const readAvatarCatalog = () => {
  const avatarsDir = path.resolve(__dirname, 'public', 'avatars')
  let avatars: string[] = []
  try {
    avatars = fs.readdirSync(avatarsDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && avatarFilePattern.test(entry.name))
      .map(entry => `/avatars/${entry.name}`)
      .sort((first, second) => first.localeCompare(second, 'es'))
  } catch {
    avatars = []
  }
  return `export const profileAvatars = ${JSON.stringify(avatars)};\nexport default profileAvatars;\n`
}

const avatarCatalogPlugin = () => ({
  name: 'avatar-catalog',
  resolveId(id: string) {
    if (id === avatarCatalogModuleId) return resolvedAvatarCatalogModuleId
    return null
  },
  load(id: string) {
    if (id === resolvedAvatarCatalogModuleId) return readAvatarCatalog()
    return null
  },
  configureServer(server: import('vite').ViteDevServer) {
    const avatarsDir = path.resolve(__dirname, 'public', 'avatars')
    if (fs.existsSync(avatarsDir)) server.watcher.add(avatarsDir)
    server.watcher.on('all', (_event, changedPath) => {
      if (!changedPath.startsWith(avatarsDir)) return
      const module = server.moduleGraph.getModuleById(resolvedAvatarCatalogModuleId)
      if (module) server.moduleGraph.invalidateModule(module)
      server.ws.send({ type: 'full-reload' })
    })
  },
})

export default defineConfig({
  plugins: [
    avatarCatalogPlugin(),
    react(),
    {
      name: 'non-blocking-app-styles',
      enforce: 'post',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(
            /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g,
            (_, href: string) => `<link rel="preload" as="style" href="${href}" data-app-styles onload="this.onload=null;this.rel='stylesheet';document.documentElement.dataset.appStyles='ready';window.dispatchEvent(new Event('app:styles-ready'))"><noscript><link rel="stylesheet" href="${href}"></noscript>`,
          )
        },
      },
    },
  ],
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
     reporters: ['dot'],  // o 'default', 'verbose', 'dot'
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'], // 'html' genera una carpeta para ver el reporte visual

      clean: true, // Esto reemplaza al fallido --cleanOnRerender
            exclude: [
        // CSS y estilos
        '**/*.css',
        '**/*.scss',
        '**/*.sass',

        // Imágenes y assets
        '**/*.svg',
        '**/*.png',
        '**/*.jpg',
        '**/*.jpeg',
        '**/*.gif',
        '**/*.ico',

        // Tipos y configuraciones
        '**/*.d.ts',
        '**/vite.config.ts',
        '**/vitest.config.ts',
        '**/setupTests.ts',

        // Archivos principales
        '**/main.tsx',
        '**/vite-env.d.ts',

        // Node modules
        'node_modules/**',

        // Carpeta de coverage (evita loops)
        'coverage/**',
      ],
    },
  },
})
