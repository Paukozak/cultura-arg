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
      className="flex gap-1 rounded-full border border-neutral-800 bg-neutral-950/90 p-1 backdrop-blur"
    >
      {OPCIONES.map((opcion) => {
        const activo = opcion.value === capaActiva
        return (
          <button
            key={opcion.value}
            type="button"
            onClick={() => setCapaActiva(opcion.value)}
            aria-pressed={activo}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activo
                ? 'bg-[#f5820d] text-neutral-950'
                : 'text-neutral-400 hover:text-neutral-100'
            }`}
          >
            {opcion.label}
          </button>
        )
      })}
    </div>
  )
}
