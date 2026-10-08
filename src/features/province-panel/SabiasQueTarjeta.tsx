import { ChevronDown, Lightbulb } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { SABIAS_QUE_POR_PROVINCIA } from './sabiasQueDatos'

// En `pregunta`, lo que va entre asteriscos se resalta con el color de acento
// (ver sabiasQueDatos.ts): los tramos impares del split son los resaltados.
function conResaltados(pregunta: string) {
  return pregunta.split(/\*([^*]+)\*/).map((tramo, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-accent">
        {tramo}
      </span>
    ) : (
      tramo
    ),
  )
}

/** "Dato curioso": la pregunta "¿Sabías que…?" con su fun fact de la provincia.
 * Arranca desplegado. No renderiza nada si la provincia no tiene uno.
 *  - `panel`: tarjeta de ancho completo arriba de los destacados (mobile y
 *    pantallas angostas, donde no hay lugar a la izquierda del mapa); el
 *    encabezado la pliega/despliega.
 *  - `lateral`: a la izquierda del mapa (ver SabiasQueLateral.tsx), texto
 *    suelto sobre el mapa con un botón-burbuja que lo pliega. */
export function SabiasQueTarjeta({
  provinciaId,
  variante = 'panel',
}: {
  provinciaId: string
  variante?: 'panel' | 'lateral'
}) {
  const [abierto, setAbierto] = useState(true)
  const entrada = SABIAS_QUE_POR_PROVINCIA[provinciaId]
  if (!entrada) return null

  const lateral = variante === 'lateral'

  if (!lateral) {
    return (
      <motion.aside
        // Clic en el botón: no cuenta como "afuera" del panel de provincia
        // (ver el listener de clic afuera en ProvincePanel.tsx).
        data-mapa-ui
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-5 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 via-accent/5 to-transparent shadow-lg shadow-accent/10"
      >
        {/* Marca de agua: la bombilla enorme, apenas insinuada, a modo de sello. */}
        <Lightbulb
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rotate-12 text-accent/10"
        />
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
          aria-label="Dato curioso"
          className="relative flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-md shadow-accent/30">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex-1 font-mono text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Dato curioso
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-accent transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        <AnimatePresence initial={false}>
          {abierto && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden"
            >
              <div className="px-4 pb-4">
                <p className="hyphens-none text-lg font-bold leading-snug text-neutral-100">
                  {conResaltados(entrada.pregunta)}
                </p>
                {/* En mobile (< md) sin línea de acento: el espacio entre
                    pregunta y dato lo pone el `mt-2` del párrafo; desde md la
                    línea (con su `my-3`) vuelve y el párrafo no suma margen. */}
                <div className="my-3 hidden h-0.5 w-10 rounded-full bg-accent md:block" />
                <p className="mt-2 hyphens-none text-sm leading-relaxed text-neutral-300 md:mt-0">
                  {entrada.dato}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    )
  }
  // Plegado, el lateral deja solo la burbuja con el ícono.
  const verTexto = abierto

  return (
    <motion.aside
      // Clic en el botón: no debe contar como "afuera" del panel de provincia
      // (ver el listener de clic afuera en ProvincePanel.tsx).
      data-mapa-ui
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={
        lateral
          ? // Sombra con el color de fondo del tema (no negro): separa el texto
            // del mapa que queda detrás sin ensuciarlo en el tema claro.
            'pointer-events-auto flex max-w-full flex-col items-start gap-4 [text-shadow:0_1px_3px_color-mix(in_srgb,var(--color-neutral-950)_90%,transparent),0_2px_16px_color-mix(in_srgb,var(--color-neutral-950)_90%,transparent)]'
          : 'mb-5 flex flex-col items-start gap-3'
      }
    >
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-label="Dato curioso"
        // Siempre una burbuja con el ícono; el texto y la flecha se abren hacia
        // la derecha (ancho animado) y forman la píldora (ver `verTexto`).
        className="flex items-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_65%,black)] p-2.5 text-sm font-medium text-white shadow-md transition-opacity hover:opacity-90"
      >
        <Lightbulb className="h-5 w-5 shrink-0" aria-hidden="true" />
        <motion.span
          initial={false}
          animate={{
            width: verTexto ? 'auto' : 0,
            opacity: verTexto ? 1 : 0,
            marginLeft: verTexto ? 8 : 0,
            marginRight: verTexto ? 4 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
        >
          Dato curioso
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p
              className={
                lateral
                  ? 'hyphens-none text-2xl font-bold leading-snug text-neutral-100'
                  : 'hyphens-none text-base font-semibold leading-snug text-neutral-100'
              }
            >
              {conResaltados(entrada.pregunta)}
            </p>
            <p
              className={
                lateral
                  ? 'mt-3 hyphens-none text-base leading-relaxed text-neutral-400'
                  : 'mt-1.5 hyphens-none text-sm leading-relaxed text-neutral-400'
              }
            >
              {entrada.dato}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
