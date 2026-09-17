import { useEffect, useState } from 'react'

/** Alto real de la ventana en píxeles, reactivo a `resize`. En píxeles (no
 * `vh`/`calc()`): lo necesita cualquier código que anime con Framer Motion,
 * que interpola un plano número cuadro a cuadro pero no un string CSS
 * `calc()` — ver el comentario en ProvincePanel.tsx donde se detectó el
 * problema. */
export function useWindowHeight(): number {
  const [alto, setAlto] = useState(() => window.innerHeight)
  useEffect(() => {
    const onResize = () => setAlto(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return alto
}
