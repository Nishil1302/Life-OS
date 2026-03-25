import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Theme is applied synchronously in uiStore.ts before this runs,
// so no flicker occurs. Do NOT add/remove 'dark' class here.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
