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
      className="flex gap-1 rounded-full border border-neutral-800 bg-neutral-950/90 p-1 shadow-lg shadow-black/50 backdrop-blur"
    >
      {OPCIONES.map((opcion) => {
        const activo = opcion.value === capaActiva
        return (
          <button
            key={opcion.value}
            type="button"
            onClick={() => setCapaActiva(opcion.value)}
            aria-pressed={activo}
            className="relative rounded-full px-3 py-1.5 text-sm font-medium"
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
