import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { provinciasGeo } from '../../data/provincias'
import { useMapStore } from '../../store/mapStore'
import {
  buildColorScales,
  desglosarEscala,
  pasosActivos,
  SIN_DATOS_COLOR,
  TITULO_CAPA,
  UNIDAD_CAPA,
} from './colorScales'

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

/** Escala de color con el rango de cada escalón + ranking de las 24
 * provincias — el "panorama completo". Lo comparten el modal de mobile
 * (`LegendDetail`) y el panel lateral fijo de desktop (`MapInfoPanel`), que
 * lo muestra siempre a la vista en vez de detrás de un botón. */
export function LegendContenido({ onElegir }: { onElegir?: () => void }) {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const resaltarProvincia = useMapStore((s) => s.resaltarProvincia)
  const seleccionarProvincia = useMapStore((s) => s.seleccionarProvincia)

  const scales = useMemo(() => buildColorScales(provinciasGeo.features), [])
  const scale =
    capaActiva === 'densidad' ? scales.densidadScale : scales.totalScale
  const escalones = useMemo(() => desglosarEscala(scale), [scale])

  const filas = useMemo(() => {
    return provinciasGeo.features
      .map((f) => {
        const valor =
          capaActiva === 'densidad'
            ? f.properties.densidadPor100k
            : f.properties.totalEspacios
        const color = valor === null ? SIN_DATOS_COLOR : scale(valor)
        return {
          id: f.properties.id,
          nombre: f.properties.nombre,
          valor,
          color,
        }
      })
      .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1))
  }, [capaActiva, scale])

  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-wide text-neutral-500">
          Escala ({UNIDAD_CAPA[capaActiva]})
        </h3>
        <div className="flex flex-col gap-1.5">
          {[...escalones].reverse().map((escalon) => (
            <div
              key={escalon.color}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: escalon.color }}
              />
              <span className="font-mono text-neutral-300">
                {formatNumero(escalon.min)} – {formatNumero(escalon.max)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 text-sm">
            <span
              className="h-4 w-4 shrink-0 rounded"
              style={{ backgroundColor: SIN_DATOS_COLOR }}
            />
            <span className="text-neutral-500">Sin datos de densidad</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-wide text-neutral-500">
          Las provincias
        </h3>
        <div className="flex flex-col">
          {/* Cada fila entra escalonada (fundido + deslizamiento desde la
              derecha) y, con `layout="position"`, cuando cambia la capa y el
              ranking se reordena, se desliza a su nuevo lugar en vez de
              saltar. `key={fila.nombre}` es lo que le permite a Motion seguir
              a cada provincia. El `delay` de la entrada depende del orden
              (`i`), pero el de `layout` va aparte para que reordenar no se
              sienta demorado. */}
          {filas.map((fila, i) => (
            <motion.button
              key={fila.nombre}
              type="button"
              // Cada fila es un botón: el mouse o el foco de teclado la
              // resaltan en el mapa y el clic entra a la provincia. `onElegir`
              // lo usa el modal de mobile para cerrarse al elegir.
              onMouseEnter={() => resaltarProvincia(fila.id)}
              onMouseLeave={() => resaltarProvincia(null)}
              onFocus={() => resaltarProvincia(fila.id)}
              onBlur={() => resaltarProvincia(null)}
              onClick={() => {
                seleccionarProvincia(fila.id)
                onElegir?.()
              }}
              layout="position"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.4 + i * 0.02,
                ease: [0.16, 1, 0.3, 1],
                layout: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
              }}
              className="-mx-2 flex items-center gap-3 rounded-md border-b border-neutral-900 px-2 py-1.5 text-left text-sm transition-colors last:border-b-0 hover:bg-neutral-900 focus-visible:bg-neutral-900"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full transition-colors duration-300"
                style={{ backgroundColor: fila.color }}
              />
              <span
                className="flex-1 truncate text-neutral-200"
                title={fila.nombre}
              >
                {fila.nombre}
              </span>
              <span className="font-mono text-xs text-neutral-400">
                {fila.valor === null ? 's/d' : formatNumero(fila.valor)}
              </span>
            </motion.button>
          ))}
        </div>
      </section>
    </>
  )
}

function LegendDetail({ onCerrar }: { onCerrar: () => void }) {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCerrar])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (!dialogRef.current?.contains(e.target as Node)) onCerrar()
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leyenda-detalle-titulo"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 p-5">
          <h2
            id="leyenda-detalle-titulo"
            className="text-lg font-semibold text-neutral-100"
          >
            {TITULO_CAPA[capaActiva]}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-full border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M18 6 6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <motion.div
          layoutScroll
          className="flex flex-col gap-5 overflow-y-auto p-5"
        >
          <LegendContenido onElegir={onCerrar} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export function Legend() {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const tema = useMapStore((s) => s.tema)
  const [abierto, setAbierto] = useState(false)

  const scales = useMemo(() => buildColorScales(provinciasGeo.features), [])

  const scale =
    capaActiva === 'densidad' ? scales.densidadScale : scales.totalScale
  const valores = scale.domain()
  const min = valores[0]
  const max = valores[valores.length - 1]
  const pasos = pasosActivos()

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Ver el panorama completo de la escala de color"
        // Sombra solo en modo oscuro — pensada para hacer flotar el botón
        // sobre el mapa; en modo claro se ve como un halo negro pegado a él
        // (mismo criterio que el filtro de sombra del mapa en
        // NationalMap.tsx y el toggle de capa en LayerToggle.tsx).
        className={`rounded-2xl border border-neutral-800 bg-neutral-950/90 px-2.5 py-2 text-left text-sm backdrop-blur transition-colors hover:border-neutral-700 sm:px-4 sm:py-3 ${tema === 'dark' ? 'shadow-lg shadow-black/50' : ''}`}
      >
        <div className="flex flex-col gap-1 sm:gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-500 sm:text-xs">
            {UNIDAD_CAPA[capaActiva]}
          </span>
          <div className="flex overflow-hidden rounded">
            {pasos.map((color) => (
              <span
                key={color}
                className="h-2 w-4 sm:h-2.5 sm:w-6"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex justify-between font-mono text-[10px] text-neutral-500 sm:text-xs">
            <span>{formatNumero(min)}</span>
            <span>{formatNumero(max)}</span>
          </div>
        </div>
      </button>
      <AnimatePresence>
        {abierto && <LegendDetail onCerrar={() => setAbierto(false)} />}
      </AnimatePresence>
    </>
  )
}
