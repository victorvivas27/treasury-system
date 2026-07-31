import { AppRouter } from '@/presentation/routers/AppRouter'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/presentation/context/AuthContext'
import { ThemeProvider } from '@/presentation/context/ThemeContext'

function App() {

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
