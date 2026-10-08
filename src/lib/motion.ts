import type { Transition, Variants } from 'motion/react'

/** Ease-out pronunciada compartida por paneles y modales: acelera rápido y
 * decelera suave en la llegada, en vez del arranque brusco de un `easeOut`
 * lineal. La usan ModalShell, DestacadosSeccion y las secciones con cascada. */
export const EASE_SALIDA: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Resorte sobrio para transiciones de UI entre estados (no gestos de
 * arrastre, que tienen su propia física — ver TRANSICION_HOJA en
 * ProvincePanel.tsx). `damping` por debajo del crítico para esta
 * `stiffness` a propósito: llega firme, con apenas un asomo de rebote, nunca
 * elástico. */
export const SPRING_SOBRIO: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

/** Fundido simple (backdrop de modales, vista completa). */
export const fadeVariants: Variants = {
  oculto: { opacity: 0 },
  visible: { opacity: 1 },
}

export const FADE_TRANSITION: Transition = { duration: 0.35 }

/** Fundido + leve desplazamiento vertical: entradas de contenido "real" (no
 * un backdrop), como el cuadro de un modal o la vista completa de una
 * provincia. */
export const fadeSubeVariants: Variants = {
  oculto: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
}

export const FADE_SUBE_TRANSITION: Transition = {
  duration: 0.5,
  ease: EASE_SALIDA,
}

/** Cuadro de un modal: fundido + escala, un poco más marcado que
 * `fadeSubeVariants` porque acá sí conviene que se note la llegada. */
export const modalContenidoVariants: Variants = {
  oculto: { opacity: 0, y: 48, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1 },
}

export const MODAL_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 22,
}

/** Panel lateral de desktop: entra deslizando desde la derecha. El
 * equivalente de mobile (hoja desde abajo, con gesto de arrastre) tiene su
 * propia física en ProvincePanel.tsx — no comparte variantes porque ahí el
 * desplazamiento lo maneja un `MotionValue` propio, no `initial`/`animate`. */
export const panelLateralVariants: Variants = {
  oculto: { opacity: 0, x: '100%' },
  visible: { opacity: 1, x: 0 },
}

/** Coreografía del click en una provincia (segundos): el mapa hace zoom con
 * `EASE_ZOOM` durante `DURACION_ZOOM` y el panel entra un instante DESPUÉS
 * (`DELAY_ENTRADA_PANEL`), no a la vez — así el ojo sigue primero el
 * movimiento del mapa y el panel "llega" cuando éste ya está en camino. Zoom,
 * padding del contenedor del mapa (App.tsx) y panel comparten curva y
 * duración para que se lean como un solo movimiento, no tres con tiempos
 * distintos que se pisan. */
export const DURACION_ZOOM = 0.8
export const MS_ZOOM = DURACION_ZOOM * 1000
export const DELAY_ENTRADA_PANEL = 0.1

/** Curva del zoom a una provincia (y del padding que lo acompaña): arranque
 * gradual y una cola larga de frenado (90% del recorrido a los ~60% del
 * tiempo, el resto es una llegada suave). Reemplaza al ease-in-out simétrico
 * anterior (`0.65, 0, 0.35, 1`), que concentraba el movimiento en el medio y
 * frenaba de golpe. Una ease-out tipo expo (`EASE_SALIDA`) se descartó: arranca
 * a máxima velocidad (pico de ~6x la velocidad media) y en un zoom de varias
 * escalas se siente como un salto; esta tiene un pico de ~3x, menor que el de
 * la curva anterior incluso con el tiempo más largo. */
export const EASE_ZOOM: [number, number, number, number] = [0.45, 0.2, 0.15, 1]
export const EASE_ZOOM_CSS = 'cubic-bezier(0.45, 0.2, 0.15, 1)'

/** Entrada del panel lateral (desktop): misma duración que el zoom menos el
 * delay, así ambos terminan juntos. */
export const PANEL_LATERAL_TRANSITION: Transition = {
  duration: DURACION_ZOOM - 0.1,
  delay: DELAY_ENTRADA_PANEL,
  ease: EASE_ZOOM,
}

/** Salida del panel lateral: sin delay (cerrar tiene que responder al
 * instante) y más corta que la entrada — lo que se va no necesita la misma
 * ceremonia que lo que llega. */
export const PANEL_LATERAL_SALIDA: Transition = {
  duration: 0.5,
  ease: EASE_SALIDA,
}

/** Contenedor de una cascada de hijos: cada uno declara `staggerItem` (o su
 * propia variante) y entra `stagger` segundos después del anterior, tras un
 * `delay` inicial opcional (p. ej. para esperar a que termine de entrar el
 * panel que lo envuelve). */
export function staggerContainer(opts?: {
  stagger?: number
  delay?: number
}): Variants {
  return {
    oculto: {},
    visible: {
      transition: {
        staggerChildren: opts?.stagger ?? 0.12,
        delayChildren: opts?.delay ?? 0,
      },
    },
  }
}

/** Curva ease-in-out (arranque y llegada suaves) para el viaje de la silueta
 * entre el mapa y la vista completa. Es un viaje distinto del zoom a la
 * provincia (`EASE_ZOOM`): acá la silueta cruza la pantalla entera.
 * No se usa un resorte ni una ease-out pronunciada: en un recorrido de
 * pantalla completa un resorte tiene una cola larga (la silueta "se arrastra"
 * los últimos píxeles) y la ease-out arranca a toda velocidad y se siente
 * brusca. */
export const EASE_VIAJE: [number, number, number, number] = [0.45, 0, 0.15, 1]
export const EASE_VIAJE_CSS = 'cubic-bezier(0.45, 0, 0.15, 1)'

/** Coreografía de la vista completa (segundos). ENTRADA: la silueta de
 * la provincia crece desde su lugar en el mapa hasta desbordar la pantalla y
 * la vista se ve a través de ella, mientras la silueta viajera vuela por
 * ENCIMA; el contenido entra al final. SALIDA:
 * espejo de la entrada — el contenido se va primero
 * (`DURACION_SALIDA_CONTENIDO`), la vista se encoge dentro de la silueta hasta
 * calzar con la provincia del mapa y la silueta viajera vuelve a su lugar
 * (`DURACION_VUELTA_VISTA`).
 * Cuando no hay a dónde volver (provincia ya deseleccionada, movimiento
 * reducido) queda un fundido corto (`DURACION_SALIDA_VISTA`). Todo lo que
 * dependa de estos tiempos (fondo, contenido, silueta, mapa en NationalMap)
 * los toma de acá para no desfasarse. */
export const DURACION_FONDO_VISTA = 0.8
export const DURACION_SALIDA_VISTA = 0.25
export const DURACION_SALIDA_CONTENIDO = 0.18
export const DURACION_VUELTA_VISTA = 0.62
export const DELAY_ENTRADA_CONTENIDO = 0.5
export const DURACION_VIAJE_ENTRADA = 1.05

/** En ms y con la curva como string CSS: NationalMap no usa Motion (su
 * escala y opacidad son transiciones CSS en un estilo inline). */
export const MS_FONDO_VISTA = DURACION_FONDO_VISTA * 1000
export const MS_VUELTA_VISTA = DURACION_VUELTA_VISTA * 1000

/** El viaje de entrada de la silueta describe un ARCO en vez de una recta:
 * Y lidera (arranca rápido y aterriza con un overshoot mínimo, sin la cola
 * larga de un resorte) y X se rezaga. No hay overshoot en la escala: el rebote
 * crecería con el cociente de escalas, que puede ser de 5x o más. */
export const EASE_ARCO_REZAGO: [number, number, number, number] = [
  0.5, 0, 0.25, 1,
]
export const EASE_ATERRIZAJE_Y: [number, number, number, number] = [
  0.3, 0, 0.15, 1.05,
]

/** Vuelta de la silueta al mapa: el arco de la entrada visto al revés — acá
 * X es la que lidera e Y la que se rezaga (al invertir un recorrido, quien
 * llegaba primero sale último). Sin overshoot: aterriza sobre la provincia
 * real y se funde con ella. */
export const EASE_VUELTA_X: [number, number, number, number] = [0.4, 0, 0.2, 1]
export const EASE_VUELTA_Y: [number, number, number, number] = [0.55, 0, 0.3, 1]

/** Ítem de una cascada: fundido + subida corta. */
export const staggerItem: Variants = {
  oculto: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_SALIDA },
  },
}
