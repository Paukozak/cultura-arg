import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

// Cifras de docs/data-quality-report.md (generado 2026-09-14, ver ahí el
// desglose por categoría) — se hardcodean acá porque son un hecho puntual
// sobre el corte de datos usado, no algo que la app recalcule en runtime.
const PCT_SIN_ANIO = 58.4
const PCT_SIN_LOCALIDAD = 0.8
const FECHA_CORTE = '14 de septiembre de 2026'

function Fuente({
  nombre,
  descripcion,
  href,
}: {
  nombre: string
  descripcion: string
  href: string
}) {
  return (
    <li className="flex flex-col gap-0.5">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-accent hover:underline"
      >
        {nombre}
      </a>
      <span className="text-sm text-neutral-400">{descripcion}</span>
    </li>
  )
}

function Metrica({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
      <span className="font-mono text-2xl text-neutral-100">{valor}</span>
      <span className="text-xs text-neutral-500">{etiqueta}</span>
    </div>
  )
}

function ComoSeHizoContent({ onCerrar }: { onCerrar: () => void }) {
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
        aria-labelledby="como-se-hizo-titulo"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 p-5">
          <h2 id="como-se-hizo-titulo" className="text-lg font-semibold text-neutral-100">
            ¿Cómo se hizo?
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-full border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 text-sm leading-relaxed text-neutral-300">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">Fuentes de datos</h3>
            <ul className="flex flex-col gap-3">
              <Fuente
                nombre="SInCA · Espacios Culturales de la Argentina"
                descripcion="Ministerio de Cultura de la Nación. Museos, bibliotecas, salas de teatro, centros culturales, cines, galerías, librerías, monumentos, sitios Patrimonio UNESCO y Casas del Bicentenario."
                href="https://datos.cultura.gob.ar/"
              />
              <Fuente
                nombre="API Georef Argentina"
                descripcion="Geometría de provincias, usada para el mapa y para descartar pines con coordenadas fuera de su provincia."
                href="https://datos.gob.ar/dataset/modernizacion-mapa-servicios-georef"
              />
              <Fuente
                nombre="INDEC · Censo Nacional 2022"
                descripcion="Población por provincia, resultados definitivos, usada para calcular la densidad de espacios cada 100 mil habitantes."
                href="https://censo.gob.ar/"
              />
            </ul>
            <p className="text-xs text-neutral-500">
              Corte de los datos de SInCA: {FECHA_CORTE}. La app no se actualiza sola con datos
              nuevos del dataset.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Completitud de los datos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Metrica valor={`${PCT_SIN_ANIO}%`} etiqueta="de los espacios no tiene año de inauguración documentado" />
              <Metrica
                valor={`${PCT_SIN_LOCALIDAD}%`}
                etiqueta="de los espacios no tiene localidad documentada"
              />
            </div>
            <p className="text-xs text-neutral-500">
              El año varía mucho por categoría: cuatro categorías (bibliotecas especializadas,
              cines, galerías de arte y librerías) directamente no traen ese campo en la fuente.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Destacados de cada provincia
            </h3>
            <p>
              Se eligen a mano, provincia por provincia: es una curaduría editorial, no un
              criterio automático. No reflejan un ranking de importancia, sino una selección que
              intenta mostrar variedad de categorías y de partes del territorio.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Asistencia de inteligencia artificial
            </h3>
            <p>
              El desarrollo (el pipeline de procesamiento de datos y la interfaz) se hizo con
              asistencia de Claude Code, bajo dirección y revisión humana en cada etapa. La
              curaduría de destacados y las decisiones de qué mostrar y cómo son editoriales, no
              generadas automáticamente.
            </p>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ComoSeHizo() {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="shrink-0 rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-100"
      >
        ¿Cómo se hizo?
      </button>
      <AnimatePresence>
        {abierto && <ComoSeHizoContent onCerrar={() => setAbierto(false)} />}
      </AnimatePresence>
    </>
  )
}
