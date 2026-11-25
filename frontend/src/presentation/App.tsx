import { AppRouter } from '@/presentation/routers/AppRouter'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/presentation/context/AuthContext'
import { ThemeProvider } from '@/presentation/context/ThemeContext'
import { NotificationProvider } from '@/presentation/context/NotificationContext'
import { RealtimeProvider } from '@/presentation/context/RealtimeContext'
import { ServiceNotice } from '@/shared/ui/service-notice/ServiceNotice'

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <RealtimeProvider><NotificationProvider><AppRouter /><ServiceNotice /></NotificationProvider></RealtimeProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
