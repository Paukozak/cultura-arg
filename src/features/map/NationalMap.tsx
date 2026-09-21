import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type TransitionEvent,
} from 'react'
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import {
  geometriaDetalle,
  provinciasGeo,
  type ProvinciaFeature,
} from '../../data/provincias'
import { useMapStore, type Capa } from '../../store/mapStore'
import { useMediaQuery } from '../../utils/useMediaQuery'
import {
  apagarConFondo,
  buildColorScales,
  colorForFeature,
  darken,
  highlightStroke,
} from './colorScales'
import { ProvincePins, type ZoomState } from './ProvincePins'

const WIDTH = 800
// Alto del viewBox: NO es una constante fija, se calcula dentro del
// componente (ver `HEIGHT` ahí) porque depende del viewport — ver el
// comentario junto a esa variable.

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
const CALLOUT_PILL_W = 64
const CALLOUT_PILL_H = 28

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
const ZOOM_MS = 450
// Entrada del mapa (ver `.provincia-cara`/`.provincia-lado` en index.css): las
// provincias aparecen en una ola de norte a sur — la de más arriba arranca de
// entrada y la de más abajo ENTRADA_ONDA_MS después.
const ENTRADA_ONDA_MS = 650
// Curva "ease-out" pronunciada: arranca rápido y llega a destino con una
// desaceleración larga y suave, en vez de la deceleración más brusca de un
// "ease" genérico — se nota sobre todo en el zoom-out, que es el tramo más
// largo (vuelve de golpe a escala 1).
const ZOOM_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'
const ZOOM_FILL_RATIO = 0.7
const MIN_ZOOM_BBOX_PX = 40

// `main` (App.tsx) ocupa el alto del viewport menos el header y centra el
// mapa dentro de ESE espacio, no del viewport completo: el centro del mapa
// queda (alto del header)/2 más abajo del centro real de la pantalla. A
// escala país, con la silueta de Argentina rodeada de sobra de espacio
// vacío, ese corrimiento es invisible; zoomeado a una sola provincia que
// llena el cuadro, se nota — se corrige corriendo el mapa hacia arriba ese
// mismo valor, pero solo mientras hay zoom. El alto del header ya NO es
// una constante fija (`headerHeight` del store, medido con ResizeObserver
// en Header.tsx): en mobile pasa a dos filas y mide más que en desktop.
const MAX_ZOOM_SCALE = 400
const CLUSTER_ZOOM_BOOST = 4

function bboxZoom(
  geometria: GeoPermissibleObjects,
  path: ReturnType<typeof geoPath>,
  width: number,
  height: number,
): ZoomState {
  const bounds = path.bounds(geometria)
  const w = Math.max(bounds[1][0] - bounds[0][0], MIN_ZOOM_BBOX_PX)
  const h = Math.max(bounds[1][1] - bounds[0][1], MIN_ZOOM_BBOX_PX)
  const cx = (bounds[0][0] + bounds[1][0]) / 2
  const cy = (bounds[0][1] + bounds[1][1]) / 2
  const scale = Math.min(
    (width * ZOOM_FILL_RATIO) / w,
    (height * ZOOM_FILL_RATIO) / h,
    MAX_ZOOM_SCALE,
  )
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
  const modoDaltonico = useMapStore((s) => s.modoDaltonico)
  const tema = useMapStore((s) => s.tema)
  const headerHeight = useMapStore((s) => s.headerHeight)
  const entradaMapa = useMapStore((s) => s.entradaMapa)
  const provinciaResaltada = useMapStore((s) => s.provinciaResaltada)
  const provinciaSeleccionada = useMapStore((s) => s.provinciaSeleccionada)
  const seleccionarProvincia = useMapStore((s) => s.seleccionarProvincia)
  const esMobil = useMediaQuery('(max-width: 767px)')
  const [hover, setHover] = useState<{
    feature: ProvinciaFeature
    x: number
    y: number
  } | null>(null)
  const [pinHover, setPinHover] = useState<{
    etiqueta: string
    x: number
    y: number
  } | null>(null)

  // Argentina, proyectada, mide (en las unidades del viewBox) mucho más de
  // alto que de ancho — su bounding box real dentro de un viewBox de
  // 800x900 ocupa el 100% del alto pero apenas el 51% del ancho. Con el
  // viewBox 800x900 (casi cuadrado) eso ya deja bastante espacio vacío a
  // los costados, pero en mobile el problema se duplica: el recuadro
  // disponible (bien angosto y alto, a diferencia del de escritorio, más
  // parecido a un cuadrado) tampoco se parece al viewBox, así que
  // `preserveAspectRatio` todavía deja franjas vacías arriba/abajo por
  // encima de eso. Subir el alto del viewBox en mobile (dejando el ancho
  // fijo, así no se mueve nada que dependa de él — `CALLOUT_DX`, el centro
  // del zoom, etc.) hace que el viewBox se parezca mucho más al recuadro
  // real del celular y el mapa termine usando casi toda esa altura en vez
  // de sobrar como espacio muerto.
  const HEIGHT = esMobil ? 1300 : 900

  const projection = useMemo(
    () => geoMercator().fitSize([WIDTH, HEIGHT], provinciasGeo),
    [HEIGHT],
  )
  const path = useMemo(() => geoPath(projection), [projection])

  const scales = useMemo(
    () => buildColorScales(provinciasGeo.features, modoDaltonico),
    [modoDaltonico],
  )

  // Path SVG (`d`) y centroide de cada provincia, precalculados UNA SOLA
  // VEZ por variante de geometría (no en cada render de `drawn` más abajo).
  // Generar el string `d` de un path recorre cada punto de la geometría —
  // con la de detalle (~5.5x más puntos que la low-poly, ver el comentario
  // de más abajo) para las 24 provincias, y `drawn` sin memoizar antes
  // recalculaba esto en CADA click de un cluster (`zoomAsentado` prende y
  // apaga en cada nivel de zoom) además de en cada movimiento de mouse
  // sobre el mapa (`hover` cambia) — de ahí que profundizar el zoom varias
  // veces seguidas se sintiera cada vez más pesado. Estos dos mapas se
  // calculan una sola vez (dependen solo de `path`, estable) y `drawn` pasa
  // a ser una simple lectura + cálculo de color, barato de rehacer en cada
  // hover/selección.
  const geomLowPoly = useMemo(() => {
    const m = new Map<
      string,
      { d?: string; centroid: [number, number]; necesitaLlamado: boolean }
    >()
    for (const f of provinciasGeo.features) {
      const bounds = path.bounds(f)
      const w = bounds[1][0] - bounds[0][0]
      const h = bounds[1][1] - bounds[0][1]
      m.set(f.properties.id, {
        d: path(f) ?? undefined,
        centroid: path.centroid(f),
        necesitaLlamado: Math.max(w, h) < MIN_TILE_PX,
      })
    }
    return m
  }, [path])

  const geomDetalle = useMemo(() => {
    const m = new Map<string, { d?: string; centroid: [number, number] }>()
    for (const f of provinciasGeo.features) {
      const detalle = geometriaDetalle(f.properties.id)
      const g = detalle ?? f
      m.set(f.properties.id, {
        d: path(g) ?? undefined,
        centroid: path.centroid(g),
      })
    }
    return m
  }, [path])

  const svgRef = useRef<SVGSVGElement>(null)

  // El nivel base de zoom (ajuste a la provincia entera) es una función pura
  // de la provincia seleccionada — no hace falta un efecto para calcularlo.
  const baseZoom = useMemo(() => {
    if (!provinciaSeleccionada) return null
    const feature = provinciasGeo.features.find(
      (f) => f.properties.id === provinciaSeleccionada,
    )
    if (!feature) return null
    // La geometría de detalle (si existe para esta provincia) da un
    // bounding box más fiel a la frontera real que el low-poly del mapa
    // nacional — importante para que el zoom encuadre bien la provincia.
    return bboxZoom(
      geometriaDetalle(provinciaSeleccionada) ?? feature,
      path,
      WIDTH,
      HEIGHT,
    )
  }, [provinciaSeleccionada, path, HEIGHT])

  // Niveles extra de zoom por encima del base, uno por cada clic en un
  // cluster de pines. Se resetean al cambiar de provincia ajustando el
  // estado durante el render (patrón "adjust state during rendering" de
  // React) en vez de con un efecto, para no disparar un setState síncrono
  // dentro de un efecto.
  const [extraNiveles, setExtraNiveles] = useState<ZoomState[]>([])
  const [provinciaDelZoom, setProvinciaDelZoom] = useState(
    provinciaSeleccionada,
  )
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

  // Marca cuándo el zoom está quieto (nada animando en este momento): parte
  // en `true` (nada se está moviendo al cargar la página) y se apaga apenas
  // cambia de nivel — entrar, profundizar en un cluster o volver al mapa
  // nacional —, hasta que el propio evento `transitionend` del `transform`
  // (ver `onTransitionEnd` en el `<g>` de más abajo) avisa que la animación
  // realmente terminó. Se usa el evento real en vez de un `setTimeout` de
  // ZOOM_MS: un timer puede llegar a disparar en un momento distinto al que
  // el `transform` realmente termina de animar (el navegador reprograma la
  // transición si `zoomKey` cambia de nuevo antes de que venza, o el timer
  // de una transición vieja puede quedar pendiente y disparar de más justo
  // cuando arranca una nueva) — con el evento nativo no hay que adivinar.
  // Mientras está en `false` (transición en curso) se apagan a propósito
  // varios efectos costosos que el navegador no puede acelerar por GPU
  // junto con la animación del `transform` — cada uno obliga a
  // re-rasterizar contenido complejo en cada frame en vez de solo
  // recomponer una capa ya rasterizada:
  // 1. Pines por espacio (ver ProvincePins): aparecen recién acá, con un
  //    fade — si aparecieran de entrada, su contra-escala no coincidiría
  //    con la escala real durante la transición y además el cálculo de
  //    miles de puntos (CABA, Buenos Aires) competía por el mismo frame que
  //    la animación.
  // 2. Geometría de detalle sin simplificar (ver `geomParaRender` más
  //    abajo): tiene ~5.5x más puntos que la low-poly, sumados en las 24
  //    provincias a la vez (todas cambian, no solo la seleccionada).
  // 3. La sombra del SVG completo y el halo de la provincia seleccionada
  //    (ambos con `filter: drop-shadow`, más abajo): un filtro CSS sobre
  //    contenido que se está escalando fuerza al navegador a recalcularlo
  //    en software en cada frame — medido con Playwright, sacar estos tres
  //    filtros durante la transición bajó el promedio de ~37ms a ~19ms por
  //    frame (de ~27fps a ~53fps) en Buenos Aires y Córdoba.
  const [zoomAsentado, setZoomAsentado] = useState(true)
  const [zoomKeyAnterior, setZoomKeyAnterior] = useState(zoomKey)
  if (zoomKey !== zoomKeyAnterior) {
    setZoomKeyAnterior(zoomKey)
    setZoomAsentado(false)
    setPinHover(null)
  }
  const onZoomTransitionEnd = (e: TransitionEvent<SVGGElement>) => {
    // El `<g>` no anima ninguna otra propiedad por transición, pero el
    // chequeo es gratis y documenta la intención igual.
    if (e.target === e.currentTarget && e.propertyName === 'transform') {
      setZoomAsentado(true)
    }
  }

  const onCluster = (cx: number, cy: number) => {
    setExtraNiveles((niveles) => {
      const top = niveles[niveles.length - 1] ?? baseZoom
      if (!top) return niveles
      const nuevaEscala = Math.min(
        top.scale * CLUSTER_ZOOM_BOOST,
        MAX_ZOOM_SCALE,
      )
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
        transform: `translate(${WIDTH / 2 - zoom.scale * zoom.cx}px, ${HEIGHT / 2 - zoom.scale * zoom.cy}px) scale(${zoom.scale})`,
        transition: `transform ${ZOOM_MS}ms ${ZOOM_EASING}`,
        // Adelanta la promoción a su propia capa de composición antes de
        // que arranque la transición, en vez de que el navegador la arme
        // recién al primer frame animado (evita un pequeño salto al inicio).
        willChange: 'transform',
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

  // Solo lectura de los mapas precalculados de arriba + cálculo de color —
  // nada acá recorre geometría, así que recalcular esto en cada hover o
  // cambio de selección es barato.
  const drawn = useMemo(
    () =>
      provinciasGeo.features.map((feature) => {
        const id = feature.properties.id
        const low = geomLowPoly.get(id)!
        const isSelected = provinciaSeleccionada === id

        // Con el zoom ya asentado se dibuja con la geometría de detalle (ver
        // src/data/provincias.ts), no solo en la provincia seleccionada: la
        // low-poly está pensada para leerse a escala país, y una vecina
        // (atenuada pero visible) queda con su propio borde groseramente
        // desalineado una vez que TODO el mapa se amplía 10-400x — se nota
        // como si invadiera el territorio de la provincia zoomeada.
        // Mientras la transición todavía está corriendo (`!zoomAsentado`) se
        // sigue usando la low-poly a propósito — ver el comentario junto a
        // `zoomAsentado`. La clasificación ficha/llamado, en cambio, siempre
        // se calcula sobre la low-poly: es una decisión de layout de la
        // vista sin zoom y no debe cambiar solo porque el bounding box de
        // detalle sea distinto.
        const hayZoom = zoom !== null
        const activo = hayZoom && zoomAsentado ? geomDetalle.get(id) : undefined
        const d = activo?.d ?? low.d
        const centroid = activo?.centroid ?? low.centroid

        const color = colorForFeature(feature.properties, capaActiva, scales)

        // Con una provincia seleccionada, el resto del mapa se atenúa para que
        // la seleccionada se destaque. Resaltada desde el ranking: las demás
        // se apagan un poco — el levantado + brillo de una sola provincia no
        // alcanza para encontrarla desde una lista lejana, sobre todo las
        // chicas (Tucumán, Tierra del Fuego) y las de color muy claro.
        const atenuacion =
          provinciaSeleccionada && !isSelected
            ? 0.35
            : !provinciaSeleccionada &&
                provinciaResaltada &&
                provinciaResaltada !== id
              ? 0.45
              : 1

        return {
          feature,
          d,
          color,
          // Precalculado en vez de un filtro CSS (`brightness(0.4)`) sobre el
          // path del lado: un filtro ahí obliga al navegador a re-rasterizarlo
          // en cada frame mientras el zoom anima — un color ya oscurecido es
          // gratis de escalar/trasladar (parte del mismo cálculo del `color`).
          colorLado: darken(color, 0.6),
          necesitaLlamado: low.necesitaLlamado,
          // Siempre del centroide de la low-poly (no el de detalle): el
          // retraso es de la entrada de la vista sin zoom, que no debe
          // cambiar porque después se acerque a una provincia.
          retrasoEntrada: `${Math.round(
            Math.min(1, Math.max(0, low.centroid[1] / HEIGHT)) *
              ENTRADA_ONDA_MS,
          )}ms`,
          centroid,
          // Hover propio del mapa, o resaltada desde el ranking del panel de
          // información (solo sin provincia elegida: con una zoomeada ese
          // panel queda tapado).
          isHovered:
            hover?.feature.properties.id === id ||
            (!provinciaSeleccionada && provinciaResaltada === id),
          isSelected,
          // Ver `atenuacion` arriba: `opacity` solo lo usan los llamados (CABA),
          // que van sobre el fondo y no tienen nada debajo que se transparente;
          // las provincias dibujadas usan `relleno`/`rellenoLado`.
          opacity: atenuacion,
          relleno: atenuacion < 1 ? apagarConFondo(color, atenuacion) : color,
          rellenoLado:
            atenuacion < 1
              ? apagarConFondo(darken(color, 0.6), atenuacion)
              : darken(color, 0.6),
        }
      }),
    [
      geomLowPoly,
      geomDetalle,
      HEIGHT,
      zoom,
      zoomAsentado,
      capaActiva,
      scales,
      provinciaSeleccionada,
      provinciaResaltada,
      hover,
    ],
  )

  const fichas = drawn.filter((d) => !d.necesitaLlamado)
  const llamados = drawn.filter((d) => d.necesitaLlamado)

  return (
    <div
      className="relative h-full"
      style={{
        transform: zoom
          ? `translateY(-${headerHeight / 2}px)`
          : 'translateY(0px)',
        transition: `transform ${ZOOM_MS}ms ${ZOOM_EASING}`,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        // `overflow-visible`: por defecto un `<svg>` recorta lo que se sale de
        // su caja, y con el zoom (contenido ampliado 10-400x) eso cortaba el
        // mapa en seco con bordes verticales rectos, en el medio de la
        // pantalla — una línea recta cruzando las provincias (Corrientes,
        // Misiones) durante la transición y un "rectángulo" con costados
        // duros una vez asentado. Ahora el recorte lo hace `<main>` (ver
        // App.tsx), en los bordes de la pantalla y bajo el header.
        className="h-full w-full overflow-visible"
        style={{
          // Apagada mientras el zoom está en transición — ver el
          // comentario junto a `zoomAsentado` — y también en modo claro: es
          // una sombra pensada para hacer flotar el mapa sobre un fondo
          // oscuro; sobre fondo claro se ve como un halo negro pegado al
          // mapa en vez de una sombra de profundidad.
          filter:
            zoomAsentado && tema === 'dark'
              ? 'drop-shadow(0 18px 32px rgba(0, 0, 0, 0.65))'
              : 'none',
        }}
        role="img"
        aria-label="Mapa de la Argentina por provincia"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          setHover((prev) => (prev ? { ...prev, x, y } : prev))
        }}
      >
        {/* Grupo con zoom: envuelve fichas + llamados + pines para que todo
            se escale/traslade como una sola unidad al entrar a una
            provincia (Etapa 6). `vectorEffect="non-scaling-stroke"` en los
            trazos evita que se vean gigantes una vez escalados. */}
        <g style={zoomGroupStyle} onTransitionEnd={onZoomTransitionEnd}>
          {/* Paso 1: los "lados" de todas las provincias, para que ninguno
            tape la cara de arriba de una provincia vecina. */}
          {/* `key={entradaMapa}`: al cambiar, el grupo se vuelve a montar y
            las provincias repiten su animación de entrada. */}
          <g key={entradaMapa}>
            {fichas.map(
              ({ feature, d, colorLado, rellenoLado, retrasoEntrada }) => (
                <path
                  key={`side-${feature.properties.id}`}
                  d={d}
                  transform={`translate(0, ${EXTRUDE_DEPTH})`}
                  fill={colorLado}
                  className="provincia-lado"
                  style={{
                    fill: rellenoLado,
                    transition: 'fill 250ms ease',
                    animationDelay: retrasoEntrada,
                  }}
                  pointerEvents="none"
                />
              ),
            )}

            {/* Paso 2: las caras de arriba (interactivas), por encima de cualquier
            lado. Color PLANO, el de la escala y nada más: antes había un
            degradé de "bisel" (luz/sombra) encima, y una misma provincia se
            veía de varios tonos — eso contradice la leyenda, donde cada color
            es un rango exacto de valores. El relieve lo dan los lados
            extruidos del paso 1, que no tocan el color de la cara. */}
            {fichas.map(
              ({
                feature,
                d,
                color,
                relleno,
                isHovered,
                isSelected,
                retrasoEntrada,
              }) => {
                const lift = isHovered ? -HOVER_LIFT : 0
                const stroke =
                  isHovered || isSelected
                    ? highlightStroke(color)
                    : 'rgba(10, 10, 10, 0.7)'
                const onClick = () =>
                  seleccionarProvincia(
                    provinciaSeleccionada === feature.properties.id
                      ? null
                      : feature.properties.id,
                  )
                return (
                  <g
                    key={`top-${feature.properties.id}`}
                    className="provincia-cara"
                    style={{ animationDelay: retrasoEntrada }}
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
                        fill: relleno,
                        transform: `translate(0, ${lift}px)`,
                        transition:
                          'transform 150ms ease, fill 200ms ease, stroke 150ms ease, filter 200ms ease',
                        // El halo en la seleccionada es feedback directo del click
                        // (qué provincia está activa), no decoración: usa el mismo
                        // violeta de marca en vez de un glow genérico. Apagado
                        // mientras el zoom está en transición — ver el comentario
                        // junto a `zoomAsentado`.
                        filter: isHovered
                          ? 'brightness(1.15) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5))'
                          : isSelected && zoomAsentado
                            ? 'drop-shadow(0 0 10px var(--color-accent)) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55))'
                            : 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={handleEnter(feature)}
                      onMouseLeave={handleLeave}
                      onClick={onClick}
                    />
                  </g>
                )
              },
            )}

            {/* Paso 3: llamados para provincias demasiado chicas para dibujarse
            (CABA) — línea guía desde su ubicación real hasta una etiqueta
            legible en el espacio vacío del mapa. El punto (en la ubicación
            real) y la etiqueta forman un solo target clickeable/hoverable;
            solo la línea guía es decorativa. */}
            {llamados.map(
              ({
                feature,
                color,
                isHovered,
                isSelected,
                centroid: [cx, cy],
                opacity,
                retrasoEntrada,
              }) => {
                const stroke =
                  isHovered || isSelected
                    ? highlightStroke(color)
                    : 'rgba(10, 10, 10, 0.7)'
                const anchorX = cx + CALLOUT_DX
                const anchorY = cy + CALLOUT_DY
                const etiqueta =
                  ETIQUETA_CORTA[feature.properties.id] ??
                  feature.properties.nombre
                // Una vez zoomeada esta provincia, el llamado (línea guía + globo
                // con etiqueta) deja de tener sentido: a esta escala ya se ve su
                // ubicación real con pines. Solo queda el punto como referencia.
                const zoomeada = isSelected && zoom !== null
                const onClick = () =>
                  seleccionarProvincia(
                    provinciaSeleccionada === feature.properties.id
                      ? null
                      : feature.properties.id,
                  )
                return (
                  <g
                    key={`llamado-${feature.properties.id}`}
                    className="provincia-lado"
                    style={{
                      opacity,
                      transition: 'opacity 250ms ease',
                      animationDelay: retrasoEntrada,
                    }}
                  >
                    {!zoomeada && (
                      <line
                        x1={cx}
                        y1={cy}
                        x2={anchorX - CALLOUT_PILL_W / 2}
                        y2={anchorY}
                        // `--color-neutral-500` (no un rgba fijo): un gris
                        // claro casi invisible sobre el fondo claro del modo
                        // día — este token sí se invierte con el tema, y un
                        // gris medio da contraste parecido contra fondo claro
                        // u oscuro.
                        stroke="var(--color-neutral-500)"
                        strokeOpacity={0.6}
                        strokeWidth={1.75}
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
                        style={{
                          transition: 'r 150ms ease, stroke 150ms ease',
                        }}
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
                              filter:
                                'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))',
                              transition: 'stroke 150ms ease, fill 150ms ease',
                            }}
                          />
                          <text
                            x={anchorX}
                            y={anchorY}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={15}
                            fontWeight={700}
                            // Fijo, no `var(--color-accent-ink)`: ese token
                            // contrasta contra la superficie de acento fija de
                            // la marca, pero acá el fondo del globo (`color`)
                            // es un paso de la escala secuencial de densidad —
                            // casi siempre oscuro — sin relación con el tema.
                            // `accent-ink` se vuelve casi negro en modo oscuro,
                            // ilegible sobre ese fondo oscuro.
                            fill="#f5f2ea"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              letterSpacing: '0.02em',
                            }}
                            pointerEvents="none"
                          >
                            {etiqueta}
                          </text>
                        </>
                      )}
                    </g>
                  </g>
                )
              },
            )}
          </g>

          {/* Paso 4: pines por espacio cultural, uno por provincia
            seleccionada — solo una vez que el zoom llegó a destino. */}
          {provinciaSeleccionada && zoom && (
            <ProvincePins
              provinciaId={provinciaSeleccionada}
              projection={projection}
              zoom={zoom}
              visible={zoomAsentado}
              onCluster={onCluster}
              onHoverPin={(etiqueta, clientX, clientY) => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setPinHover({
                  etiqueta,
                  x: clientX - rect.left,
                  y: clientY - rect.top,
                })
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
          <div className="font-medium text-neutral-100">
            {hover.feature.properties.nombre}
          </div>
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
          <div className="font-medium text-neutral-100">
            {pinHover.etiqueta}
          </div>
        </div>
      )}

      {extraNiveles.length > 0 && (
        <button
          type="button"
          onClick={alejarUnNivel}
          // `data-mapa-ui`: ProvincePanel cierra el panel (y deselecciona
          // la provincia) en cualquier click que no sea sobre `[data-provincia]`
          // ni dentro del panel — sin esto, este botón quedaba atrapado por
          // esa regla y CADA click acá también deseleccionaba todo, así que
          // "alejar" un nivel terminaba pareciendo "volver al mapa nacional"
          // de golpe en vez de retroceder de a un nivel como hace de verdad
          // `alejarUnNivel` (`niveles.slice(0, -1)`).
          data-mapa-ui="true"
          className="absolute bottom-4 left-4 z-10 rounded-full border border-neutral-800 bg-neutral-950/95 px-3 py-1.5 font-mono text-xs text-neutral-300 shadow-lg transition-colors hover:text-neutral-100"
        >
          ← alejar
        </button>
      )}
    </div>
  )
}
