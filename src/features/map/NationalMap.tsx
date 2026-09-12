import { useMemo } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { provinciasGeo } from '../../data/provincias'

const WIDTH = 800
const HEIGHT = 900

export function NationalMap() {
  const path = useMemo(() => {
    const projection = geoMercator().fitSize([WIDTH, HEIGHT], provinciasGeo)
    return geoPath(projection)
  }, [])

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-full w-full"
      role="img"
      aria-label="Mapa de la Argentina por provincia"
    >
      {provinciasGeo.features.map((feature) => (
        <path
          key={feature.properties.id}
          d={path(feature) ?? undefined}
          fill="#3f3f46"
          stroke="#0a0a0a"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
