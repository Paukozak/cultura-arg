import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

type Tema = 'dark' | 'light'
const STORAGE_KEY = 'cca-tema'

/** El valor inicial real ya lo aplicó el script bloqueante de index.html
 * (evita el flash del tema equivocado); acá solo se lee lo que quedó
 * puesto en el DOM para que el ícono arranque sincronizado. */
function temaActual(): Tema {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(temaActual)

  function alternar() {
    const siguiente: Tema = tema === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = siguiente
    localStorage.setItem(STORAGE_KEY, siguiente)
    setTema(siguiente)
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={
        tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
      }
      className="shrink-0 rounded-full border border-neutral-800 p-2 text-neutral-400 transition-colors hover:text-neutral-100"
    >
      {tema === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}
