import { ArrowRight, MousePointerClick } from 'lucide-react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useState } from 'react'
import { ContadorAnimado } from '../../components/ContadorAnimado'
import { TOTAL_ESPACIOS } from '../../data/provincias'
import { useMapStore } from '../../store/mapStore'
import { marcarVista, yaVista } from './introVista'

// Los elementos de la pantalla entran uno tras otro (efecto escalonado):
// `staggerChildren` en el contenedor, y cada elemento sube y aparece.
const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.2 } },
}
const elemento: Variants = {
  oculto: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
}

/** Pantalla de bienvenida de mobile: ocupa todo el alto, con el mismo mensaje
 * que `MapIntro` (desktop) entrando de a poco, y un botón para pasar al mapa.
 * Se muestra una sola vez por dispositivo (ver introVista.ts). El mapa ya
 * está montado debajo, así que cuando se va no hay espera. */
export function MapIntroMobil() {
  const [visible, setVisible] = useState(() => !yaVista())
  const reiniciarEntradaMapa = useMapStore((s) => s.reiniciarEntradaMapa)

  function entrar() {
    marcarVista()
    setVisible(false)
    // El mapa ya se dibujó detrás de esta pantalla: se repite su entrada
    // para que se vea recién ahora, mientras la bienvenida se va.
    reiniciarEntradaMapa()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Bienvenida"
          exit={{ opacity: 0, y: -32 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-neutral-950 px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]"
        >
          {/* Resplandor de acento, decorativo: respira despacito detrás del
              texto para que la pantalla no quede tan estática. */}
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-accent/25 blur-3xl"
          />

          <motion.div
            variants={contenedor}
            initial="oculto"
            animate="visible"
            // Todo el bloque centrado, botón incluido — pegado al texto, no
            // anclado al borde de abajo (quedaba lejos y feo de alcanzar).
            // `pb-[6vh]` lo sube apenas por encima del centro exacto.
            className="relative flex flex-1 flex-col justify-center gap-5 pb-[6vh]"
          >
            <div className="flex flex-col gap-5">
              <motion.p
                variants={elemento}
                className="font-mono text-sm uppercase tracking-wide text-neutral-500"
              >
                Cartografía cultural
              </motion.p>
              <motion.h2
                variants={elemento}
                className="text-4xl font-semibold leading-tight text-neutral-100"
              >
                Mirá cuánta <span className="text-accent">cultura</span> hay en
                Argentina
              </motion.h2>
              <motion.div
                variants={elemento}
                className="flex items-baseline gap-3"
              >
                <ContadorAnimado
                  valor={TOTAL_ESPACIOS}
                  className="text-5xl font-semibold text-accent"
                />
                <span className="text-sm text-neutral-400">
                  espacios culturales
                </span>
              </motion.div>
              <motion.p
                variants={elemento}
                className="text-justify text-lg leading-relaxed text-neutral-400"
              >
                Museos, teatros, bibliotecas, cines, galerías y más, repartidos
                por las 24 provincias. El color te muestra dónde hay más.
              </motion.p>
              <motion.p
                variants={elemento}
                className="flex items-center gap-2.5 text-base text-neutral-500"
              >
                <MousePointerClick
                  className="h-5 w-5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                Tocá una provincia para explorarla.
              </motion.p>
            </div>

            <motion.button
              variants={elemento}
              type="button"
              onClick={entrar}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3.5 text-base font-medium text-accent-ink transition-opacity hover:opacity-90 active:opacity-80"
            >
              Ver el mapa
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
