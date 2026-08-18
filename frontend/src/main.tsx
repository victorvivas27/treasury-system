import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/presentation/App'
import '@/shared/style/global.css'
import '@/shared/style/ResponsiveDataList.css'
import '@/shared/ui/skeleton/Skeleton.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let reloading = false
    let hasController = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // La primera instalación toma control de la pestaña actual. No necesita
      // recargar porque ya se está ejecutando el bundle recién descargado.
      if (!hasController) {
        hasController = true
        return
      }
      if (reloading) return
      reloading = true
      window.location.reload()
    })

    void navigator.serviceWorker.register('/service-worker.js').then((registration) => {
      const currentBundle = new URL(import.meta.url).pathname
      const checkForUpdate = async () => {
        await registration.update()
        const response = await fetch('/', { cache: 'no-store' })
        if (!response.ok) return
        const html = await response.text()
        const publishedBundle = new DOMParser().parseFromString(html, 'text/html')
          .querySelector<HTMLScriptElement>('script[type="module"][src]')?.src
        if (publishedBundle && new URL(publishedBundle, window.location.origin).pathname
          !== currentBundle) {
          window.location.reload()
        }
      }

      void checkForUpdate()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void checkForUpdate()
      })
    }).catch((error: unknown) => {
      console.error('No se pudo registrar el Service Worker:', error)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
