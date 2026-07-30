import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/presentation/App'
import '@/shared/style/global.css'
import '@/shared/style/ResponsiveDataList.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
