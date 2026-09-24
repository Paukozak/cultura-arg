import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  type PanInfo,
} from 'motion/react'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ArrowLeft, List } from 'lucide-react'
import { ContadorAnimado } from '../../components/ContadorAnimado'
import { departamentosResumen } from '../../data/departamentos'
import { provinciasGeo } from '../../data/provincias'
import { useEspacios } from '../../data/useEspacios'
import { useMapStore } from '../../store/mapStore'
import { useMediaQuery } from '../../utils/useMediaQuery'
import { useWindowHeight } from '../../utils/useWindowHeight'
import { pasosActivos, UNIDAD_CAPA } from '../map/colorScales'
import { LayerToggle } from '../map/LayerToggle'
import { DepartamentosLista } from './DepartamentosLista'
import { DestacadosSeccion } from './DestacadosSeccion'
import { getDestacados } from './getDestacados'
import {
  alturaHojaPx as calcularAlturaHojaPx,
  altoPeekPx,
  destinoTrasArrastre,
} from './hojaLayout'

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

// Resorte de la hoja de mobile (entrar, expandir, colapsar y volver a su lugar
// tras un arrastre): `damping` cerca del crítico para esta `stiffness`
// (crítico ≈ 2·√stiffness), llega rápido pero sin rebotar de más.
const TRANSICION_HOJA = {
  type: 'spring',
  stiffness: 380,
  damping: 38,
  mass: 0.9,
} as const

function ProvincePanelContent({
  provinciaId,
  onCerrar,
}: {
  provinciaId: string
  onCerrar: () => void
}) {
  const espacios = useEspacios(provinciaId)
  const abrirVistaCompleta = useMapStore((s) => s.abrirVistaCompleta)
  const vistaCompleta = useMapStore((s) => s.vistaCompleta)
  const headerHeight = useMapStore((s) => s.headerHeight)
  const capaActiva = useMapStore((s) => s.capaActiva)
  const esMobil = useMediaQuery('(max-width: 767px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const [expandida, setExpandida] = useState(false)
  // Qué se ve en el contenido del panel: los destacados (default) o la
  // lista de departamentos — no un modal aparte, para no tapar el resto del
  // panel (header, escala, botón de "ver todos") con una capa por encima.
  const [seccion, setSeccion] = useState<'destacados' | 'departamentos'>(
    'destacados',
  )
  const dragControls = useDragControls()
  // Con mouse (no con el dedo), al soltar un arrastre el navegador dispara
  // además un `click` sobre lo que quedó bajo el cursor — la agarradera o la
  // barra, que se mueven junto con la hoja. Ese clic alternaba el estado justo
  // después de que el arrastre ya lo había decidido, deshaciéndolo. Se marca
  // que hubo un arrastre para ignorar ese clic (ver `alternarExpandida`).
  const huboArrastre = useRef(false)
  // `y` propio (en vez del que crea `motion.div` por su cuenta): hace falta
  // para poder devolver la hoja a su lugar a mano al soltar el arrastre (ver
  // `onDragEnd`). El prop `animate` sigue manejándolo igual para entrar,
  // expandir y colapsar.
  const y = useMotionValue(0)
  const alturaVentana = useWindowHeight()

  // Píxeles reales, no `calc()`: Framer Motion anima `y` interpolando
  // cuadro a cuadro entre el valor de `initial`/`animate` — con un plano
  // número (o un simple "N%") sabe hacerlo, pero con un string `calc(100% -
  // 48vh)` no tiene una unidad clara para interpolar y lo que se veía era
  // un salto directo al final en vez de un deslizamiento, por más resorte
  // que se le configure. Resolviendo la cuenta acá (en JS, con el alto real
  // de la ventana) el resorte anima un número de punta a punta y sí se
  // desliza suave. `alturaHojaPx`/`altoPeekPx` viven en hojaLayout.ts para
  // que App.tsx reserve exactamente el mismo espacio (ver el comentario ahí).
  const alturaHojaPx = calcularAlturaHojaPx(alturaVentana, headerHeight)
  const offsetPeekPx = alturaHojaPx - altoPeekPx(alturaVentana, headerHeight)

  // Clic afuera del panel cierra — pero no cuenta como "afuera" un clic en
  // una provincia del mapa (ahí un clic ya tiene su propio significado:
  // elegir otra provincia o cerrar por toggle) ni, obviamente, uno dentro
  // del panel. Importante: la exclusión es por el elemento clickeado
  // (`[data-provincia]`, los path/circle interactivos), no por todo el
  // contenedor del mapa — el SVG tiene mucho espacio "vacío" alrededor de
  // la silueta del país que visualmente es fondo negro y debe cerrar el
  // panel igual que cualquier otro click afuera. Tampoco cuenta un control
  // propio del mapa (`[data-mapa-ui]`, hoy el botón "← alejar" del zoom por
  // cluster): sin esta exclusión, clickearlo retrocedía un nivel de zoom Y
  // deseleccionaba la provincia a la vez, así que "alejar un nivel" se
  // sentía como "volver de golpe al mapa nacional".
  // Se desactiva mientras la vista completa está abierta: esa vista cubre
  // toda la pantalla y cualquier clic dentro de ella también caería
  // "afuera" de este panel.
  useEffect(() => {
    if (vistaCompleta) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      if (target.closest('[data-provincia]')) return
      if (target.closest('[data-mapa-ui]')) return
      onCerrar()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [vistaCompleta, onCerrar])

  const provincia = provinciasGeo.features.find(
    (f) => f.properties.id === provinciaId,
  )
  if (!provincia) return null
  const { nombre, totalEspacios, densidadPor100k } = provincia.properties
  const destacados = espacios ? getDestacados(provinciaId, espacios) : []
  // Rango de ESTA provincia (no el de los ~529 departamentos del país): la
  // escala de color del choropleth sí es global a propósito (mismo tono en
  // todo el país para el mismo valor, ver DepartamentosChoropleth.tsx), pero
  // mostrar acá ese mínimo/máximo nacional confundía — decía "865" en TODAS
  // las provincias por igual, sin relación con lo que esa provincia
  // realmente tiene.
  const departamentosProvincia = departamentosResumen.filter(
    (d) => d.provinciaId === provinciaId,
  )
  const valoresDepartamentos = departamentosProvincia
    .map((d) =>
      capaActiva === 'densidad' ? d.densidadPor100k : d.totalEspacios,
    )
    .filter((v): v is number => v !== null)
  const minDepartamentos = valoresDepartamentos.length
    ? Math.min(...valoresDepartamentos)
    : 0
  const maxDepartamentos = valoresDepartamentos.length
    ? Math.max(...valoresDepartamentos)
    : 0

  // Qué hace cada gesto (expandir, colapsar o cerrar) lo decide
  // `destinoTrasArrastre` (hojaLayout.ts), donde tiene sus tests.
  // Si no se cierra, siempre se anima `y` hasta el destino a mano, incluso si
  // el estado no cambió: `animate` solo se vuelve a disparar cuando su valor
  // cambia, así que sin esto un arrastre que termina en el mismo estado (p.
  // ej. tirar hacia arriba estando ya expandida) dejaba la hoja parada donde
  // se soltó — corrida, con un hueco negro debajo o arriba de ella.
  const onDragEnd = (
    _e: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo,
  ) => {
    // El `click` (si viene) se despacha en la misma tarea que este
    // `pointerup`: un timeout 0 baja la marca recién después de que pasó.
    setTimeout(() => {
      huboArrastre.current = false
    }, 0)
    const resultado = destinoTrasArrastre({
      expandida,
      posicionY: y.get(),
      offsetPeekPx,
      recorridoY: info.offset.y,
      velocidadY: info.velocity.y,
    })
    if (resultado === 'cerrada') {
      onCerrar()
      return
    }
    const destino = resultado === 'expandida'
    setExpandida(destino)
    animate(y, destino ? 0 : offsetPeekPx, TRANSICION_HOJA)
  }

  // La barra con el nombre de la provincia hace lo mismo que la agarradera
  // (arrastrar la hoja, o tocarla para expandir/achicar): es un blanco mucho
  // más grande y natural que la tira fina de arriba. Se excluye lo que sea un
  // botón — el de "volver" tiene su propia acción y no debe arrastrar ni
  // alternar la hoja. No hay conflicto con el scroll: la lista de destacados
  // vive en otro contenedor, fuera de esta barra. La barra lleva `select-none`:
  // sin eso, un arrastre con mouse deja el nombre seleccionado y el siguiente
  // arrastre lo toma el navegador como arrastrar-y-soltar de texto (cancela el
  // puntero y la hoja no se mueve).
  const alternarExpandida = () => {
    if (huboArrastre.current) return
    setExpandida((valor) => !valor)
  }

  const gestoBarra = esMobil
    ? {
        onPointerDown: (e: ReactPointerEvent) => {
          if ((e.target as Element).closest('button')) return
          dragControls.start(e)
        },
        onClick: (e: ReactMouseEvent) => {
          if ((e.target as Element).closest('button')) return
          alternarExpandida()
        },
      }
    : {}

  return (
    <motion.div
      ref={panelRef}
      drag={esMobil ? 'y' : false}
      dragListener={false}
      dragControls={dragControls}
      // Hacia arriba la hoja no pasa de su posición expandida (`y: 0`): más
      // arriba dejaba el fondo a la vista debajo de ella. Hacia abajo puede
      // seguir al dedo hasta salir de pantalla, para poder cerrarla. Sin
      // elástico: la hoja va pegada al dedo.
      dragConstraints={{ top: 0, bottom: alturaHojaPx }}
      dragElastic={0}
      dragMomentum={false}
      onDragStart={() => {
        huboArrastre.current = true
      }}
      onDragEnd={onDragEnd}
      style={esMobil ? { height: alturaHojaPx, y } : { top: headerHeight }}
      initial={esMobil ? { opacity: 0, y: '100%' } : { opacity: 0, x: '100%' }}
      animate={
        esMobil
          ? { opacity: 1, y: expandida ? 0 : offsetPeekPx }
          : { opacity: 1, x: 0 }
      }
      exit={esMobil ? { opacity: 0, y: '100%' } : { opacity: 0, x: '100%' }}
      // En mobile un resorte en vez de una curva de duración fija: entrar,
      // expandir y colapsar la hoja se sienten como el mismo gesto físico
      // continuo (así se mueven las hojas nativas de iOS/Android), en vez
      // de una animación mecánica de tiempo fijo. `damping` cerca del
      // crítico para esta `stiffness` (crítico ≈ 2·√stiffness): llega
      // rápido pero sin rebotar de más.
      transition={
        esMobil ? TRANSICION_HOJA : { duration: 0.28, ease: 'easeOut' }
      }
      // Desktop: panel angosto acoplado a la derecha, de la altura completa
      // por debajo del header (`top: headerHeight` en vez de `inset-y-0`:
      // no debe taparse por encima, ahí vive el buscador global — con
      // `inset-y-0` interceptaba sus clics mientras un panel estaba
      // abierto). Mobile: taparlo TODO dejaría el mapa recién zoomeado con
      // sus pines completamente inalcanzable (la Etapa 6 entera), así que
      // pasa a ser una hoja siempre de la misma altura (casi toda la
      // pantalla) pero corrida hacia abajo con `translateY` para que en
      // reposo solo asome `PEEK_VH` — deslizar hacia arriba la lleva a
      // `translateY(0)` sin que la altura real cambie (ver el comentario
      // junto a `PEEK_VH`).
      className={
        esMobil
          ? 'pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-neutral-800 bg-neutral-950/98 shadow-2xl backdrop-blur'
          : 'pointer-events-auto fixed bottom-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950/98 shadow-2xl backdrop-blur'
      }
    >
      {esMobil && (
        // Agarradera: junto con la barra del nombre (`gestoBarra`, abajo),
        // el único punto desde donde arranca el arrastre (`dragListener=
        // {false}` + `dragControls` arriba) — así scrollear la lista de
        // destacados o tocar sus botones no se confunde con un gesto de
        // arrastrar la hoja. También responde a un toque simple (`onClick`,
        // sin arrastrar nada): no todos van a animarse a hacer el gesto de
        // deslizar, un tap directo alcanza para expandir o volver a achicar.
        // Es el punto accesible por teclado (un `button` real con etiqueta);
        // la barra del nombre es solo una comodidad extra para el dedo.
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          onClick={alternarExpandida}
          aria-label={expandida ? 'Achicar el panel' : 'Expandir el panel'}
          className="flex shrink-0 cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
        >
          <div className="h-1.5 w-10 rounded-full bg-neutral-700" />
        </button>
      )}
      <div
        {...gestoBarra}
        className={`flex items-start gap-3 border-b border-neutral-800 p-5 ${esMobil ? 'cursor-grab touch-none select-none active:cursor-grabbing' : ''}`}
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Volver al mapa"
          className="mt-1 shrink-0 rounded-full border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:text-neutral-100"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-neutral-100">{nombre}</h2>
          <dl className="mt-1 flex gap-4 font-mono text-xs text-neutral-400">
            <div>
              <dt className="uppercase tracking-wide">Espacios</dt>
              <dd className="text-neutral-200">
                <ContadorAnimado valor={totalEspacios} />
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Densidad/100k</dt>
              <dd className="text-neutral-200">
                {densidadPor100k === null
                  ? 's/d'
                  : formatNumero(densidadPor100k)}
              </dd>
            </div>
          </dl>
        </div>
        {/* Atajo al mismo destino que el botón de abajo del todo — que en
            mobile, en reposo (peek), vive fuera de la porción visible de la
            hoja (ver PEEK_FRACCION en hojaLayout.ts) y solo se alcanza
            expandiendo o scrolleando. Se oculta al expandir: ahí ya entra el
            de abajo, y no tiene sentido duplicarlo. */}
        {esMobil && !expandida && (
          <button
            type="button"
            onClick={() => abrirVistaCompleta()}
            disabled={!espacios}
            aria-label={`Ver todos los espacios${espacios ? ` (${formatNumero(totalEspacios)})` : ''}`}
            className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            Todos
          </button>
        )}
      </div>

      <div className="border-b border-neutral-800 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Cambia el contenido de abajo a la lista de departamentos —
              mismo color, nombre y cantidad que se ven pintados en el mapa —
              en vez de abrir un modal por encima que tape el resto del
              panel. El icono `List` es el mismo que el botón "Todos" de más
              arriba, para que se lea como el mismo gesto (ver-como-lista).
              Sin acción si ya se está viendo esa sección. */}
          <button
            type="button"
            onClick={() => setSeccion('departamentos')}
            disabled={seccion === 'departamentos'}
            aria-label={`Ver la lista completa de departamentos de ${nombre}, con su color y cantidad`}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-300 disabled:pointer-events-none disabled:opacity-50"
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            Departamentos · {UNIDAD_CAPA[capaActiva]}
          </button>
          {/* Layer toggle propio: con la provincia abierta, `LayerToggle` de
              MapInfoPanel/mobile queda tapado o desmontado — antes no había
              forma de cambiar de capa sin cerrar el panel. `layoutId`
              distinto (ver LayerToggle.tsx) para no cruzar la animación de
              la pastilla con esa otra instancia, que sigue montada detrás.
              `compacto` + `sutil`: más chico y en gris (no el azul de marca)
              que el toggle grande de MapInfoPanel — acá es una opción
              secundaria del bloque de departamentos, no el control principal
              de capa, y con los mismos colores competía con la barra de
              gradiente de abajo en vez de acompañarla. */}
          <LayerToggle layoutId="capa-activa-fondo-provincia" compacto sutil />
        </div>
        <div className="mt-3 flex overflow-hidden rounded">
          {pasosActivos().map((color) => (
            <span
              key={color}
              className="h-2 flex-1"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-neutral-500">
          <span>{formatNumero(minDepartamentos)}</span>
          <span>{formatNumero(maxDepartamentos)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {seccion === 'destacados' ? (
          <DestacadosSeccion
            espacios={espacios}
            destacados={destacados}
            onAbrirFicha={(e) => abrirVistaCompleta(e.id)}
          />
        ) : (
          <>
            {/* Vuelve a destacados en el mismo lugar, sin cerrar ni
                navegar afuera del panel — la contraparte del botón de arriba
                que trajo hasta acá. */}
            <button
              type="button"
              onClick={() => setSeccion('destacados')}
              className="mb-3 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Volver a destacados
            </button>
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wide text-neutral-500">
              Los {departamentosProvincia.length} departamentos
            </h3>
            <DepartamentosLista provinciaId={provinciaId} />
          </>
        )}
      </div>

      <div className="border-t border-neutral-800 p-4">
        <button
          type="button"
          onClick={() => abrirVistaCompleta()}
          disabled={!espacios}
          className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Ver todos los espacios ({espacios ? formatNumero(totalEspacios) : '…'}
          )
        </button>
      </div>
    </motion.div>
  )
}

export function ProvincePanel() {
  const provinciaId = useMapStore((s) => s.provinciaSeleccionada)
  const seleccionarProvincia = useMapStore((s) => s.seleccionarProvincia)

  return (
    <AnimatePresence>
      {provinciaId && (
        <ProvincePanelContent
          key={provinciaId}
          provinciaId={provinciaId}
          onCerrar={() => seleccionarProvincia(null)}
        />
      )}
    </AnimatePresence>
  )
}
