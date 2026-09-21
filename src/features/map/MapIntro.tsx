import { MousePointerClick } from 'lucide-react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ContadorAnimado } from '../../components/ContadorAnimado'
import { TOTAL_ESPACIOS } from '../../data/provincias'
import { useMapStore } from '../../store/mapStore'

// Entrada escalonada: `staggerChildren` en el contenedor y cada elemento sube
// y aparece, uno tras otro. Mismo criterio que la bienvenida de mobile
// (MapIntroMobil.tsx).
const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
}
const elemento: Variants = {
  oculto: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
}
// Cada renglón del título sube desde detrás de una "máscara" (el contenedor
// con `overflow-hidden`): el texto no se desvanece, aparece como si saliera
// de abajo de una línea.
const renglon: Variants = {
  oculto: { y: '110%' },
  visible: {
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}
// La barra bajo "cultura" se dibuja de izquierda a derecha, un momento
// después de que el título ya está en su lugar.
const subrayado: Variants = {
  oculto: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.7, delay: 0.75, ease: [0.16, 1, 0.3, 1] },
  },
}

/** Texto de bienvenida a la izquierda del mapa (solo desktop ancho). App.tsx
 * le reserva al mapa el mismo ancho que a `MapInfoPanel`, del otro lado, así
 * que el mapa queda centrado entre los dos; el texto en sí es un poco más
 * ancho que esa reserva (el mapa tiene aire vacío a los costados, y este
 * bloque no captura clics). Al elegir una provincia se retira hacia la
 * izquierda y el mapa aprovecha ese espacio para el zoom. */
export function MapIntro() {
  const headerHeight = useMapStore((s) => s.headerHeight)
  const visible = useMapStore((s) => s.provinciaSeleccionada === null)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ top: headerHeight }}
          // Posición y tamaño del texto — para moverlo, tocar acá:
          //  - `pl-22`: margen izquierdo (22 × 4px = 88px).
          //  - `pb-[13vh]`: lo sube por encima del centro vertical (sacarlo
          //    para centrarlo del todo).
          //  - `w-[32rem]`: ancho de todo el bloque (margen + texto).
          className="pointer-events-none fixed bottom-0 left-0 z-20 flex w-[32rem] items-center pb-[13vh] pl-22"
        >
          <motion.div
            variants={contenedor}
            initial="oculto"
            animate="visible"
            className="flex w-104 flex-col gap-5"
          >
            <motion.p
              variants={elemento}
              className="font-mono text-base uppercase tracking-wide text-neutral-500"
            >
              Cartografía cultural
            </motion.p>

            {/* Un `<span>` con máscara por renglón (los saltos son fijos: el
                bloque tiene ancho fijo, así que el título siempre parte en
                el mismo lugar). `pb-1.5` deja lugar a los rabitos de la "y"
                y la "g" y a la barra, que quedarían cortados por la
                máscara. */}
            <h2 className="text-4xl font-semibold leading-tight text-neutral-100">
              <span className="block overflow-hidden pb-1.5">
                <motion.span variants={renglon} className="block">
                  Mirá cuánta{' '}
                  <span className="relative inline-block text-accent">
                    cultura
                    <motion.span
                      variants={subrayado}
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 h-0.75 w-full origin-left rounded-full bg-accent"
                    />
                  </span>
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-1.5">
                <motion.span variants={renglon} className="block">
                  hay en Argentina
                </motion.span>
              </span>
            </h2>

            <motion.div
              variants={elemento}
              className="flex items-baseline gap-3"
            >
              <ContadorAnimado
                valor={TOTAL_ESPACIOS}
                className="text-5xl font-semibold text-accent"
              />
              <span className="text-base text-neutral-400">
                espacios culturales
              </span>
            </motion.div>

            <motion.p
              variants={elemento}
              className="text-justify text-xl leading-relaxed text-neutral-400"
            >
              Museos, teatros, bibliotecas, cines, galerías y más, repartidos
              por las 24 provincias.
            </motion.p>

            <motion.p
              variants={elemento}
              className="flex items-center gap-2.5 text-lg text-neutral-500"
            >
              {/* Un aro que se abre y se desvanece una y otra vez detrás del
                  ícono: como un "toque" que invita a hacer clic en el mapa. */}
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <motion.span
                  aria-hidden="true"
                  animate={{ scale: [0.6, 2.4], opacity: [0.55, 0] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    repeatDelay: 0.9,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full bg-accent"
                />
                <MousePointerClick
                  className="relative h-5 w-5 text-accent"
                  aria-hidden="true"
                />
              </span>
              Tocá una provincia para meterte de lleno.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
