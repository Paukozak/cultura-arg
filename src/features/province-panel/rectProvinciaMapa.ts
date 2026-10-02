/** Rectángulo en pantalla (coordenadas de viewport) del `<path>` de una
 * provincia en el mapa nacional, medido AHORA — o `null` si no está en el DOM
 * o no tiene tamaño. Lo usa SiluetaViajera para saber adónde aterrizar al
 * cerrar la vista completa: se mide recién en ese momento (no se reusa el de
 * la entrada) porque el mapa pudo cambiar de tamaño mientras tanto. */
export function rectProvinciaEnMapa(provinciaId: string): DOMRect | null {
  const el = document.querySelector<SVGPathElement>(
    `path[data-provincia="${provinciaId}"]`,
  )
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  return rect
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Desplazamiento {
  x: number
  y: number
  scale: number
}

/** `transform` (con `transform-origin: top left`) que hace que un elemento
 * dibujado en `destino` se vea exactamente sobre `origen`. Alcanza un único
 * `scale` (calculado contra el ancho) porque origen y destino son la misma
 * silueta a otra escala, con el mismo aspect ratio (ver `bboxProvincia`). */
export function desplazamientoHacia(
  origen: Rect,
  destino: Rect,
): Desplazamiento {
  return {
    x: origen.left - destino.left,
    y: origen.top - destino.top,
    scale: origen.width / destino.width,
  }
}
