import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Espacio } from '../../data/espacios'
import { provinciasGeo } from '../../data/provincias'
import { useEspacios } from '../../data/useEspacios'
import { useMapStore } from '../../store/mapStore'
import { useMediaQuery } from '../../utils/useMediaQuery'
import { useWindowHeight } from '../../utils/useWindowHeight'
import { ICONOS_POR_CATEGORIA, ICONO_POR_DEFECTO } from './categoriaIcons'
import { EspacioFoto } from './EspacioFoto'
import { getDestacados } from './getDestacados'
import { GoogleMapsEmbed } from './GoogleMapsEmbed'
import { alturaHojaPx as calcularAlturaHojaPx, altoPeekPx } from './hojaLayout'

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

function DestacadoCard({
  espacio,
  onAbrirFicha,
}: {
  espacio: Espacio
  onAbrirFicha: (espacio: Espacio) => void
}) {
  const Icono = ICONOS_POR_CATEGORIA[espacio.categoria] ?? ICONO_POR_DEFECTO
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10">
      <EspacioFoto
        espacio={espacio}
        className="h-36 w-full"
        onClick={() => onAbrirFicha(espacio)}
      />
      <div className="flex items-start gap-3">
        <Icono className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onAbrirFicha(espacio)}
            className="text-left text-sm font-medium leading-tight text-neutral-100 hover:text-accent hover:underline"
          >
            {espacio.nombre}
          </button>
          <div className="mt-0.5 font-mono text-xs text-neutral-500">
            {espacio.categoria}
            {espacio.anioInauguracion ? ` · ${espacio.anioInauguracion}` : ''}
          </div>
          {espacio.localidad && (
            <div className="text-xs text-neutral-500">{espacio.localidad}</div>
          )}
        </div>
      </div>
      {espacio.direccion && (
        <div className="text-xs text-neutral-400">📍 {espacio.direccion}</div>
      )}
      <GoogleMapsEmbed
        nombre={espacio.nombre ?? espacio.categoria}
        direccion={espacio.direccion}
        localidad={espacio.localidad}
        lat={espacio.lat}
        lon={espacio.lon}
      />
    </div>
  )
}

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
  const esMobil = useMediaQuery('(max-width: 767px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const [expandida, setExpandida] = useState(false)
  const dragControls = useDragControls()
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

  const provincia = provinciasGeo.features.find((f) => f.properties.id === provinciaId)
  if (!provincia) return null
  const { nombre, totalEspacios, densidadPor100k } = provincia.properties
  const destacados = espacios ? getDestacados(provinciaId, espacios) : []

  // Deslizar hacia arriba/abajo decide si se expande o vuelve al peek — se
  // ignora la distancia exacta arrastrada (no hay `dragConstraints` en
  // píxeles: la hoja usa unidades `vh`/`calc`, no hay un pixel fijo contra
  // el cual limitarla) y se usa el offset + la velocidad del gesto al
  // soltar como señal de dirección. Un arrastre chico/ambiguo no cambia
  // nada: `animate.y` vuelve solo al target del estado actual.
  const onDragEnd = (_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y < -40 || info.velocity.y < -300) setExpandida(true)
    else if (info.offset.y > 40 || info.velocity.y > 300) setExpandida(false)
  }

  return (
    <motion.div
      ref={panelRef}
      drag={esMobil ? 'y' : false}
      dragListener={false}
      dragControls={dragControls}
      dragElastic={0.2}
      dragMomentum={false}
      onDragEnd={onDragEnd}
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
        esMobil
          ? { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }
          : { duration: 0.28, ease: 'easeOut' }
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
      style={esMobil ? { height: alturaHojaPx } : { top: headerHeight }}
      className={
        esMobil
          ? 'pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-neutral-800 bg-neutral-950/98 shadow-2xl backdrop-blur'
          : 'pointer-events-auto fixed bottom-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950/98 shadow-2xl backdrop-blur'
      }
    >
      {esMobil && (
        // Agarradera: el único punto desde donde arranca el arrastre
        // (`dragListener={false}` + `dragControls` arriba) — así scrollear
        // la lista de destacados o tocar sus botones no se confunde con un
        // gesto de arrastrar la hoja. También responde a un toque simple
        // (`onClick`, sin arrastrar nada): no todos van a animarse a hacer
        // el gesto de deslizar, un tap directo alcanza para expandir o
        // volver a achicar.
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => setExpandida((valor) => !valor)}
          aria-label={expandida ? 'Achicar el panel' : 'Expandir el panel'}
          className="flex shrink-0 cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
        >
          <div className="h-1.5 w-10 rounded-full bg-neutral-700" />
        </button>
      )}
      <div className="flex items-start gap-3 border-b border-neutral-800 p-5">
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Volver al mapa"
          className="mt-1 shrink-0 rounded-full border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:text-neutral-100"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">{nombre}</h2>
          <dl className="mt-1 flex gap-4 font-mono text-xs text-neutral-400">
            <div>
              <dt className="uppercase tracking-wide">Espacios</dt>
              <dd className="text-neutral-200">{formatNumero(totalEspacios)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Densidad/100k</dt>
              <dd className="text-neutral-200">
                {densidadPor100k === null ? 's/d' : formatNumero(densidadPor100k)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wide text-neutral-500">
          Destacados
        </h3>
        {!espacios ? (
          <p className="text-sm text-neutral-500">Cargando espacios…</p>
        ) : destacados.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay espacios registrados en esta provincia.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {destacados.map((espacio) => (
              <DestacadoCard
                key={espacio.id}
                espacio={espacio}
                onAbrirFicha={(e) => abrirVistaCompleta(e.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 p-4">
        <button
          type="button"
          onClick={() => abrirVistaCompleta()}
          disabled={!espacios}
          className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Ver todos los espacios ({espacios ? formatNumero(totalEspacios) : '…'})
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
