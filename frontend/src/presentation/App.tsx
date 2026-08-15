import { AppRouter } from '@/presentation/routers/AppRouter'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/presentation/context/AuthContext'
import { ThemeProvider } from '@/presentation/context/ThemeContext'
import { NotificationProvider } from '@/presentation/context/NotificationContext'

function App() {

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider><AppRouter /></NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
