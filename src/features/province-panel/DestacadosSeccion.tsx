import { motion, type Variants } from 'motion/react'
import type { Espacio } from '../../data/espacios'
import { ICONOS_POR_CATEGORIA, ICONO_POR_DEFECTO } from './categoriaIcons'
import { EspacioFoto } from './EspacioFoto'
import { GoogleMapsEmbed } from './GoogleMapsEmbed'

// Las tarjetas de destacados entran una tras otra (fundido + subida) al
// abrirse el panel. La animación va en un contenedor aparte de cada tarjeta,
// no en la tarjeta misma: esa ya usa `transform` para su elevación en hover
// (`hover:-translate-y-1`) y las dos se pisarían.
const listaDestacados: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
}
const itemDestacado: Variants = {
  oculto: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAbrirFicha(espacio)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAbrirFicha(espacio)
        }
      }}
      className="flex cursor-pointer flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10"
    >
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
      <GoogleMapsEmbed espacio={espacio} />
    </div>
  )
}

/** Título + lista de espacios destacados de una provincia — la sección por
 * defecto del panel de provincia (ProvincePanel.tsx), que ese mismo panel
 * reemplaza por la lista de departamentos (ver DepartamentosLista.tsx) al
 * elegir esa vista, sin abrir un panel ni un modal aparte. */
export function DestacadosSeccion({
  espacios,
  destacados,
  onAbrirFicha,
}: {
  espacios: Espacio[] | null
  destacados: Espacio[]
  onAbrirFicha: (espacio: Espacio) => void
}) {
  return (
    <>
      <h3 className="mb-3 font-mono text-xs uppercase tracking-wide text-neutral-500">
        Destacados
      </h3>
      {!espacios ? (
        <p className="text-sm text-neutral-500">Cargando espacios…</p>
      ) : destacados.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No hay espacios registrados en esta provincia.
        </p>
      ) : (
        <motion.div
          variants={listaDestacados}
          initial="oculto"
          animate="visible"
          className="flex flex-col gap-3"
        >
          {destacados.map((espacio) => (
            <motion.div key={espacio.id} variants={itemDestacado}>
              <DestacadoCard espacio={espacio} onAbrirFicha={onAbrirFicha} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  )
}
