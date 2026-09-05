

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

// Derive the first-paint CSS from the same source as the application styles.
// The rest of the stylesheet can keep loading without blocking the boot screen.
const readCriticalStyles = () => {
  const css = fs.readFileSync(path.resolve(__dirname, 'src/shared/style/global.css'), 'utf8')
  const boot = css.match(/\/\* critical-boot:start[^]*?\*\/([^]*?)\/\* critical-boot:end \*\//)?.[1]
  if (!boot) throw new Error('Missing critical boot styles in global.css')

  const roots = [...css.matchAll(/^(:root(?:\[data-theme="light"\])?) \{([^]*?)^\}/gm)]
    .map(([, selector, body]) => ({
      selector,
      declarations: [...body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)]
        .map(([, name, value]) => ({ name, value })),
    }))
  const required = new Set([...boot.matchAll(/var\((--[\w-]+)/g)].map(match => match[1]))
  for (const name of required) {
    const definitions = roots.flatMap(root => root.declarations.filter(declaration => declaration.name === name))
    if (!definitions.length) throw new Error(`Missing boot style variable: ${name}`)
    for (const { value } of definitions) {
      for (const match of value.matchAll(/var\((--[\w-]+)/g)) required.add(match[1])
    }
  }
  const variables = roots.map(({ selector, declarations }) => {
    const selected = declarations.filter(({ name }) => required.has(name))
    return selected.length ? `${selector}{${selected.map(({ name, value }) => `${name}:${value};`).join('')}}` : ''
  }).join('\n')
  return `<style data-critical-styles>${variables}\n${boot}</style>`
}

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
          return html.replace('<meta name="app-critical-styles" />', readCriticalStyles()).replace(
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
