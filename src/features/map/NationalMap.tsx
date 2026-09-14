import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { geometriaDetalle, provinciasGeo, type ProvinciaFeature } from '../../data/provincias'
import { useMapStore, type Capa } from '../../store/mapStore'
import { buildColorScales, colorForFeature, highlightStroke } from './colorScales'
import { ProvincePins, type ZoomState } from './ProvincePins'

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

// Zoom animado hacia la provincia clickeada (Etapa 6): al seleccionar una
// provincia, todo el mapa (fichas + llamados) se escala/traslada como una
// sola unidad hacia el área real de esa provincia, y ahí aparecen los pines
// por espacio. Un clic en un cluster de pines profundiza el zoom (multiplica
// la escala) en vez de abrir una vista de zoom completamente nueva — mismo
// mecanismo, un nivel más.
const ZOOM_TARGET: [number, number] = [WIDTH / 2, HEIGHT / 2]
const ZOOM_MS = 450
// Curva "ease-out" pronunciada: arranca rápido y llega a destino con una
// desaceleración larga y suave, en vez de la deceleración más brusca de un
// "ease" genérico — se nota sobre todo en el zoom-out, que es el tramo más
// largo (vuelve de golpe a escala 1).
const ZOOM_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'
const ZOOM_FILL_RATIO = 0.7
const MIN_ZOOM_BBOX_PX = 40
const MAX_ZOOM_SCALE = 400
const CLUSTER_ZOOM_BOOST = 4

function bboxZoom(geometria: GeoPermissibleObjects, path: ReturnType<typeof geoPath>): ZoomState {
  const bounds = path.bounds(geometria)
  const w = Math.max(bounds[1][0] - bounds[0][0], MIN_ZOOM_BBOX_PX)
  const h = Math.max(bounds[1][1] - bounds[0][1], MIN_ZOOM_BBOX_PX)
  const cx = (bounds[0][0] + bounds[1][0]) / 2
  const cy = (bounds[0][1] + bounds[1][1]) / 2
  const scale = Math.min((WIDTH * ZOOM_FILL_RATIO) / w, (HEIGHT * ZOOM_FILL_RATIO) / h, MAX_ZOOM_SCALE)
  return { cx, cy, scale }
}

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
  const [pinHover, setPinHover] = useState<{ etiqueta: string; x: number; y: number } | null>(
    null,
  )

  const projection = useMemo(() => geoMercator().fitSize([WIDTH, HEIGHT], provinciasGeo), [])
  const path = useMemo(() => geoPath(projection), [projection])

  const scales = useMemo(() => buildColorScales(provinciasGeo.features), [])

  const svgRef = useRef<SVGSVGElement>(null)

  // El nivel base de zoom (ajuste a la provincia entera) es una función pura
  // de la provincia seleccionada — no hace falta un efecto para calcularlo.
  const baseZoom = useMemo(() => {
    if (!provinciaSeleccionada) return null
    const feature = provinciasGeo.features.find((f) => f.properties.id === provinciaSeleccionada)
    if (!feature) return null
    // La geometría de detalle (si existe para esta provincia) da un
    // bounding box más fiel a la frontera real que el low-poly del mapa
    // nacional — importante para que el zoom encuadre bien la provincia.
    return bboxZoom(geometriaDetalle(provinciaSeleccionada) ?? feature, path)
  }, [provinciaSeleccionada, path])

  // Niveles extra de zoom por encima del base, uno por cada clic en un
  // cluster de pines. Se resetean al cambiar de provincia ajustando el
  // estado durante el render (patrón "adjust state during rendering" de
  // React) en vez de con un efecto, para no disparar un setState síncrono
  // dentro de un efecto.
  const [extraNiveles, setExtraNiveles] = useState<ZoomState[]>([])
  const [provinciaDelZoom, setProvinciaDelZoom] = useState(provinciaSeleccionada)
  if (provinciaSeleccionada !== provinciaDelZoom) {
    setProvinciaDelZoom(provinciaSeleccionada)
    setExtraNiveles([])
    // El tooltip de hover queda con datos de la provincia que estaba bajo
    // el cursor ANTES del zoom: como el mouse no se mueve al zoomear, no
    // se dispara un mouseenter/mouseleave nuevo y el tooltip viejo queda
    // colgado apuntando a una provincia que ya no está ahí.
    setHover(null)
    setPinHover(null)
  }

  const zoomStack = baseZoom ? [baseZoom, ...extraNiveles] : []
  const zoom = zoomStack[zoomStack.length - 1] ?? null
  const zoomKey = zoom ? `${zoom.cx}:${zoom.cy}:${zoom.scale}` : null

  // Los pines solo se muestran (con un fade) una vez que la animación de
  // zoom llegó a destino: si aparecieran de entrada, su contra-escala (ver
  // ProvincePins) no coincidiría con la escala real durante la transición y
  // se los vería con el tamaño equivocado por un instante.
  const [pinesVisibles, setPinesVisibles] = useState(false)
  const [zoomKeyAnterior, setZoomKeyAnterior] = useState(zoomKey)
  if (zoomKey !== zoomKeyAnterior) {
    setZoomKeyAnterior(zoomKey)
    setPinesVisibles(false)
    setPinHover(null)
  }
  useEffect(() => {
    if (!zoomKey) return
    const t = setTimeout(() => setPinesVisibles(true), ZOOM_MS)
    return () => clearTimeout(t)
  }, [zoomKey])

  const onCluster = (cx: number, cy: number) => {
    setExtraNiveles((niveles) => {
      const top = niveles[niveles.length - 1] ?? baseZoom
      if (!top) return niveles
      const nuevaEscala = Math.min(top.scale * CLUSTER_ZOOM_BOOST, MAX_ZOOM_SCALE)
      if (nuevaEscala === top.scale) return niveles
      return [...niveles, { cx, cy, scale: nuevaEscala }]
    })
  }
  const alejarUnNivel = () => setExtraNiveles((niveles) => niveles.slice(0, -1))

  // Ojo: a propósito NO se usa `transform-origin` para anclar el zoom al
  // punto (cx, cy). Si el origen cambiara entre el estado zoomeado y el
  // identidad (o entre dos niveles de zoom), la transición interpola
  // `transform` pero el origen salta de golpe al primer frame — la
  // animación se ve entrecortada en vez de una sola curva continua. En
  // cambio, el traslado necesario para anclar (cx, cy) al punto de destino
  // se resuelve a mano (translate = destino - escala·centro), así el
  // origen siempre es (0,0) y nunca hay una discontinuidad que rompa la
  // interpolación.
  const zoomGroupStyle: CSSProperties = zoom
    ? {
        transform: `translate(${ZOOM_TARGET[0] - zoom.scale * zoom.cx}px, ${ZOOM_TARGET[1] - zoom.scale * zoom.cy}px) scale(${zoom.scale})`,
        transition: `transform ${ZOOM_MS}ms ${ZOOM_EASING}`,
      }
    : {
        transform: 'translate(0px, 0px) scale(1)',
        transition: `transform ${ZOOM_MS}ms ${ZOOM_EASING}`,
      }

  const handleEnter = (feature: ProvinciaFeature) => (e: MouseEvent) => {
    // Con una provincia seleccionada (zoomeada), Chromium puede re-disparar
    // un mouseenter real sobre lo que quede bajo el cursor a mitad de la
    // animación de zoom (el contenido se mueve bajo un mouse quieto, y el
    // navegador re-evalúa qué elemento está debajo). Sin este freno, eso
    // deja un tooltip de una provincia vecina colgado mientras se mira otra.
    if (provinciaSeleccionada) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ feature, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }
  const handleLeave = () => setHover(null)

  const drawn = provinciasGeo.features.map((feature) => {
    // La clasificación ficha/llamado y las opacidades siempre se calculan
    // sobre la geometría low-poly (nacional) — es una decisión de layout de
    // la vista sin zoom y no debe cambiar solo porque, al zoomear, el
    // bounding box más fiel de la geometría de detalle sea distinto.
    const bounds = path.bounds(feature)
    const w = bounds[1][0] - bounds[0][0]
    const h = bounds[1][1] - bounds[0][1]
    const isSelected = provinciaSeleccionada === feature.properties.id

    // Con cualquier zoom activo se dibuja con la geometría de detalle (ver
    // src/data/provincias.ts), no solo en la provincia seleccionada: la
    // low-poly está pensada para leerse a escala país, y una vecina
    // (atenuada pero visible) queda con su propio borde groseramente
    // desalineado una vez que TODO el mapa se amplía 10-400x — se nota
    // como si invadiera el territorio de la provincia zoomeada.
    const hayZoom = zoom !== null
    const geomParaRender = (hayZoom && geometriaDetalle(feature.properties.id)) || feature

    return {
      feature,
      d: path(geomParaRender) ?? undefined,
      color: colorForFeature(feature.properties, capaActiva, scales),
      necesitaLlamado: Math.max(w, h) < MIN_TILE_PX,
      centroid: path.centroid(geomParaRender),
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

        {/* Grupo con zoom: envuelve fichas + llamados + pines para que todo
            se escale/traslade como una sola unidad al entrar a una
            provincia (Etapa 6). `vectorEffect="non-scaling-stroke"` en los
            trazos evita que se vean gigantes una vez escalados. */}
        <g style={zoomGroupStyle}>
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
                vectorEffect="non-scaling-stroke"
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
          // Una vez zoomeada esta provincia, el llamado (línea guía + globo
          // con etiqueta) deja de tener sentido: a esta escala ya se ve su
          // ubicación real con pines. Solo queda el punto como referencia.
          const zoomeada = isSelected && zoom !== null
          const onClick = () =>
            seleccionarProvincia(
              provinciaSeleccionada === feature.properties.id ? null : feature.properties.id,
            )
          return (
            <g
              key={`llamado-${feature.properties.id}`}
              style={{ opacity, transition: 'opacity 250ms ease' }}
            >
              {!zoomeada && (
                <line
                  x1={cx}
                  y1={cy}
                  x2={anchorX - CALLOUT_PILL_W / 2}
                  y2={anchorY}
                  stroke="rgba(245, 242, 234, 0.4)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )}
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
                  vectorEffect="non-scaling-stroke"
                  style={{ transition: 'r 150ms ease, stroke 150ms ease' }}
                />
                {!zoomeada && (
                  <>
                    <rect
                      x={anchorX - CALLOUT_PILL_W / 2}
                      y={anchorY - CALLOUT_PILL_H / 2}
                      width={CALLOUT_PILL_W}
                      height={CALLOUT_PILL_H}
                      rx={CALLOUT_PILL_H / 2}
                      fill={color}
                      stroke={stroke}
                      strokeWidth={isHovered || isSelected ? 1.5 : 1}
                      vectorEffect="non-scaling-stroke"
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
                  </>
                )}
              </g>
            </g>
          )
        })}

        {/* Paso 4: pines por espacio cultural, uno por provincia
            seleccionada — solo una vez que el zoom llegó a destino. */}
        {provinciaSeleccionada && zoom && (
          <ProvincePins
            provinciaId={provinciaSeleccionada}
            projection={projection}
            zoom={zoom}
            visible={pinesVisibles}
            onCluster={onCluster}
            onHoverPin={(etiqueta, clientX, clientY) => {
              const rect = svgRef.current?.getBoundingClientRect()
              if (!rect) return
              setPinHover({ etiqueta, x: clientX - rect.left, y: clientY - rect.top })
            }}
            onLeavePin={() => setPinHover(null)}
          />
        )}
        </g>
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

      {pinHover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-800 bg-neutral-950/95 px-3 py-2 text-sm shadow-lg"
          style={{ left: pinHover.x, top: pinHover.y - 10 }}
        >
          <div className="font-medium text-neutral-100">{pinHover.etiqueta}</div>
        </div>
      )}

      {extraNiveles.length > 0 && (
        <button
          type="button"
          onClick={alejarUnNivel}
          className="absolute bottom-4 left-4 z-10 rounded-full border border-neutral-800 bg-neutral-950/95 px-3 py-1.5 font-mono text-xs text-neutral-300 shadow-lg transition-colors hover:text-neutral-100"
        >
          ← alejar
        </button>
      )}
    </div>
  )
}
