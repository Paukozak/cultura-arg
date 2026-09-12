import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { provinciasGeo, type ProvinciaFeature } from '../../data/provincias'
import { useMapStore, type Capa } from '../../store/mapStore'
import { buildColorScales, colorForFeature } from './colorScales'

const WIDTH = 800
const HEIGHT = 900

// Provincias cuyo bounding box proyectado sea más chico que esto (en px, en
// cualquiera de los dos ejes) reciben además un marcador circular en su
// centroide. Hoy la única que cae acá es CABA: es geométricamente minúscula
// al lado del resto del país y, sin esto, no se puede ver ni clickear.
const MIN_MARKER_PX = 12
const MARKER_RADIUS = 6

// Look "relieve isométrico": cada provincia es una ficha extruida. El "lado"
// (una copia del mismo path, oscurecida y corrida hacia abajo) simula el
// grosor; la cara de arriba es la interactiva. Al pasar el mouse, la cara de
// arriba se levanta un poco más (el lado queda fijo), como si la ficha se
// despegara del mapa.
const EXTRUDE_DEPTH = 6
const HOVER_LIFT = 4

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

function metricaTooltip(feature: ProvinciaFeature, capa: Capa) {
  const { densidadPor100k, totalEspacios } = feature.properties
  if (capa === 'densidad') {
    return densidadPor100k === null
      ? 'sin datos de densidad'
      : `${formatNumero(densidadPor100k)} espacios/100k hab.`
  }
  return `${formatNumero(totalEspacios)} espacios`
}

export function NationalMap() {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const [hover, setHover] = useState<{
    feature: ProvinciaFeature
    x: number
    y: number
  } | null>(null)

  const path = useMemo(() => {
    const projection = geoMercator().fitSize([WIDTH, HEIGHT], provinciasGeo)
    return geoPath(projection)
  }, [])

  const scales = useMemo(() => buildColorScales(provinciasGeo.features), [])

  const svgRef = useRef<SVGSVGElement>(null)

  const handleEnter = (feature: ProvinciaFeature) => (e: MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ feature, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }
  const handleLeave = () => setHover(null)

  const drawn = provinciasGeo.features.map((feature) => {
    const bounds = path.bounds(feature)
    const w = bounds[1][0] - bounds[0][0]
    const h = bounds[1][1] - bounds[0][1]
    return {
      feature,
      d: path(feature) ?? undefined,
      color: colorForFeature(feature.properties, capaActiva, scales),
      needsMarker: Math.max(w, h) < MIN_MARKER_PX,
      centroid: path.centroid(feature),
      isHovered: hover?.feature.properties.id === feature.properties.id,
    }
  })

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-full w-full"
        style={{ filter: 'drop-shadow(0 18px 32px rgba(0, 0, 0, 0.65))' }}
        role="img"
        aria-label="Mapa de la Argentina por provincia"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          setHover((prev) => (prev ? { ...prev, x, y } : prev))
        }}
      >
        <defs>
          {/* Degradé tipo "bisel" sobre la cara de arriba: luz arriba a la
              izquierda, sombra abajo a la derecha. Da textura de relieve sin
              tocar el color de datos (se dibuja como capa aparte encima). */}
          <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        {/* Paso 1: los "lados" de todas las provincias, para que ninguno
            tape la cara de arriba de una provincia vecina. */}
        {drawn.map(({ feature, d, color }) => (
          <path
            key={`side-${feature.properties.id}`}
            d={d}
            transform={`translate(0, ${EXTRUDE_DEPTH})`}
            fill={color}
            style={{ filter: 'brightness(0.4) saturate(1.05)' }}
            pointerEvents="none"
          />
        ))}

        {/* Paso 2: las caras de arriba (interactivas) + su bisel + el
            marcador de CABA, todo por encima de cualquier lado. */}
        {drawn.map(({ feature, d, color, isHovered, needsMarker, centroid: [cx, cy] }) => {
          const lift = isHovered ? -HOVER_LIFT : 0
          return (
            <g key={`top-${feature.properties.id}`}>
              <path
                d={d}
                fill={color}
                stroke={isHovered ? '#f5820d' : 'rgba(10, 10, 10, 0.7)'}
                strokeWidth={isHovered ? 1.5 : 1}
                strokeLinejoin="round"
                style={{
                  transform: `translate(0, ${lift}px)`,
                  transition:
                    'transform 150ms ease, fill 200ms ease, stroke 150ms ease, filter 150ms ease',
                  filter: isHovered
                    ? 'brightness(1.15) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5))'
                    : 'none',
                }}
                onMouseEnter={handleEnter(feature)}
                onMouseLeave={handleLeave}
              />
              <path
                d={d}
                fill="url(#bevel)"
                pointerEvents="none"
                style={{
                  transform: `translate(0, ${lift}px)`,
                  transition: 'transform 150ms ease',
                }}
              />
              {needsMarker && (
                <circle
                  cx={cx}
                  cy={cy + lift}
                  r={isHovered ? MARKER_RADIUS + 1 : MARKER_RADIUS}
                  fill={color}
                  stroke={isHovered ? '#f5820d' : '#f5f2ea'}
                  strokeWidth={isHovered ? 1.5 : 1.25}
                  style={{
                    transition:
                      'cy 150ms ease, fill 200ms ease, stroke 150ms ease, r 150ms ease, filter 150ms ease',
                    filter: isHovered
                      ? 'drop-shadow(0 0 6px rgba(245, 130, 13, 0.55)) brightness(1.15)'
                      : 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7))',
                  }}
                  onMouseEnter={handleEnter(feature)}
                  onMouseLeave={handleLeave}
                />
              )}
            </g>
          )
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-800 bg-neutral-950/95 px-3 py-2 text-sm shadow-lg"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          <div className="font-medium text-neutral-100">{hover.feature.properties.nombre}</div>
          <div className="font-mono text-xs text-neutral-400">
            {metricaTooltip(hover.feature, capaActiva)}
          </div>
        </div>
      )}
    </div>
  )
}
