import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { provinciasGeo, type ProvinciaFeature } from '../../data/provincias'
import { useMapStore, type Capa } from '../../store/mapStore'
import { buildColorScales, colorForFeature, highlightStroke } from './colorScales'

const WIDTH = 800
const HEIGHT = 900

// Provincias cuyo bounding box proyectado sea más chico que esto (en px, en
// cualquiera de los dos ejes) no se dibujan como ficha: a esta escala su
// polígono real es apenas unos pocos px y, simplificado como está en los
// datos, agrandarlo no se lee como su forma — queda un bloque irregular
// cualquiera. Se resuelven en cambio como un llamado (globo con etiqueta +
// línea guía hasta su ubicación real), la forma habitual de marcar un
// territorio demasiado chico para dibujarse en un mapa a esta escala. Hoy
// la única que cae acá es CABA.
const MIN_TILE_PX = 12
const ETIQUETA_CORTA: Record<string, string> = { '02': 'CABA' }
const CALLOUT_DX = 95
const CALLOUT_DY = -10
const CALLOUT_PILL_W = 52
const CALLOUT_PILL_H = 22

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
  const provinciaSeleccionada = useMapStore((s) => s.provinciaSeleccionada)
  const seleccionarProvincia = useMapStore((s) => s.seleccionarProvincia)
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
    const isSelected = provinciaSeleccionada === feature.properties.id
    return {
      feature,
      d: path(feature) ?? undefined,
      color: colorForFeature(feature.properties, capaActiva, scales),
      necesitaLlamado: Math.max(w, h) < MIN_TILE_PX,
      centroid: path.centroid(feature),
      isHovered: hover?.feature.properties.id === feature.properties.id,
      isSelected,
      // Con una provincia seleccionada, el resto del mapa se atenúa para que
      // la seleccionada se destaque.
      opacity: provinciaSeleccionada && !isSelected ? 0.35 : 1,
    }
  })

  const fichas = drawn.filter((d) => !d.necesitaLlamado)
  const llamados = drawn.filter((d) => d.necesitaLlamado)

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
        {fichas.map(({ feature, d, color, opacity }) => (
          <path
            key={`side-${feature.properties.id}`}
            d={d}
            transform={`translate(0, ${EXTRUDE_DEPTH})`}
            fill={color}
            style={{
              filter: 'brightness(0.4) saturate(1.05)',
              opacity,
              transition: 'opacity 250ms ease',
            }}
            pointerEvents="none"
          />
        ))}

        {/* Paso 2: las caras de arriba (interactivas) + su bisel, todo por
            encima de cualquier lado. */}
        {fichas.map(({ feature, d, color, isHovered, isSelected, opacity }) => {
          const lift = isHovered ? -HOVER_LIFT : 0
          const stroke = isHovered || isSelected ? highlightStroke(color) : 'rgba(10, 10, 10, 0.7)'
          const onClick = () =>
            seleccionarProvincia(
              provinciaSeleccionada === feature.properties.id ? null : feature.properties.id,
            )
          return (
            <g
              key={`top-${feature.properties.id}`}
              style={{ opacity, transition: 'opacity 250ms ease' }}
            >
              <path
                d={d}
                data-provincia={feature.properties.id}
                fill={color}
                stroke={stroke}
                strokeWidth={isHovered || isSelected ? 1.5 : 1}
                strokeLinejoin="round"
                style={{
                  transform: `translate(0, ${lift}px)`,
                  transition:
                    'transform 150ms ease, fill 200ms ease, stroke 150ms ease, filter 150ms ease',
                  filter: isHovered
                    ? 'brightness(1.15) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5))'
                    : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={handleEnter(feature)}
                onMouseLeave={handleLeave}
                onClick={onClick}
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
            </g>
          )
        })}

        {/* Paso 3: llamados para provincias demasiado chicas para dibujarse
            (CABA) — línea guía desde su ubicación real hasta una etiqueta
            legible en el espacio vacío del mapa. El punto (en la ubicación
            real) y la etiqueta forman un solo target clickeable/hoverable;
            solo la línea guía es decorativa. */}
        {llamados.map(({ feature, color, isHovered, isSelected, centroid: [cx, cy], opacity }) => {
          const stroke = isHovered || isSelected ? highlightStroke(color) : 'rgba(10, 10, 10, 0.7)'
          const anchorX = cx + CALLOUT_DX
          const anchorY = cy + CALLOUT_DY
          const etiqueta = ETIQUETA_CORTA[feature.properties.id] ?? feature.properties.nombre
          const onClick = () =>
            seleccionarProvincia(
              provinciaSeleccionada === feature.properties.id ? null : feature.properties.id,
            )
          return (
            <g
              key={`llamado-${feature.properties.id}`}
              style={{ opacity, transition: 'opacity 250ms ease' }}
            >
              <line
                x1={cx}
                y1={cy}
                x2={anchorX - CALLOUT_PILL_W / 2}
                y2={anchorY}
                stroke="rgba(245, 242, 234, 0.4)"
                strokeWidth={1}
                pointerEvents="none"
              />
              <g
                data-provincia={feature.properties.id}
                onMouseEnter={handleEnter(feature)}
                onMouseLeave={handleLeave}
                onClick={onClick}
                style={{ cursor: 'pointer' }}
              >
                {/* Círculo invisible más grande que el punto visual, para
                    que hoverear/clickear la ubicación real no requiera
                    apuntar a un punto de 3px exactos. */}
                <circle cx={cx} cy={cy} r={8} fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered || isSelected ? 4 : 3}
                  fill={color}
                  stroke={stroke}
                  strokeWidth={1.25}
                  style={{ transition: 'r 150ms ease, stroke 150ms ease' }}
                />
                <rect
                  x={anchorX - CALLOUT_PILL_W / 2}
                  y={anchorY - CALLOUT_PILL_H / 2}
                  width={CALLOUT_PILL_W}
                  height={CALLOUT_PILL_H}
                  rx={CALLOUT_PILL_H / 2}
                  fill={color}
                  stroke={stroke}
                  strokeWidth={isHovered || isSelected ? 1.5 : 1}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))',
                    transition: 'stroke 150ms ease, fill 150ms ease',
                  }}
                />
                <text
                  x={anchorX}
                  y={anchorY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight={700}
                  fill="#141414"
                  style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}
                  pointerEvents="none"
                >
                  {etiqueta}
                </text>
              </g>
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
