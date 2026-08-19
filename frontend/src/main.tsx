import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/presentation/App'
import '@/shared/style/global.css'
import '@/shared/style/ResponsiveDataList.css'
import '@/shared/ui/skeleton/Skeleton.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const UPDATE_INTERVAL_MS = 60 * 60 * 1000
    const currentBundle = new URL(import.meta.url).pathname
    const serviceWorkerUrl = `/service-worker.js?v=${encodeURIComponent(currentBundle)}`
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

      const controllerVersion = navigator.serviceWorker.controller?.scriptURL
      if (controllerVersion && sessionStorage.getItem('pwa-controller-version') === controllerVersion) {
        return
      }

      reloading = true
      if (controllerVersion) sessionStorage.setItem('pwa-controller-version', controllerVersion)
      window.location.reload()
    })

    void navigator.serviceWorker.register(serviceWorkerUrl, { updateViaCache: 'none' }).then((registration) => {
      let checking = false
      const checkForUpdate = async () => {
        if (checking || !navigator.onLine) return
        checking = true

        try {
          await registration.update()
          const updateUrl = new URL('/', window.location.origin)
          updateUrl.searchParams.set('__pwa_update', Date.now().toString())
          const response = await fetch(updateUrl, { cache: 'no-store' })
          if (!response.ok) return

          const html = await response.text()
          const publishedBundle = new DOMParser().parseFromString(html, 'text/html')
            .querySelector<HTMLScriptElement>('script[type="module"][src]')?.src
          if (!publishedBundle) return

          const publishedBundlePath = new URL(publishedBundle, window.location.origin).pathname
          if (publishedBundlePath !== currentBundle) {
            await navigator.serviceWorker.register(
              `/service-worker.js?v=${encodeURIComponent(publishedBundlePath)}`,
              { updateViaCache: 'none' },
            )
          }
        } catch (error: unknown) {
          console.warn('No se pudo comprobar la actualización de la PWA:', error)
        } finally {
          checking = false
        }
      }

      void checkForUpdate()
      window.setInterval(() => void checkForUpdate(), UPDATE_INTERVAL_MS)
      window.addEventListener('online', () => void checkForUpdate())
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
