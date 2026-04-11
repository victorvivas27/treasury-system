import '@/presentation/App'
import { AppRouter } from '@/presentation/routers/AppRouter'
import { BrowserRouter } from 'react-router-dom'

function App() {

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}

export default App
