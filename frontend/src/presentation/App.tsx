import '@/presentation/App'
import { AppRouter } from '@/presentation/routers/AppRouter'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/presentation/context/AuthContext'

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
