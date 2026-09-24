import { motion } from 'motion/react'
import { useMapStore, type Capa } from '../../store/mapStore'

const OPCIONES: { value: Capa; label: string }[] = [
  { value: 'densidad', label: 'Densidad' },
  { value: 'total', label: 'Total' },
]

export function LayerToggle({
  // Motion sincroniza automáticamente cualquier par de elementos que
  // comparta `layoutId` — con dos instancias de este toggle montadas a la
  // vez (el panel de una provincia sobre `MapInfoPanel`, que sigue montado
  // pero `inert` detrás), un mismo id las cruza y la pastilla de acento
  // salta entre paneles en vez de deslizarse dentro del suyo. Cada
  // instancia adicional pasa un id propio.
  layoutId = 'capa-activa-fondo',
  // Versión más chica y de un solo tamaño (sin el bump `sm:`) para lugares
  // más ajustados de espacio, como la cabecera del panel de provincia.
  compacto = false,
  // Sin el borde/sombra/backdrop-blur propios de un control flotante sobre
  // el mapa, y la pastilla activa en gris en vez del azul de marca — para
  // un lugar donde YA hay jerarquía visual alrededor (dentro de una tarjeta
  // del panel) y un toggle idéntico al de arriba compite por atención en
  // vez de leerse como una opción secundaria del bloque de departamentos.
  sutil = false,
}: {
  layoutId?: string
  compacto?: boolean
  sutil?: boolean
} = {}) {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const setCapaActiva = useMapStore((s) => s.setCapaActiva)

  return (
    <div
      role="group"
      aria-label="Capa del mapa"
      className={`flex gap-0.5 rounded-full ${
        sutil
          ? 'bg-neutral-900'
          : 'border border-neutral-800 bg-neutral-950/90 shadow-lg shadow-black/50 backdrop-blur'
      } ${compacto ? 'p-0.5' : 'p-0.5 sm:gap-1 sm:p-1'}`}
    >
      {OPCIONES.map((opcion) => {
        const activo = opcion.value === capaActiva
        return (
          <button
            key={opcion.value}
            type="button"
            onClick={() => setCapaActiva(opcion.value)}
            aria-pressed={activo}
            className={`relative rounded-full font-medium ${
              compacto
                ? 'px-1.5 py-0.5 text-[11px]'
                : 'px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm'
            }`}
          >
            {/* Fondo compartido entre los dos botones: al cambiar cuál está
                activo, Framer Motion anima ESTE elemento de una posición a
                la otra (layoutId) en vez de que cada botón prenda/apague su
                propio fondo — la pastilla de acento "se desliza" hacia el
                nuevo activo en vez de saltar. */}
            {activo && (
              <motion.span
                layoutId={layoutId}
                className={`absolute inset-0 rounded-full ${sutil ? 'bg-neutral-700' : 'bg-accent'}`}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span
              className={`relative transition-colors duration-150 ${
                activo
                  ? sutil
                    ? 'text-neutral-100'
                    : 'text-accent-ink'
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
