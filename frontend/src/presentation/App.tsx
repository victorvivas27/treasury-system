import { AppRouter } from '@/presentation/routers/AppRouter'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/presentation/context/AuthContext'
import { ThemeProvider } from '@/presentation/context/ThemeContext'
import { NotificationProvider } from '@/presentation/context/NotificationContext'
import { RealtimeProvider } from '@/presentation/context/RealtimeContext'

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <RealtimeProvider><NotificationProvider><AppRouter /></NotificationProvider></RealtimeProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
