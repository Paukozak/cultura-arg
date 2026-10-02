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

export const PANEL_LATERAL_TRANSITION: Transition = {
  duration: 0.55,
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
 * entre el mapa y la vista completa. Misma que `ZOOM_EASING` de NationalMap,
 * así el viaje se lee como continuación del zoom y no como otra animación.
 * No se usa un resorte ni una ease-out pronunciada: en un recorrido de
 * pantalla completa un resorte tiene una cola larga (la silueta "se arrastra"
 * los últimos píxeles) y la ease-out arranca a toda velocidad y se siente
 * brusca. */
export const EASE_VIAJE: [number, number, number, number] = [0.45, 0, 0.15, 1]
export const EASE_VIAJE_CSS = 'cubic-bezier(0.45, 0, 0.15, 1)'

/** Coreografía de la vista completa (segundos). ENTRADA: el fondo se abre
 * desde la provincia mientras la silueta viaja por ENCIMA; el contenido entra
 * al final. SALIDA: sin efectos, todo se desvanece junto y rápido
 * (`DURACION_SALIDA_VISTA`) y el mapa vuelve a su estado. Todo lo que dependa
 * de estos tiempos (fondo, contenido, silueta, mapa en NationalMap) los toma
 * de acá para no desfasarse. */
export const DURACION_FONDO_VISTA = 0.8
export const DURACION_SALIDA_VISTA = 0.25
export const DELAY_ENTRADA_CONTENIDO = 0.5
export const DURACION_VIAJE_ENTRADA = 1.05

/** En ms y con la curva como string CSS: NationalMap no usa Motion (su
 * escala y opacidad son transiciones CSS en un estilo inline). */
export const MS_FONDO_VISTA = DURACION_FONDO_VISTA * 1000
export const MS_SALIDA_VISTA = DURACION_SALIDA_VISTA * 1000
export const EASE_SALIDA_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)'

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

/** Ítem de una cascada: fundido + subida corta. */
export const staggerItem: Variants = {
  oculto: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_SALIDA },
  },
}
