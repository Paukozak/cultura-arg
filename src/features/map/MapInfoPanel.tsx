import { motion } from 'motion/react'
import { useMapStore } from '../../store/mapStore'
import { TITULO_CAPA } from './colorScales'
import { LayerToggle } from './LayerToggle'
import { LegendContenido } from './Legend'

/** Panel lateral de desktop con toda la información de la capa activa (escala
 * completa + ranking de provincias) siempre a la vista, en vez de la leyenda
 * compacta que abre un modal. Ocupa el mismo borde que `ProvincePanel` (fijo a
 * la derecha, bajo el header) y un `z` más abajo: al elegir una provincia,
 * ese panel se desliza POR ENCIMA y al cerrarlo este reaparece ya montado, sin
 * parpadeo ni hueco. Mientras queda tapado se lo marca `inert` para que no
 * reciba foco ni lo lean los lectores de pantalla. */
export function MapInfoPanel() {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const headerHeight = useMapStore((s) => s.headerHeight)
  const oculto = useMapStore((s) => s.provinciaSeleccionada !== null)

  return (
    <motion.aside
      // Entra deslizándose desde la derecha, un poco después de la carga, para
      // que la página se arme en orden (mapa, panel, texto) y no de golpe.
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      inert={oculto}
      aria-label="Información de la capa del mapa"
      style={{ top: headerHeight }}
      className="pointer-events-auto fixed bottom-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950/98 backdrop-blur"
    >
      <div className="flex flex-col gap-3 border-b border-neutral-800 p-5">
        <h2 className="text-lg font-semibold text-neutral-100">
          {TITULO_CAPA[capaActiva]}
        </h2>
        <div className="self-start">
          <LayerToggle />
        </div>
      </div>
      {/* `layoutScroll`: este es el contenedor que scrollea; sin la marca, el
          reordenamiento animado de las filas (ver LegendContenido) se
          desfasa por lo que ya se scrolleó. */}
      <motion.div
        layoutScroll
        className="flex flex-1 flex-col gap-5 overflow-y-auto p-5"
      >
        <LegendContenido />
      </motion.div>
    </motion.aside>
  )
}
