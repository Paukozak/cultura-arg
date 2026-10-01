import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
// Autohospedadas (variables, subset por unicode-range): sin pedidos a Google
// Fonts ni CSS bloqueante en el <head>.
import '@fontsource-variable/space-grotesk/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* "user": respeta prefers-reduced-motion del sistema operativo para
          todas las animaciones de Framer Motion (paneles, vista completa) —
          las transiciones CSS puras (mapa) se manejan aparte en index.css. */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
)
