import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { env } from '@/config/env'
import App from '@/App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 4000,
      retry: 1,
      refetchOnWindowFocus: env.isDev,
    },
    mutations: {
      retry: 0,
    },
  },
})

if (typeof document !== 'undefined' && env.appTitle) {
  document.title = env.appTitle
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          richColors
          position="bottom-left"
          closeButton
          style={{ '--width': '320px' }}
          toastOptions={{
            className: 'font-sans !min-h-0 !px-3 !py-2 !text-sm',
            descriptionClassName: '!text-xs',
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
