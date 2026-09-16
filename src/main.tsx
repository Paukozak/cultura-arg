import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* "user": respeta prefers-reduced-motion del sistema operativo para
        todas las animaciones de Framer Motion (paneles, vista completa) —
        las transiciones CSS puras (mapa) se manejan aparte en index.css. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
