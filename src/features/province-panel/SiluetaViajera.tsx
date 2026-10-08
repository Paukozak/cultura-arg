import {
  animate,
  motion,
  usePresence,
  useReducedMotion,
  type AnimationPlaybackControls,
} from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DELAY_ENTRADA_CONTENIDO,
  DURACION_SALIDA_VISTA,
  DURACION_VIAJE_ENTRADA,
  DURACION_VUELTA_VISTA,
  EASE_ARCO_REZAGO,
  EASE_ATERRIZAJE_Y,
  EASE_SALIDA,
  EASE_VIAJE,
  EASE_VUELTA_X,
  EASE_VUELTA_Y,
} from '../../lib/motion'
import { useMapStore } from '../../store/mapStore'
import { useMediaQuery } from '../../utils/useMediaQuery'
import { bboxProvincia } from './bboxSilueta'
import {
  desplazamientoHacia,
  type Desplazamiento,
  type Rect,
} from './rectProvinciaMapa'
import { SiluetaProvincia } from './SiluetaProvincia'

const ALTO_DESKTOP_PX = 56
const ALTO_MOBIL_PX = 40

// Por encima de la vista completa (z-40) y de su contenido, para que la
// silueta se vea volar sobre todo, pero por debajo de los modales (z-50).
const Z_SILUETA = 45

const ASENTADA: Desplazamiento = { x: 0, y: 0, scale: 1 }

// El viaje se reparte en tres capas anidadas (botón = X, `capaY` = Y,
// `capaEscala` = escala con origen arriba a la izquierda) para que cada eje
// tenga su propia curva y el recorrido sea un arco, no una recta. Como
// translateX · translateY · scale == translate(x, y) scale(s), la posición
// de partida y la asentada son idénticas a las de un único transform.
const tX = (v: number) => `translateX(${v}px)`
const tY = (v: number) => `translateY(${v}px)`
const esc = (v: number) => `scale(${v})`

/** Transición "shared element" entre el mapa nacional y la vista completa: la
 * silueta de la provincia "viaja" desde el lugar donde estaba su ficha en el
 * mapa (medido por NationalMap, ver `origenSiluetaRect` en mapStore) hasta el
 * badge junto al título. Al cerrar hace el viaje inverso, de vuelta a la
 * provincia en el mapa (ver el efecto de salida más abajo).
 *
 * A propósito NO se usa `layoutId` con el `<path>` del mapa: el mapa vive en
 * el viewBox fijo de un `<svg>` pensado para el país entero y este badge en
 * coordenadas normales del DOM — animar un layout entre dos sistemas de
 * coordenadas tan distintos deforma la silueta a mitad de camino.
 *
 * Tampoco vive dentro del árbol de la vista completa: lo que viaja es un
 * elemento `position: fixed` en un portal sobre `document.body`. Si fuera un
 * hijo del header/overlay, heredaría su opacidad (se vería tenue mientras el
 * fondo aparece) y su opacidad quedaría atada a la de él en la salida.
 * En el header solo queda un hueco invisible
 * (`placeholderRef`) que reserva el layout y da el rect de destino.
 *
 * El viaje es un `transform` (translate + scale, origen arriba a la izquierda)
 * sobre un elemento ya dibujado en su rect final: entrada = de (origen) a la
 * posición asentada. Va en arco: X, Y y la
 * escala se animan en capas separadas, cada una con su curva (ver
 * `EASE_ARCO_REZAGO`/`EASE_ATERRIZAJE_Y` en lib/motion.ts).
 *
 * Todo se anima con `animate(elemento, { transform | opacity })`, que Motion
 * delega en la Web Animations API: `transform` y `opacity` corren en el
 * compositor, fuera del hilo principal. Es a propósito: con valores animados
 * desde JavaScript cada cuadro dependía del hilo principal, y el layout/
 * pintado de la vista completa (una lista, un iframe de Google Maps, el mapa
 * entero detrás) lo frenaba justo al arrancar — se sentía como un tirón.
 *
 * Es además un `<button>`: cierra la vista completa SIN deseleccionar la
 * provincia, para volver al mapa de departamentos zoomeado.
 */
export function SiluetaViajera({
  provinciaId,
  nombreProvincia,
  onVolver,
}: {
  provinciaId: string
  nombreProvincia: string
  onVolver: () => void
}) {
  const esMobil = useMediaQuery('(max-width: 767px)')
  const reducirMovimiento = useReducedMotion()
  const altoPx = esMobil ? ALTO_MOBIL_PX : ALTO_DESKTOP_PX
  const aspect = useMemo(
    () => bboxProvincia(provinciaId)?.aspect ?? 1,
    [provinciaId],
  )
  const tamaño = useMemo(
    () => ({ height: altoPx, width: altoPx * aspect }),
    [altoPx, aspect],
  )

  const origen = useMapStore((s) => s.origenSiluetaRect)
  const [presente, safeToRemove] = usePresence()

  const placeholderRef = useRef<HTMLDivElement>(null)
  // Rect del hueco del header, en coordenadas de viewport. `null` hasta que
  // se mide (primer layout), y se mantiene al día ante resize para que la
  // silueta, una vez asentada, siga pegada al header.
  const [destino, setDestino] = useState<Rect | null>(null)

  const botonRef = useRef<HTMLButtonElement>(null)
  const capaYRef = useRef<HTMLDivElement>(null)
  const capaEscalaRef = useRef<HTMLDivElement>(null)
  const entrada = useRef<AnimationPlaybackControls[]>([])
  const arranco = useRef(false)
  // Desplazamiento de partida, fijado UNA vez al medir el destino (el mismo
  // valor en cada render posterior), así React nunca vuelve a tocar
  // `transform`/`opacity` y no pisa lo que dejaron las animaciones.
  const [inicial, setInicial] = useState<Desplazamiento | null>(null)

  useLayoutEffect(() => {
    const el = placeholderRef.current
    if (!el) return
    const medir = () => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const rect = {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      }
      // Con la hoja expandida en mobile el origen está tapado: no viaja, solo
      // aparece en su lugar (mismo criterio que FondoVista).
      const viaja =
        !reducirMovimiento &&
        origen?.id === provinciaId &&
        !useMapStore.getState().hojaTapaOrigen
      setInicial(
        (previo) =>
          previo ?? (viaja ? desplazamientoHacia(origen, rect) : ASENTADA),
      )
      setDestino(rect)
    }
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(el)
    window.addEventListener('resize', medir)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', medir)
    }
    // Se monta una vez por provincia (ver `key` en ProvinceFullView.tsx): el
    // origen y `reducirMovimiento` que cuentan son los de ese momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Entrada: una sola vez, apenas el botón ya está en el DOM en su posición
  // de partida (invisible).
  useEffect(() => {
    const el = botonRef.current
    const capaY = capaYRef.current
    const capaEscala = capaEscalaRef.current
    if (!destino || !el || !capaY || !capaEscala) return
    if (arranco.current || inicial === null) return
    arranco.current = true
    const viaja = inicial !== ASENTADA
    const duration = DURACION_VIAJE_ENTRADA
    // Opacidad corta: la silueta (color plano) se funde sobre la ficha del
    // mapa (coroplético) en el primer tramo del viaje, en vez de aparecer de
    // golpe encima.
    entrada.current = [
      // Sin viaje (origen tapado por la hoja) no hay provincia de la que
      // salir: la silueta entra junto con el resto del contenido, no antes,
      // para que no se vea chiquita sola sobre el fondo que recién aparece.
      animate(
        el,
        { opacity: [0, 1] },
        {
          duration: viaja ? 0.3 : 0.35,
          delay: viaja ? 0 : DELAY_ENTRADA_CONTENIDO + 0.1,
          ease: EASE_SALIDA,
        },
      ),
      ...(viaja
        ? [
            // X rezagada, Y líder (con un asomo de overshoot al aterrizar):
            // juntas dibujan un arco.
            animate(
              el,
              { transform: [tX(inicial.x), tX(0)] },
              { duration, ease: EASE_ARCO_REZAGO },
            ),
            animate(
              capaY,
              { transform: [tY(inicial.y), tY(0)] },
              { duration, ease: EASE_ATERRIZAJE_Y },
            ),
            animate(
              capaEscala,
              { transform: [esc(inicial.scale), esc(1)] },
              { duration, ease: EASE_VIAJE },
            ),
          ]
        : []),
    ]
  }, [destino, inicial])

  // Salida: AnimatePresence mantiene montada la vista completa hasta que
  // esto llame a `safeToRemove`. Se anima a mano (en vez de `exit=`) porque
  // la silueta no cuelga del overlay (vive en un portal): sin esto se
  // quedaría en pantalla.
  //
  // Es el espejo de la entrada: la silueta vuelve volando (en el arco
  // inverso) hasta la provincia en el mapa y, ya encima de ella, se funde.
  // Mientras tanto el fondo se contrae hacia ese mismo punto (ver
  // FondoVista). Si no hay a dónde volver (movimiento reducido o provincia ya
  // deseleccionada: el mapa se está alejando) solo se desvanece, donde esté.
  // Si la entrada seguía en vuelo, arranca desde la posición actual.
  //
  // Reabrir a mitad de la salida (p. ej. "adelante" del navegador) vuelve a
  // este efecto con `presente` en true: la silueta regresa a su lugar.
  const saliendo = useRef(false)
  useEffect(() => {
    const el = botonRef.current
    const capaY = capaYRef.current
    const capaEscala = capaEscalaRef.current
    if (presente && !saliendo.current) return
    if (!el || !capaY || !capaEscala) {
      if (!presente) safeToRemove?.()
      return
    }

    // Congela la silueta donde esté ahora. Los valores van a estilo inline
    // porque al cancelar una animación el elemento vuelve al estilo que le
    // puso React (la posición de partida).
    const estiloBoton = getComputedStyle(el)
    const x = new DOMMatrix(estiloBoton.transform).m41
    const opacidad = Number(estiloBoton.opacity)
    const y = new DOMMatrix(getComputedStyle(capaY).transform).m42
    const escala = new DOMMatrix(getComputedStyle(capaEscala).transform).a
    entrada.current.forEach((c) => c.cancel())
    el.style.transform = tX(x)
    el.style.opacity = String(opacidad)
    capaY.style.transform = tY(y)
    capaEscala.style.transform = esc(escala)

    let cancelado = false
    if (presente) {
      saliendo.current = false
      entrada.current = [
        animate(el, { opacity: [opacidad, 1] }, { duration: 0.3 }),
        animate(
          el,
          { transform: [tX(x), tX(0)] },
          { duration: 0.4, ease: EASE_SALIDA },
        ),
        animate(
          capaY,
          { transform: [tY(y), tY(0)] },
          { duration: 0.4, ease: EASE_SALIDA },
        ),
        animate(
          capaEscala,
          { transform: [esc(escala), esc(1)] },
          { duration: 0.4, ease: EASE_SALIDA },
        ),
      ]
      return
    }

    saliendo.current = true
    const estado = useMapStore.getState()
    const mapa = estado.origenSiluetaRect
    // Si la entrada no viajó (origen tapado por la hoja), la salida tampoco:
    // no hay una provincia visible donde aterrizar.
    const vuelve =
      !reducirMovimiento &&
      inicial !== ASENTADA &&
      destino !== null &&
      estado.provinciaSeleccionada === provinciaId &&
      mapa?.id === provinciaId
    if (vuelve) {
      const hacia = desplazamientoHacia(mapa, destino)
      const duration = DURACION_VUELTA_VISTA
      const fundido = 0.2
      entrada.current = [
        animate(
          el,
          { transform: [tX(x), tX(hacia.x)] },
          { duration, ease: EASE_VUELTA_X },
        ),
        animate(
          capaY,
          { transform: [tY(y), tY(hacia.y)] },
          { duration, ease: EASE_VUELTA_Y },
        ),
        animate(
          capaEscala,
          { transform: [esc(escala), esc(hacia.scale)] },
          { duration, ease: EASE_VIAJE },
        ),
        // Aterriza y recién ahí se funde con la provincia real del mapa.
        animate(
          el,
          { opacity: [opacidad, opacidad, 0] },
          {
            duration,
            times: [0, 1 - fundido / duration, 1],
            ease: EASE_SALIDA,
          },
        ),
      ]
    } else {
      entrada.current = [
        animate(
          el,
          { opacity: [opacidad, 0] },
          { duration: DURACION_SALIDA_VISTA, ease: EASE_SALIDA },
        ),
      ]
    }
    const intentarRemover = () => {
      if (!cancelado) safeToRemove?.()
    }
    // Segundo callback: si alguna animación se cancela o se reemplaza (rechazo),
    // igual removemos el elemento cuando el efecto no fue cancelado.
    Promise.all(entrada.current).then(intentarRemover, intentarRemover)
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presente])

  return (
    <>
      <div
        ref={placeholderRef}
        className="shrink-0"
        style={tamaño}
        aria-hidden="true"
      />
      {destino &&
        inicial !== null &&
        createPortal(
          <button
            ref={botonRef}
            type="button"
            onClick={onVolver}
            disabled={!presente}
            aria-label={
              nombreProvincia
                ? `Volver al mapa de ${nombreProvincia}`
                : 'Volver al mapa'
            }
            title="Ver departamentos"
            className="appearance-none rounded-md border-0 bg-transparent p-0"
            style={{
              position: 'fixed',
              left: destino.left,
              top: destino.top,
              width: destino.width,
              height: destino.height,
              zIndex: Z_SILUETA,
              transform: tX(inicial.x),
              opacity: 0,
              // La vista completa se está yendo: que un clic no la reabra ni
              // dispare otro cierre a mitad de camino.
              pointerEvents: presente ? 'auto' : 'none',
            }}
          >
            <div
              ref={capaYRef}
              className="h-full w-full"
              style={{ transform: tY(inicial.y) }}
            >
              <div
                ref={capaEscalaRef}
                className="h-full w-full"
                style={{
                  transformOrigin: 'top left',
                  transform: esc(inicial.scale),
                }}
              >
                {/* El hover/focus escala esta capa interna (no las que ya
                    llevan el transform del viaje) para no pelearse con ellas. */}
                <motion.span
                  className="block h-full w-full"
                  whileHover={{ scale: 1.06 }}
                  whileFocus={{ scale: 1.06 }}
                >
                  <SiluetaProvincia
                    provinciaId={provinciaId}
                    className="h-full w-full"
                  />
                </motion.span>
              </div>
            </div>
          </button>,
          document.body,
        )}
    </>
  )
}
