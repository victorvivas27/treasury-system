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

    const reloadWithAppBackground = () => {
      const cover = document.createElement('div')
      cover.setAttribute('role', 'status')
      cover.setAttribute('aria-label', 'Actualizando Sistema de Tesorería')
      cover.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:2147483647', 'display:grid',
        'place-items:center', `background:${document.documentElement.dataset.theme === 'light'
          ? '#eef1f4' : '#0a0f1a'}`, 'color:#38bdf8',
      ].join(';')
      cover.innerHTML = '<span style="width:42px;height:42px;border:3px solid rgba(56,189,248,.2);border-top-color:#38bdf8;border-radius:50%;animation:boot-spin 1s linear infinite"></span>'
      document.body.appendChild(cover)
      requestAnimationFrame(() => requestAnimationFrame(() => window.location.reload()))
    }

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
      reloadWithAppBackground()
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
