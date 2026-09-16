import { Eye } from 'lucide-react'
import { useMapStore } from '../store/mapStore'

export function ColorblindToggle() {
  const modoDaltonico = useMapStore((s) => s.modoDaltonico)
  const toggleModoDaltonico = useMapStore((s) => s.toggleModoDaltonico)

  return (
    <button
      type="button"
      onClick={toggleModoDaltonico}
      aria-pressed={modoDaltonico}
      aria-label={
        modoDaltonico
          ? 'Desactivar la escala de color apta para daltónicos'
          : 'Activar la escala de color apta para daltónicos'
      }
      title="Escala de color apta para daltónicos"
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
        modoDaltonico
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-neutral-800 text-neutral-400 hover:text-neutral-100'
      }`}
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Daltónicos</span>
    </button>
  )
}
