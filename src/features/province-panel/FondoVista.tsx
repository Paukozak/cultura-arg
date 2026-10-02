import {
  animate,
  usePresence,
  useReducedMotion,
  type AnimationPlaybackControlsWithThen,
} from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  DURACION_FONDO_VISTA,
  DURACION_SALIDA_VISTA,
  DURACION_VUELTA_VISTA,
  EASE_SALIDA,
  EASE_VIAJE,
} from '../../lib/motion'
import { useMapStore } from '../../store/mapStore'
import { bboxProvincia } from './bboxSilueta'

/** Geometría de la apertura, fijada al montar: dónde está la provincia en el
 * mapa y cuánto hay que agrandar su silueta para que desborde la pantalla. */
interface Apertura {
  /** `url(...)` con la silueta como imagen de máscara (alfa). */
  mascara: string
  left: number
  top: number
  width: number
  height: number
  /** Punto fijo del zoom: el centro de la silueta en el mapa. */
  cx: number
  cy: number
  /** Escala final de la silueta (el lado mayor llega a ~2,2 diagonales de
   * pantalla); lo que le falte para cubrir las esquinas lo termina
   * `cobertura`. */
  escalaMax: number
}

function aperturaDe(provinciaId: string): Apertura | null {
  const origen = useMapStore.getState().origenSiluetaRect
  if (origen?.id !== provinciaId) return null
  const caja = bboxProvincia(provinciaId)
  if (!caja) return null
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${caja.viewBox}" preserveAspectRatio="none"><path d="${caja.d}"/></svg>`
  const diagonal = Math.hypot(window.innerWidth, window.innerHeight)
  return {
    mascara: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    left: origen.left,
    top: origen.top,
    width: origen.width,
    height: origen.height,
    cx: origen.left + origen.width / 2,
    cy: origen.top + origen.height / 2,
    escalaMax: (2.2 * diagonal) / Math.max(origen.width, origen.height),
  }
}

const acotar = (v: number) => Math.min(1, Math.max(0, v))

/** Estilo de una capa enmascarada con progreso `p` (0 = la silueta calza con
 * la provincia del mapa, 1 = silueta gigante). El zoom es exponencial (el
 * tamaño crece a un ritmo perceptual parejo, no se "dispara" al final) y
 * alrededor del centro de la silueta. La opacidad aparece en el primer
 * tramo, para que la silueta no "salte" encima del mapa en el cuadro 0. */
function estiloCapa(a: Apertura, p: number): CSSProperties {
  const k = Math.exp(p * Math.log(a.escalaMax))
  const size = `${a.width * k}px ${a.height * k}px`
  const pos = `${a.cx - k * (a.cx - a.left)}px ${a.cy - k * (a.cy - a.top)}px`
  return {
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: pos,
    WebkitMaskPosition: pos,
    opacity: acotar(p / 0.06),
  }
}

const estiloEstatico = (a: Apertura): CSSProperties => ({
  maskImage: a.mascara,
  WebkitMaskImage: a.mascara,
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
})

/** Fondo de la vista completa: la propia silueta de la provincia se abre
 * hasta ocupar la pantalla, y la vista se ve a través de ella.
 *
 * Dos capas apiladas, ambas del fondo oscuro de la vista:
 *  - `fondo`: recortada con la silueta de la provincia.
 *  - `cobertura`: un fondo liso que aparece en el último tramo de la
 *    apertura, para cerrar las esquinas que la silueta (cóncava, a veces
 *    angosta) no llegue a cubrir. Para entonces la silueta ya es mucho más
 *    grande que la pantalla, así que se lee como parte del mismo gesto.
 *
 * ENTRADA: el progreso va de 0 a 1. SALIDA: es el espejo — de 1 a 0, la vista
 * se encoge dentro de la silueta hasta calzar con la provincia del mapa
 * mientras la silueta viajera vuelve a su lugar (ver SiluetaViajera). El
 * progreso vive en un ref y cada tramo arranca desde ahí, así que cerrar a
 * mitad de la entrada, o reabrir a mitad de la salida, no pega saltos.
 *
 * Sin un origen conocido (o con movimiento reducido), o si la provincia ya
 * no está seleccionada al cerrar (el mapa se está alejando y no hay a dónde
 * volver), no hay silueta: entra y sale con un fundido. Es un HERMANO del
 * encabezado/cuerpo (no su padre): si envolviera al contenido, su opacidad
 * se multiplicaría con la de cada hijo.
 *
 * El progreso se pinta cuadro a cuadro desde JavaScript (`animate` sobre un
 * número): `mask-size`/`mask-position` no son propiedades que Motion pueda
 * delegar al compositor. */
export function FondoVista({ provinciaId }: { provinciaId: string }) {
  const reducirMovimiento = useReducedMotion()
  const [presente, safeToRemove] = usePresence()
  const fondoRef = useRef<HTMLDivElement>(null)
  const coberturaRef = useRef<HTMLDivElement>(null)
  const animacion = useRef<AnimationPlaybackControlsWithThen | null>(null)
  const progreso = useRef(0)

  const [apertura] = useState<Apertura | null>(() =>
    reducirMovimiento ? null : aperturaDe(provinciaId),
  )

  useEffect(() => {
    const fondo = fondoRef.current
    if (!fondo) return
    animacion.current?.cancel()
    let cancelado = false
    let controles: AnimationPlaybackControlsWithThen

    // Fundido: sin apertura, o sin a dónde volver al cerrar.
    const hayRetorno =
      presente || useMapStore.getState().provinciaSeleccionada === provinciaId
    if (!apertura || !hayRetorno) {
      controles = animate(
        fondo,
        {
          opacity: [Number(getComputedStyle(fondo).opacity), presente ? 1 : 0],
        },
        {
          duration: presente ? DURACION_FONDO_VISTA : DURACION_SALIDA_VISTA,
          ease: presente ? EASE_VIAJE : EASE_SALIDA,
        },
      )
      // Si había una silueta a medias, la cobertura se va con el mismo fundido.
      if (coberturaRef.current) {
        animate(
          coberturaRef.current,
          { opacity: 0 },
          { duration: DURACION_SALIDA_VISTA },
        )
      }
    } else {
      controles = animate(progreso.current, presente ? 1 : 0, {
        duration: presente ? DURACION_FONDO_VISTA : DURACION_VUELTA_VISTA,
        ease: EASE_VIAJE,
        onUpdate: (p) => {
          progreso.current = p
          Object.assign(fondo.style, estiloCapa(apertura, p))
          if (coberturaRef.current) {
            coberturaRef.current.style.opacity = String(
              acotar((p - 0.72) / 0.28),
            )
          }
        },
      })
    }
    animacion.current = controles

    if (!presente) {
      const intentarRemover = () => {
        if (!cancelado) safeToRemove?.()
      }
      // Segundo callback: si la animación se cancela o se reemplaza (rechazo),
      // igual removemos el elemento cuando el efecto no fue cancelado.
      controles.then(intentarRemover, intentarRemover)
    }
    return () => {
      cancelado = true
    }
    // Solo reacciona a entrar/salir de la presencia; `apertura` es fija.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presente])

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10">
      <div
        ref={fondoRef}
        className="absolute inset-0 bg-neutral-950"
        style={
          apertura
            ? { ...estiloEstatico(apertura), ...estiloCapa(apertura, 0) }
            : { opacity: 0 }
        }
      />
      {apertura && (
        <div
          ref={coberturaRef}
          className="absolute inset-0 bg-neutral-950"
          style={{ opacity: 0 }}
        />
      )}
    </div>
  )
}
