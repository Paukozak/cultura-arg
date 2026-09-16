import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { Espacio } from '../../data/espacios'
import { provinciasGeo } from '../../data/provincias'
import { useEspacios } from '../../data/useEspacios'
import { useMapStore } from '../../store/mapStore'
import { ICONOS_POR_CATEGORIA, ICONO_POR_DEFECTO } from './categoriaIcons'
import { EspacioFoto } from './EspacioFoto'
import { getDestacados } from './getDestacados'
import { GoogleMapsEmbed } from './GoogleMapsEmbed'

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
  const panelRef = useRef<HTMLDivElement>(null)

  // Clic afuera del panel cierra — pero no cuenta como "afuera" un clic en
  // una provincia del mapa (ahí un clic ya tiene su propio significado:
  // elegir otra provincia o cerrar por toggle) ni, obviamente, uno dentro
  // del panel. Importante: la exclusión es por el elemento clickeado
  // (`[data-provincia]`, los path/circle interactivos), no por todo el
  // contenedor del mapa — el SVG tiene mucho espacio "vacío" alrededor de
  // la silueta del país que visualmente es fondo negro y debe cerrar el
  // panel igual que cualquier otro click afuera.
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
      onCerrar()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [vistaCompleta, onCerrar])

  const provincia = provinciasGeo.features.find((f) => f.properties.id === provinciaId)
  if (!provincia) return null
  const { nombre, totalEspacios, densidadPor100k } = provincia.properties
  const destacados = espacios ? getDestacados(provinciaId, espacios) : []

  // `top-16 bottom-0` en vez de `inset-y-0`: el panel no debe taparse por
  // encima del header (ahí vive el buscador global — con `inset-y-0` el
  // panel cubría también esa franja y, aunque visualmente no se notaba,
  // interceptaba los clics del buscador mientras un panel estaba abierto).
  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="pointer-events-auto fixed bottom-0 right-0 top-16 z-30 flex w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950/98 shadow-2xl backdrop-blur"
    >
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
