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

/** Botón chico "Dato curioso" (plegado, una burbuja con el ícono) que despliega la pregunta "¿Sabías que…?" con su
 * fun fact de la provincia. Arranca desplegado. No renderiza nada si la provincia
 * no tiene uno.
 *  - `panel`: arriba de los destacados (mobile y pantallas angostas, donde no
 *    hay lugar a la izquierda del mapa).
 *  - `lateral`: a la izquierda del mapa (ver SabiasQueLateral.tsx). */
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
  // En el panel (mobile y pantallas angostas) plegado queda la píldora con el
  // texto "Dato curioso"; en el lateral, solo la burbuja con el ícono.
  const verTexto = abierto || !lateral

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
