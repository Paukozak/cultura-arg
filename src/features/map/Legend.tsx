import { useMemo } from 'react'
import { provinciasGeo } from '../../data/provincias'
import { useMapStore } from '../../store/mapStore'
import { buildColorScales, WARM_SEQUENTIAL_STEPS } from './colorScales'

const UNIDAD: Record<'densidad' | 'total', string> = {
  densidad: 'ESPACIOS/100K',
  total: 'ESPACIOS',
}

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

export function Legend() {
  const capaActiva = useMapStore((s) => s.capaActiva)

  const scales = useMemo(() => buildColorScales(provinciasGeo.features), [])

  const scale = capaActiva === 'densidad' ? scales.densidadScale : scales.totalScale
  const valores = scale.domain()
  const min = valores[0]
  const max = valores[valores.length - 1]

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 px-4 py-3 text-sm backdrop-blur">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
          {UNIDAD[capaActiva]}
        </span>
        <div className="flex overflow-hidden rounded">
          {WARM_SEQUENTIAL_STEPS.map((color) => (
            <span key={color} className="h-2.5 w-6" style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="flex justify-between font-mono text-xs text-neutral-500">
          <span>{formatNumero(min)}</span>
          <span>{formatNumero(max)}</span>
        </div>
      </div>
    </div>
  )
}
