import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/presentation/App'
import '@/shared/style/global.css'
import '@/shared/style/ResponsiveDataList.css'
import '@/shared/ui/skeleton/Skeleton.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
