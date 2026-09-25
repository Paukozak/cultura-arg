import { HelpCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../../utils/useMediaQuery'

function TutorialContent({ onCerrar }: { onCerrar: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const esMobil = useMediaQuery('(max-width: 767px)')

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
        aria-labelledby="tutorial-titulo"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 p-5">
          <h2
            id="tutorial-titulo"
            className="text-lg font-semibold text-neutral-100"
          >
            ¿Cómo se usa?
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

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 text-sm leading-relaxed text-neutral-300 text-justify">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Mirá el mapa principal
            </h3>
            <p>
              Lo primero que vas a ver es un mapa de la Argentina, pintado en
              distintos colores. En el botón que dice "Densidad" / "Total" podés
              elegir qué te muestran esos colores: "Total" es cuántos espacios
              culturales (museos, teatros, bibliotecas, etc.) tiene cada
              provincia en números totales, y "Densidad" es cuántos hay cada
              100.000 habitantes, para comparar provincias grandes con chicas de
              forma más justa.
            </p>
            <p>
              {esMobil ? (
                <>
                  Un botón flotante con esa misma escala de colores abre una
                  lista con las 24 provincias ordenadas de mayor a menor: tocar
                  una desde ahí te lleva directo a ella.
                </>
              ) : (
                <>
                  Al costado del mapa hay una lista con las 24 provincias
                  ordenadas de mayor a menor: pasar el mouse por una la resalta
                  en el mapa.
                </>
              )}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Elegí una provincia
            </h3>
            <p>
              {esMobil ? (
                <>
                  Tocá cualquier provincia del mapa (o elegí su nombre desde esa
                  lista).
                </>
              ) : (
                <>
                  Hacé clic sobre cualquier provincia del mapa (o sobre su
                  nombre en la lista del costado).
                </>
              )}{' '}
              Se hace zoom y cambia
              la vista a un mapa más chico, solo de esa provincia, pintado por
              departamento. Además, se abre un panel con el nombre de la
              provincia, cuántos espacios culturales tiene en total y su
              densidad.
            </p>
            {esMobil && (
              <p>
                En el celular este panel aparece como una "hojita" que sube
                desde abajo: podés arrastrarla hacia arriba para verla más
                grande, o hacia abajo para cerrarla.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Descubrí los espacios destacados
            </h3>
            <p>
              Dentro del panel de la provincia vas a ver, por defecto, una
              sección de "Destacados": tarjetas con foto de algunos museos,
              teatros o bibliotecas elegidos de esa provincia. Tocá el nombre o
              la foto de cualquiera para abrir su ficha completa con más
              información.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Mirá los departamentos
            </h3>
            <p>
              Arriba de los destacados hay un botón "Departamentos" que permite acceder a la lista de Departamentos. Sirve para
              ver qué zonas de la provincia concentran más espacios culturales
              que otras. Un botón para "Volver a destacados" te regresa a la
              vista anterior.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Explorá TODOS los espacios y filtrá
            </h3>
            <p>
              Al final del panel hay un botón grande que dice "Ver todos los
              espacios" (con un número). Al tocarlo se abre una lista completa.
            </p>
            <p>
              {esMobil ? (
                <>
                  Arriba de la lista tenés un buscador por nombre o localidad, y
                  un botón de "Filtros" (ícono de controles deslizantes) que, al
                  tocarlo, ocupa toda la pantalla: ahí podés ordenar la lista
                  (alfabético, por año de inauguración), elegir una o varias
                  localidades/comunas puntuales, tildar solo ciertas categorías
                  (Museos, Cines, Bibliotecas, Teatros, Galerías de Arte, etc.)
                  y filtrar por "Gestión" (si el lugar es de manejo público o
                  privado). Todos los filtros se pueden combinar entre sí, y un
                  botón "Ver (número) espacios" te vuelve a la lista con esos
                  filtros ya aplicados.
                </>
              ) : (
                <>
                  A la izquierda tenés un buscador por nombre o localidad, y un
                  botón de "Filtros" (ícono de controles deslizantes) donde
                  podés: ordenar la lista (alfabético, por año de inauguración),
                  elegir una o varias localidades/comunas puntuales, tildar solo
                  ciertas categorías (Museos, Cines, Bibliotecas, Teatros,
                  Galerías de Arte, etc.) y filtrar por "Gestión" (si el lugar
                  es de manejo público o privado). Todos los filtros se pueden
                  combinar entre sí.
                </>
              )}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Abrí la ficha de un espacio
            </h3>
            <p>
              Tocá cualquier espacio de la lista para ver su ficha: foto,
              categoría, año de inauguración, tipo de gestión, dirección,
              teléfono, mail y web (si los tiene), más un mapita de Google Maps
              embebido para ubicarlo exactamente.
            </p>
            <p>
              {esMobil ? (
                <>
                  También podés llegar directo a un lugar puntual, o a una
                  localidad o departamento, usando el buscador que está arriba
                  de todo, sirve para provincias, departamentos, localidades y
                  espacios culturales por nombre. En el celular ese buscador
                  solo aparece con el mapa del país a la vista: si ya elegiste
                  una provincia, hay que volver primero (la flecha "Volver al
                  mapa") para poder usarlo.
                </>
              ) : (
                <>
                  También podés llegar directo a un lugar puntual, o a una
                  localidad o departamento, usando el buscador que está arriba
                  de todo en el encabezado de la página, sirve para provincias,
                  departamentos, localidades y espacios culturales por nombre.
                </>
              )}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Probá el modo oscuro y "Cómo se hizo"
            </h3>
            <p>
              En la esquina superior hay dos botones más: un ícono de sol que
              cambia entre modo claro y modo oscuro (usá el que te resulte más
              cómodo a la vista), y un botón "Cómo se hizo" que abre una ventana
              explicando de dónde salen los datos (Ministerio de Cultura, INDEC,
              etc.) y cómo se armó el proyecto.
            </p>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Tutorial() {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="¿Cómo se usa?"
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-100 sm:py-1.5 sm:text-sm"
      >
        <HelpCircle className="h-4 w-4 sm:hidden" aria-hidden="true" />
        <span className="hidden sm:inline">¿Cómo se usa?</span>
      </button>
      <AnimatePresence>
        {abierto && <TutorialContent onCerrar={() => setAbierto(false)} />}
      </AnimatePresence>
    </>
  )
}
