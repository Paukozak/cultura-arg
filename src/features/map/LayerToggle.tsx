import { motion } from 'motion/react'
import { useMapStore, type Capa } from '../../store/mapStore'

const OPCIONES: { value: Capa; label: string }[] = [
  { value: 'densidad', label: 'Densidad' },
  { value: 'total', label: 'Total' },
]

export function LayerToggle() {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const setCapaActiva = useMapStore((s) => s.setCapaActiva)

  return (
    <div
      role="group"
      aria-label="Capa del mapa"
      className="flex gap-0.5 rounded-full border border-neutral-800 bg-neutral-950/90 p-0.5 shadow-lg shadow-black/50 backdrop-blur sm:gap-1 sm:p-1"
    >
      {OPCIONES.map((opcion) => {
        const activo = opcion.value === capaActiva
        return (
          <button
            key={opcion.value}
            type="button"
            onClick={() => setCapaActiva(opcion.value)}
            aria-pressed={activo}
            className="relative rounded-full px-2 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm"
          >
            {/* Fondo compartido entre los dos botones: al cambiar cuál está
                activo, Framer Motion anima ESTE elemento de una posición a
                la otra (layoutId) en vez de que cada botón prenda/apague su
                propio fondo — la pastilla de acento "se desliza" hacia el
                nuevo activo en vez de saltar. */}
            {activo && (
              <motion.span
                layoutId="capa-activa-fondo"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span
              className={`relative transition-colors duration-150 ${
                activo
                  ? 'text-accent-ink'
                  : 'text-neutral-400 hover:text-neutral-100'
              }`}
            >
              {opcion.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
