import { Sun } from 'lucide-react'
import { useMapStore } from '../store/mapStore'

/** Botón de modo claro/oscuro: antes vivía adentro de un menú de
 * "Configuración" (ícono de engranaje) junto con el modo daltónico: al sacar
 * ese modo quedó como única opción, así que el menú de un solo ítem se
 * reemplaza por este botón directo — un click alterna el tema, sin
 * desplegable de por medio. */
export function ThemeToggle() {
  const tema = useMapStore((s) => s.tema)
  const toggleTema = useMapStore((s) => s.toggleTema)
  const esClaro = tema === 'light'

  return (
    <button
      type="button"
      onClick={toggleTema}
      aria-label={esClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      aria-pressed={esClaro}
      className={`flex shrink-0 items-center justify-center rounded-full border p-2 transition-colors ${
        esClaro
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-neutral-800 text-neutral-400 hover:text-neutral-100'
      }`}
    >
      <Sun className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
