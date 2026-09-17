import { Eye, Settings, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMapStore } from '../store/mapStore'

function FilaToggle({
  icono: Icono,
  etiqueta,
  activo,
  onClick,
}: {
  icono: LucideIcon
  etiqueta: string
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={activo}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-200 transition-colors hover:bg-neutral-900"
    >
      <span className="flex items-center gap-2.5">
        <Icono className="h-4 w-4 text-neutral-400" aria-hidden="true" />
        {etiqueta}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          activo ? 'bg-accent' : 'bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            activo ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

/** Botón de configuración: agrupa ajustes de presentación (daltónicos, tema)
 * que antes eran dos botones sueltos en el header — juntos acá dejan más
 * lugar en el header y se leen como "preferencias", no como acciones de
 * primer nivel como el buscador o "¿Cómo se hizo?". */
export function SettingsMenu() {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const modoDaltonico = useMapStore((s) => s.modoDaltonico)
  const toggleModoDaltonico = useMapStore((s) => s.toggleModoDaltonico)
  const tema = useMapStore((s) => s.tema)
  const toggleTema = useMapStore((s) => s.toggleTema)

  useEffect(() => {
    if (!abierto) return
    function onPointerDown(e: PointerEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [abierto])

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Configuración"
        aria-haspopup="true"
        aria-expanded={abierto}
        className="flex shrink-0 items-center justify-center rounded-full border border-neutral-800 p-2 text-neutral-400 transition-colors hover:text-neutral-100"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
      </button>
      {abierto && (
        <div
          role="menu"
          aria-label="Configuración"
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-neutral-800 bg-neutral-950/98 p-1.5 shadow-xl shadow-black/50 backdrop-blur"
        >
          <FilaToggle
            icono={Eye}
            etiqueta="Modo daltónico"
            activo={modoDaltonico}
            onClick={toggleModoDaltonico}
          />
          <FilaToggle
            icono={Sun}
            etiqueta="Modo claro"
            activo={tema === 'light'}
            onClick={toggleTema}
          />
        </div>
      )}
    </div>
  )
}
