import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './styles/globals.css'
import { useAuthStore, useThemeStore } from './store'

// Init auth token and theme
const { initAuth } = useAuthStore.getState()
const { initTheme } = useThemeStore.getState()
initAuth()
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: { background: '#161D2F', color: '#e2e8f0', border: '1px solid #253347', borderRadius: '12px', fontSize: '14px' },
        success: { iconTheme: { primary: '#10B981', secondary: '#161D2F' } },
        error: { iconTheme: { primary: '#F43F5E', secondary: '#161D2F' } },
        duration: 3500,
      }}
    />
  </BrowserRouter>
)
