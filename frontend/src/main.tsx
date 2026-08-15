import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/presentation/App'
import '@/shared/style/global.css'
import '@/shared/style/ResponsiveDataList.css'
import '@/shared/ui/skeleton/Skeleton.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js').catch((error: unknown) => {
      console.error('No se pudo registrar el Service Worker:', error)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
