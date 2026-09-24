import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type TouchEvent,
  type TransitionEvent,
} from 'react'
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { departamentosResumen } from '../../data/departamentos'
import {
  geometriaDetalle,
  malvinasGeo,
  provinciasGeo,
  type ProvinciaFeature,
} from '../../data/provincias'
import { useDepartamentos } from '../../data/useDepartamentos'
import { useMapStore, type Capa } from '../../store/mapStore'
import { useMediaQuery } from '../../utils/useMediaQuery'
import {
  apagarConFondo,
  buildColorScales,
  colorForFeature,
  darken,
  highlightStroke,
  type ConEstadisticas,
} from './colorScales'
import { DepartamentosChoropleth } from './DepartamentosChoropleth'
import {
  ALTO_TOOLTIP_DEPARTAMENTO_PX,
  ALTO_TOOLTIP_PROVINCIA_PX,
  tooltipVaDebajo,
} from './tooltipPosicion'

interface ZoomState {
  cx: number
  cy: number
  scale: number
}

const WIDTH = 800
// Alto del viewBox: NO es una constante fija, se calcula dentro del
// componente (ver `HEIGHT` ahí) porque depende del viewport — ver el
// comentario junto a esa variable.

// Gris propio de las Malvinas, no `SIN_DATOS_COLOR` (compartido con
// provincias sin datos): más claro para que la ficha no se lea tan apagada.
const MALVINAS_COLOR = '#78716c'

// Provincias cuyo bounding box proyectado sea más chico que esto (en px, en
// cualquiera de los dos ejes) se dibujan igual que cualquier otra ficha
// (color, click-to-zoom, todo lo de Paso 1/2), pero además se les suma una
// etiqueta (línea guía + globo con nombre) apuntando a su ubicación real: a
// esta escala su ficha real mide unos pocos px, muy chica para leerla o
// clickearla con comodidad. Hoy la única que cae acá es CABA.
const MIN_TILE_PX = 12
const ETIQUETA_CORTA: Record<string, string> = { '02': 'CABA' }
const CALLOUT_DX = 95
const CALLOUT_DY = -10
const CALLOUT_PILL_W = 70
const CALLOUT_PILL_H = 32

// Look "relieve isométrico": cada provincia es una ficha extruida. El "lado"
// (una copia del mismo path, oscurecida y corrida hacia abajo) simula el
// grosor; la cara de arriba es la interactiva. Al pasar el mouse, la cara de
// arriba se levanta un poco más (el lado queda fijo), como si la ficha se
// despegara del mapa.
const EXTRUDE_DEPTH = 6
const HOVER_LIFT = 4

// Mobile no tiene mouseenter/mousemove por ficha: mantener presionado
// reproduce el hover de desktop (ver `onTouchStart`/`onTouchMove` más abajo)
// — bastante más que un tap accidental (evita que arrancar a deslizar el
// dedo se lea como "empezar a explorar") pero corto para sentirse
// responsive. La tolerancia de movimiento es la distancia que puede
// moverse el dedo mientras se espera este umbral sin que cuente como
// arrastre (dedos no quedan perfectamente quietos).
const TOQUE_LARGO_MS = 350
const TOQUE_TOLERANCIA_PX = 10

// Zoom animado hacia la provincia clickeada (Etapa 6): al seleccionar una
// provincia, todo el mapa se escala/traslada como una sola unidad hacia el
// área real de esa provincia.
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
// En mobile se corrige el mismatch de aspecto contra el cuadro real (ver
// `coverFit` más abajo), así que el margen de sobra de ZOOM_FILL_RATIO ya no
// tiene que absorber ese error de más — se puede acercar mucho más al 100%.
const ZOOM_FILL_RATIO_MOBIL = 0.92
// Corrimiento hacia abajo del centrado (ver `margenArribaExtra` en
// `bboxZoom`): algunas provincias, con el fill de arriba ya muy ajustado,
// quedaban pegadas contra el borde superior — un margen parejo
// arriba/abajo no alcanzaba porque la forma real de la provincia no
// siempre está centrada dentro de su propio bounding box.
const MARGEN_ARRIBA_MOBIL_RATIO = 0.045

function bboxZoom(
  geometria: GeoPermissibleObjects,
  path: ReturnType<typeof geoPath>,
  width: number,
  height: number,
  fillRatio: number = ZOOM_FILL_RATIO,
  // En unidades del viewBox, no de la fórmula de `fillRatio` (que reparte
  // el margen libre por igual arriba/abajo): se lo resta solo del lado de
  // arriba, corriendo el centrado hacia abajo, para las provincias que con
  // el fill ajustado de mobile quedaban pegadas al borde superior — sin
  // sacarle margen a los costados/abajo, que ya estaban bien.
  margenArribaExtra = 0,
): ZoomState {
  const bounds = path.bounds(geometria)
  // Sin piso mínimo: el scale es puramente proporcional al tamaño real de
  // la provincia (chica o grande, siempre llena el ZOOM_FILL_RATIO de la
  // pantalla) — un piso fijo achataba a las provincias más chicas (CABA) a
  // un zoom mucho menor del que les tocaría por tamaño real. `MAX_ZOOM_SCALE`
  // ya alcanza como techo de seguridad para un bbox casi nulo.
  const w = bounds[1][0] - bounds[0][0]
  const h = bounds[1][1] - bounds[0][1]
  const cx = (bounds[0][0] + bounds[1][0]) / 2
  const cy = (bounds[0][1] + bounds[1][1]) / 2
  const scale = Math.min(
    (width * fillRatio) / w,
    (height * fillRatio) / h,
    MAX_ZOOM_SCALE,
  )
  return { cx, cy: cy - margenArribaExtra / scale, scale }
}

// El viewBox (WIDTH x HEIGHT) tiene una forma fija, pensada para la vista
// país entera — pero el cuadro real donde se dibuja el SVG cambia de forma
// en mobile apenas se abre una provincia (aparece la hoja inferior, que le
// come alto). Como `preserveAspectRatio` (default) encaja el viewBox
// COMPLETO dentro de ese cuadro sin recortarlo, un mismatch de aspecto deja
// franjas vacías a los costados o arriba/abajo — y el `ZOOM_FILL_RATIO`,
// calculado contra el viewBox y no contra el cuadro real, termina dejando
// la provincia bastante más chica de lo que el cuadro real permitiría.
// Esto calcula un WIDTH/HEIGHT "efectivo" (mismas unidades del viewBox) que
// tiene la forma exacta del cuadro real — el opuesto de `preserveAspectRatio`
// (que encoge para que el viewBox ENTRE en el cuadro, "contain"), acá se
// agranda para que el cuadro ENTRE en el viewBox efectivo ("cover") — así
// `bboxZoom` calcula el scale contra el espacio de verdad disponible.
function coverFit(boxW: number, boxH: number, viewW: number, viewH: number) {
  const boxAspecto = boxW / boxH
  const viewAspecto = viewW / viewH
  return boxAspecto > viewAspecto
    ? { width: viewH * boxAspecto, height: viewH }
    : { width: viewW, height: viewW / boxAspecto }
}

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

function metricaTooltip(propiedades: ConEstadisticas, capa: Capa) {
  const { densidadPor100k, totalEspacios } = propiedades
  if (capa === 'densidad') {
    return densidadPor100k === null
      ? 'sin datos de densidad'
      : `${formatNumero(densidadPor100k)} espacios/100k hab.`
  }
  return `${formatNumero(totalEspacios)} espacios`
}

export function NationalMap() {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const tema = useMapStore((s) => s.tema)
  const headerHeight = useMapStore((s) => s.headerHeight)
  const entradaMapa = useMapStore((s) => s.entradaMapa)
  const provinciaResaltada = useMapStore((s) => s.provinciaResaltada)
  const provinciaSeleccionada = useMapStore((s) => s.provinciaSeleccionada)
  const seleccionarProvincia = useMapStore((s) => s.seleccionarProvincia)
  const esMobil = useMediaQuery('(max-width: 767px)')
  // `abajo`: el tooltip no entra arriba del cursor (ver `tooltipVaDebajo`).
  const [hover, setHover] = useState<{
    feature: ProvinciaFeature
    x: number
    y: number
    abajo: boolean
  } | null>(null)
  const [departamentoHover, setDepartamentoHover] = useState<
    | ({
        id: string
        nombre: string
        x: number
        y: number
        abajo: boolean
      } & ConEstadisticas)
    | null
  >(null)

  // Levantado de `useDepartamentos` (antes vivía dentro de
  // DepartamentosChoropleth): el hit-test táctil (ver más abajo) necesita
  // buscar qué departamento hay bajo el dedo por su id, y esos datos solo
  // existen acá si se cargan en este nivel — de paso, un único punto de
  // carga en vez de dos hooks separados pidiendo lo mismo.
  const departamentosData = useDepartamentos(provinciaSeleccionada)

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

  const scales = useMemo(() => buildColorScales(provinciasGeo.features), [])

  // Escala de color del choropleth por departamento (Etapa 9), calculada
  // sobre los ~529 departamentos del país entero (no solo los de la
  // provincia zoomeada) — así el color de un departamento es el mismo
  // sin importar qué otra provincia se visitó antes. `departamentosResumen`
  // es liviano (solo propiedades, sin geometría) y se carga eager.
  const departamentoScales = useMemo(
    () =>
      buildColorScales(
        departamentosResumen.map((properties) => ({ properties })),
      ),
    [],
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
      { d?: string; centroid: [number, number]; necesitaEtiqueta: boolean }
    >()
    for (const f of provinciasGeo.features) {
      const bounds = path.bounds(f)
      const w = bounds[1][0] - bounds[0][0]
      const h = bounds[1][1] - bounds[0][1]
      m.set(f.properties.id, {
        d: path(f) ?? undefined,
        centroid: path.centroid(f),
        necesitaEtiqueta: Math.max(w, h) < MIN_TILE_PX,
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

  // Islas Malvinas: ficha gris fija, fuera de `provinciasGeo` (ver el
  // comentario junto a `malvinasGeo`). Se proyecta con la misma `path`, en su
  // ubicación real — que cae en mar abierto al sureste de la costa
  // patagónica, sin superponerse a ninguna provincia.
  const malvinas = useMemo(
    () => ({
      d: path(malvinasGeo) ?? undefined,
      retrasoEntrada: `${Math.round(
        Math.min(1, Math.max(0, path.centroid(malvinasGeo)[1] / HEIGHT)) *
          ENTRADA_ONDA_MS,
      )}ms`,
    }),
    [path, HEIGHT],
  )

  const svgRef = useRef<SVGSVGElement>(null)

  // Cuadro real (en px) donde el SVG se dibuja — cambia de forma en mobile
  // cuando aparece/desaparece la hoja inferior (ver `coverFit` arriba). Solo
  // hace falta en mobile: en desktop el ancho/alto del viewBox ya se acerca
  // bastante a la forma real de `main` y no hubo reporte de sobra ahí.
  const [boxSize, setBoxSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    if (!esMobil) return
    const el = svgRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setBoxSize({ w: width, h: height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [esMobil])

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
    const geometria = geometriaDetalle(provinciaSeleccionada) ?? feature
    if (esMobil && boxSize) {
      const efectivo = coverFit(boxSize.w, boxSize.h, WIDTH, HEIGHT)
      return bboxZoom(
        geometria,
        path,
        efectivo.width,
        efectivo.height,
        ZOOM_FILL_RATIO_MOBIL,
        HEIGHT * MARGEN_ARRIBA_MOBIL_RATIO,
      )
    }
    return bboxZoom(geometria, path, WIDTH, HEIGHT)
  }, [provinciaSeleccionada, path, HEIGHT, esMobil, boxSize])

  // Se resetea el tooltip de hover al cambiar de provincia ajustando el
  // estado durante el render (patrón "adjust state during rendering" de
  // React) en vez de con un efecto, para no disparar un setState síncrono
  // dentro de un efecto. El tooltip queda con datos de la provincia que
  // estaba bajo el cursor ANTES del zoom: como el mouse no se mueve al
  // zoomear, no se dispara un mouseenter/mouseleave nuevo y el tooltip
  // viejo queda colgado apuntando a una provincia que ya no está ahí.
  const [provinciaDelZoom, setProvinciaDelZoom] = useState(
    provinciaSeleccionada,
  )
  if (provinciaSeleccionada !== provinciaDelZoom) {
    setProvinciaDelZoom(provinciaSeleccionada)
    setHover(null)
    setDepartamentoHover(null)
  }

  const zoom = baseZoom
  const zoomKey = zoom ? `${zoom.cx}:${zoom.cy}:${zoom.scale}` : null

  // Marca cuándo el zoom está quieto (nada animando en este momento): parte
  // en `true` (nada se está moviendo al cargar la página) y se apaga apenas
  // cambia de nivel — entrar o volver al mapa nacional —, hasta que el
  // propio evento `transitionend` del `transform` (ver `onTransitionEnd` en
  // el `<g>` de más abajo) avisa que la animación realmente terminó. Se usa
  // el evento real en vez de un `setTimeout` de ZOOM_MS: un timer puede
  // llegar a disparar en un momento distinto al que el `transform`
  // realmente termina de animar (el navegador reprograma la transición si
  // `zoomKey` cambia de nuevo antes de que venza, o el timer de una
  // transición vieja puede quedar pendiente y disparar de más justo cuando
  // arranca una nueva) — con el evento nativo no hay que adivinar.
  // Mientras está en `false` (transición en curso) se apagan a propósito
  // varios efectos costosos que el navegador no puede acelerar por GPU
  // junto con la animación del `transform` — cada uno obliga a
  // re-rasterizar contenido complejo en cada frame en vez de solo
  // recomponer una capa ya rasterizada:
  // 1. Geometría de detalle sin simplificar (ver `geomParaRender` más
  //    abajo): tiene ~5.5x más puntos que la low-poly, sumados en las 24
  //    provincias a la vez (todas cambian, no solo la seleccionada).
  // 2. La sombra del SVG completo y el halo de la provincia seleccionada
  //    (ambos con `filter: drop-shadow`, más abajo): un filtro CSS sobre
  //    contenido que se está escalando fuerza al navegador a recalcularlo
  //    en software en cada frame — medido con Playwright, sacar estos
  //    filtros durante la transición bajó el promedio de ~37ms a ~19ms por
  //    frame (de ~27fps a ~53fps) en Buenos Aires y Córdoba.
  const [zoomAsentado, setZoomAsentado] = useState(true)
  const [zoomKeyAnterior, setZoomKeyAnterior] = useState(zoomKey)
  if (zoomKey !== zoomKeyAnterior) {
    setZoomKeyAnterior(zoomKey)
    setZoomAsentado(false)
  }
  const onZoomTransitionEnd = (e: TransitionEvent<SVGGElement>) => {
    // El `<g>` no anima ninguna otra propiedad por transición, pero el
    // chequeo es gratis y documenta la intención igual.
    if (e.target === e.currentTarget && e.propertyName === 'transform') {
      setZoomAsentado(true)
    }
  }

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
    setHover({
      feature,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      abajo: tooltipVaDebajo(
        espacioSobreCursor(e.clientY),
        ALTO_TOOLTIP_PROVINCIA_PX,
      ),
    })
  }
  const handleLeave = () => setHover(null)

  // Distancia (px de pantalla) entre el cursor y el borde superior visible del
  // mapa: `main` recorta contra el header (ver App.tsx). En coordenadas de
  // pantalla y no del SVG para que valga igual con o sin zoom (el contenedor
  // se traslada con `translateY` mientras hay una provincia seleccionada).
  const espacioSobreCursor = (clientY: number) => {
    const bordeSuperior =
      svgRef.current?.closest('main')?.getBoundingClientRect().top ?? 0
    return clientY - bordeSuperior
  }

  // Estado del gesto de "mantener presionado" en mobile — en un ref (no
  // estado de React) porque cambia en cada touchmove del arrastre y no debe
  // disparar un re-render por sí mismo, solo mientras corre el timer que
  // decide si el toque se convierte en exploración.
  const toqueRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null
    x: number
    y: number
    activo: boolean
  }>({ timer: null, x: 0, y: 0, activo: false })

  useEffect(() => {
    return () => {
      if (toqueRef.current.timer !== null) clearTimeout(toqueRef.current.timer)
    }
  }, [])

  const limpiarToque = () => {
    if (toqueRef.current.timer !== null) clearTimeout(toqueRef.current.timer)
    toqueRef.current = { timer: null, x: 0, y: 0, activo: false }
  }

  // Hit-test manual con `elementFromPoint`: a diferencia del mouse, un
  // `touchmove` no dispara mouseenter/mouseleave por cada ficha que el dedo
  // va recorriendo (el evento siempre apunta a donde arrancó el toque) — hay
  // que ir preguntando "qué hay bajo el dedo ahora" a mano en cada posición,
  // y prender el mismo estado de hover/tooltip que ya usa el mouse (así la
  // ficha se resalta y levanta exactamente igual que en desktop).
  const hitTestToque = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const el = document.elementFromPoint(clientX, clientY)
    if (!rect || !el) {
      setHover(null)
      setDepartamentoHover(null)
      return
    }
    const abajoBase = espacioSobreCursor(clientY)

    if (provinciaSeleccionada) {
      const depId = el
        .closest('[data-departamento]')
        ?.getAttribute('data-departamento')
      const depFeature = departamentosData?.features.find(
        (f) => f.properties.id === depId,
      )
      if (depFeature) {
        setHover(null)
        setDepartamentoHover({
          id: depFeature.properties.id,
          nombre: depFeature.properties.nombre,
          ...depFeature.properties,
          x: clientX - rect.left,
          y: clientY - rect.top,
          abajo: tooltipVaDebajo(abajoBase, ALTO_TOOLTIP_DEPARTAMENTO_PX),
        })
        return
      }
      setDepartamentoHover(null)
      return
    }

    const provId = el
      .closest('[data-provincia]')
      ?.getAttribute('data-provincia')
    const feature = provinciasGeo.features.find(
      (f) => f.properties.id === provId,
    )
    if (feature) {
      setHover({
        feature,
        x: clientX - rect.left,
        y: clientY - rect.top,
        abajo: tooltipVaDebajo(abajoBase, ALTO_TOOLTIP_PROVINCIA_PX),
      })
      return
    }
    setHover(null)
  }

  const onTouchStart = (e: TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    limpiarToque()
    toqueRef.current.x = touch.clientX
    toqueRef.current.y = touch.clientY
    toqueRef.current.timer = setTimeout(() => {
      toqueRef.current.activo = true
      hitTestToque(toqueRef.current.x, toqueRef.current.y)
    }, TOQUE_LARGO_MS)
  }

  const onTouchMove = (e: TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    if (!toqueRef.current.activo) {
      // Todavía esperando el umbral de "mantener presionado": si el dedo se
      // corrió de más, esto era un scroll/gesto normal, no una intención de
      // explorar — se cancela el timer y el toque sigue su curso normal
      // (p. ej. termina en un tap-click si suelta sobre la misma ficha).
      const dx = touch.clientX - toqueRef.current.x
      const dy = touch.clientY - toqueRef.current.y
      if (Math.hypot(dx, dy) > TOQUE_TOLERANCIA_PX) limpiarToque()
      return
    }
    hitTestToque(touch.clientX, touch.clientY)
  }

  const onTouchEnd = (e: TouchEvent<SVGSVGElement>) => {
    if (toqueRef.current.activo) {
      // Sin esto, soltar el dedo dispara el click sintético del navegador
      // sobre lo que haya debajo en ese momento — abriendo/seleccionando
      // una ficha solo porque el recorrido de exploración terminó ahí. El
      // gesto es de solo-lectura (como el hover de mouse): seleccionar
      // sigue siendo un tap normal y corto, sin pasar por este camino.
      e.preventDefault()
      setHover(null)
      setDepartamentoHover(null)
    }
    limpiarToque()
  }

  const gestosToque = esMobil
    ? {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onTouchCancel: onTouchEnd,
      }
    : {}

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
        // `zoomAsentado`.
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
          // Siempre sobre la low-poly (no la de detalle): es una decisión de
          // layout de la vista sin zoom y no debe cambiar solo porque el
          // bounding box de detalle sea distinto.
          necesitaEtiqueta: low.necesitaEtiqueta,
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
          atenuacion,
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

  // Solo las provincias marcadas arriba (hoy, CABA): la etiqueta es un
  // agregado sobre la ficha normal, no un reemplazo — `drawn` ya las dibuja
  // a todas por igual en los pasos 1/2.
  const etiquetas = drawn.filter((d) => d.necesitaEtiqueta)

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
          // Sin esto, mantener presionado dispara el callout/lupa nativo de
          // selección de texto de iOS/Android (compitiendo con el gesto de
          // "mantener presionado" propio, ver `gestosToque`) y un arrastre
          // largo puede leerse como pan/zoom del navegador en vez de como
          // el recorrido por el mapa.
          touchAction: esMobil ? 'none' : undefined,
          WebkitTouchCallout: esMobil ? 'none' : undefined,
          WebkitUserSelect: esMobil ? 'none' : undefined,
          userSelect: esMobil ? 'none' : undefined,
        }}
        role="img"
        aria-label="Mapa de la Argentina por provincia"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const abajo = tooltipVaDebajo(
            espacioSobreCursor(e.clientY),
            ALTO_TOOLTIP_PROVINCIA_PX,
          )
          setHover((prev) => (prev ? { ...prev, x, y, abajo } : prev))
        }}
        {...gestosToque}
      >
        {/* Grupo con zoom: envuelve fichas + etiquetas + pines para que todo
            se escale/traslade como una sola unidad al entrar a una
            provincia (Etapa 6). `vectorEffect="non-scaling-stroke"` en los
            trazos evita que se vean gigantes una vez escalados. */}
        <g style={zoomGroupStyle} onTransitionEnd={onZoomTransitionEnd}>
          {/* Paso 1: los "lados" de todas las provincias, para que ninguno
            tape la cara de arriba de una provincia vecina. */}
          {/* `key={entradaMapa}`: al cambiar, el grupo se vuelve a montar y
            las provincias repiten su animación de entrada. */}
          <g key={entradaMapa}>
            {/* Paso 0: Islas Malvinas — ficha gris fija de referencia
            territorial (`MALVINAS_COLOR`, literal y no un token de tema:
            los tokens `--color-neutral-*` invierten qué extremo es
            claro/oscuro según el tema, así que un lado fijo más oscuro que
            la cara con esos tokens se invertía en modo oscuro). Sin
            `data-provincia`, sin handlers de mouse/click y con
            `pointerEvents="none"`: no forma parte del mapa interactivo (no
            tiene espacios culturales en el dataset), a diferencia de toda
            otra ficha del mapa. */}
            <path
              d={malvinas.d}
              transform={`translate(0, ${EXTRUDE_DEPTH})`}
              fill={darken(MALVINAS_COLOR, 0.6)}
              className="provincia-lado"
              style={{ animationDelay: malvinas.retrasoEntrada }}
              pointerEvents="none"
            />
            <g
              className="provincia-cara"
              style={{ animationDelay: malvinas.retrasoEntrada }}
            >
              <path
                d={malvinas.d}
                fill={MALVINAS_COLOR}
                stroke="rgba(10, 10, 10, 0.7)"
                strokeWidth={1}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            </g>

            {drawn.map(
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
            {drawn.map(
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

            {/* Paso 3: etiqueta (línea guía + globo con nombre) para las
            provincias marcadas arriba (hoy, CABA) — la ficha ya se dibujó
            en el paso 2 a su tamaño/forma real; esto es solo una ayuda para
            encontrarla y un target más grande para clickearla, porque a
            esta escala su ficha real mide unos pocos px. */}
            {etiquetas.map(
              ({
                feature,
                color,
                atenuacion,
                isHovered,
                isSelected,
                centroid: [cx, cy],
                retrasoEntrada,
              }) => {
                // Mismo apagado que el resto de las provincias (Paso 2, más
                // arriba): sin esto, el globo con el nombre de CABA quedaba a
                // pleno brillo mientras el país entero se atenuaba alrededor
                // de la provincia zoomeada — la única mancha de color fuerte
                // en un mapa apagado.
                const relleno =
                  atenuacion < 1 ? apagarConFondo(color, atenuacion) : color
                const textoRelleno =
                  atenuacion < 1
                    ? apagarConFondo('#f5f2ea', atenuacion)
                    : '#f5f2ea'
                const stroke =
                  isHovered || isSelected
                    ? highlightStroke(color)
                    : 'rgba(10, 10, 10, 0.7)'
                const anchorX = cx + CALLOUT_DX
                const anchorY = cy + CALLOUT_DY
                const etiqueta =
                  ETIQUETA_CORTA[feature.properties.id] ??
                  feature.properties.nombre
                // Una vez zoomeada esta provincia, la etiqueta deja de tener
                // sentido: a esta escala ya se ve su ficha real con pines. Se
                // oculta del todo (la ficha del paso 2 sigue ahí, a su
                // tamaño real, dibujada por el choropleth por departamento
                // del paso 4 una vez asentado el zoom).
                const zoomeada = isSelected && zoom !== null
                if (zoomeada) return null
                const onClick = () =>
                  seleccionarProvincia(
                    provinciaSeleccionada === feature.properties.id
                      ? null
                      : feature.properties.id,
                  )
                return (
                  <g
                    key={`etiqueta-${feature.properties.id}`}
                    className="provincia-llamado"
                    style={{ animationDelay: retrasoEntrada }}
                  >
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
                    <g
                      data-provincia={feature.properties.id}
                      onMouseEnter={handleEnter(feature)}
                      onMouseLeave={handleLeave}
                      onClick={onClick}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={anchorX - CALLOUT_PILL_W / 2}
                        y={anchorY - CALLOUT_PILL_H / 2}
                        width={CALLOUT_PILL_W}
                        height={CALLOUT_PILL_H}
                        rx={CALLOUT_PILL_H / 2}
                        fill={relleno}
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
                        fontSize={19}
                        fontWeight={700}
                        // Fijo, no `var(--color-accent-ink)`: ese token
                        // contrasta contra la superficie de acento fija de
                        // la marca, pero acá el fondo del globo (`color`) es
                        // un paso de la escala secuencial de densidad — casi
                        // siempre oscuro — sin relación con el tema.
                        // `accent-ink` se vuelve casi negro en modo oscuro,
                        // ilegible sobre ese fondo oscuro. Mezclado con el
                        // fondo (`textoRelleno`) cuando el globo está
                        // apagado, igual que `relleno` arriba.
                        fill={textoRelleno}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.02em',
                        }}
                        pointerEvents="none"
                      >
                        {etiqueta}
                      </text>
                    </g>
                  </g>
                )
              },
            )}
          </g>

          {/* Paso 4: choropleth por departamento/partido de la provincia
            zoomeada — reemplaza visualmente el color plano de su ficha una
            vez que el zoom llegó a destino. */}
          {provinciaSeleccionada && zoom && (
            <DepartamentosChoropleth
              provinciaId={provinciaSeleccionada}
              path={path}
              capaActiva={capaActiva}
              scales={departamentoScales}
              visible={zoomAsentado}
              datos={departamentosData}
              hoveredId={departamentoHover?.id ?? null}
              onHover={(id, nombre, estadisticas, clientX, clientY) => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (!rect) return
                setDepartamentoHover({
                  id,
                  nombre,
                  ...estadisticas,
                  x: clientX - rect.left,
                  y: clientY - rect.top,
                  abajo: tooltipVaDebajo(
                    espacioSobreCursor(clientY),
                    ALTO_TOOLTIP_DEPARTAMENTO_PX,
                  ),
                })
              }}
              onLeave={() => setDepartamentoHover(null)}
            />
          )}
        </g>
      </svg>

      {hover && (
        <div
          className={`pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-neutral-800 bg-neutral-950/95 px-3 py-2 text-sm shadow-lg ${
            hover.abajo ? '' : '-translate-y-full'
          }`}
          style={{ left: hover.x, top: hover.y + (hover.abajo ? 20 : -10) }}
        >
          <div className="font-medium text-neutral-100">
            {hover.feature.properties.nombre}
          </div>
          <div className="font-mono text-xs text-neutral-400">
            {metricaTooltip(hover.feature.properties, capaActiva)}
          </div>
        </div>
      )}

      {departamentoHover && (
        <div
          className={`pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-neutral-800 bg-neutral-950/95 px-3 py-2 text-sm shadow-lg ${
            departamentoHover.abajo ? '' : '-translate-y-full'
          }`}
          style={{
            left: departamentoHover.x,
            top: departamentoHover.y + (departamentoHover.abajo ? 20 : -10),
          }}
        >
          <div className="font-medium text-neutral-100">
            {departamentoHover.nombre}
          </div>
          <div className="font-mono text-xs text-neutral-400">
            {metricaTooltip(departamentoHover, capaActiva)}
          </div>
        </div>
      )}
    </div>
  )
}
