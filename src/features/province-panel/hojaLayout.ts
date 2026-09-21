// Geometría de la hoja inferior (mobile), compartida entre ProvincePanel.tsx
// (que la anima) y App.tsx (que le reserva el lugar debajo del mapa): antes
// vivían como dos cálculos separados que asumían el mismo resultado sin
// estar atados — App.tsx reservaba un 48% fijo del alto de la ventana
// (`48vh`) mientras que la hoja en realidad asoma un 48% de (ventana menos
// header), un número más chico. La diferencia quedaba como un hueco muerto
// entre el mapa y la hoja. Un único cálculo evita que se vuelvan a desviar.

/** Fracción de la altura disponible que la hoja asoma en reposo. */
export const PEEK_FRACCION = 0.48

/** Alto total de la hoja (expandida), en píxeles reales. */
export function alturaHojaPx(
  alturaVentana: number,
  headerHeight: number,
): number {
  return alturaVentana - headerHeight - 16
}

/** Cuánto asoma la hoja en reposo (sin expandir), en píxeles reales — el
 * mismo valor que App.tsx debe reservarle al mapa como espacio libre. */
export function altoPeekPx(
  alturaVentana: number,
  headerHeight: number,
): number {
  return alturaHojaPx(alturaVentana, headerHeight) * PEEK_FRACCION
}

// --- Gesto de arrastre de la hoja ---------------------------------------------

/** Cuánto hay que arrastrar la hoja (px) para que cuente como expandir o
 * colapsar, y cuánto por debajo del peek para que cuente como cerrar. */
export const UMBRAL_ARRASTRE_PX = 40

/** Velocidad (px/s) a partir de la cual un tirón cuenta como intención de
 * expandir/colapsar (o de cerrar, si sale del peek), aunque el recorrido sea
 * corto. */
export const VELOCIDAD_ARRASTRE = 300

/** Dónde termina la hoja tras soltar un arrastre. */
export type DestinoHoja = 'cerrada' | 'expandida' | 'peek'

/**
 * Decide el destino de la hoja al soltar un arrastre. Se ignora la distancia
 * exacta y se usa el recorrido + la velocidad al soltar como señal de
 * dirección; un arrastre chico o ambiguo deja la hoja en el estado en que
 * estaba.
 *
 * Tirar hacia abajo cierra (como una hoja nativa) si se soltó más de
 * `UMBRAL_ARRASTRE_PX` por debajo de la posición de peek, o si se la tiró
 * rápido estando ya en peek. Desde expandida un tirón rápido solo baja al
 * peek: cerrar es un segundo gesto.
 *
 * @param expandida       Estado antes del arrastre.
 * @param posicionY       `translateY` de la hoja al soltar (0 = expandida).
 * @param offsetPeekPx    `translateY` de la hoja en peek.
 * @param recorridoY      Cuánto se arrastró (px; negativo = hacia arriba).
 * @param velocidadY      Velocidad al soltar (px/s; negativa = hacia arriba).
 */
export function destinoTrasArrastre({
  expandida,
  posicionY,
  offsetPeekPx,
  recorridoY,
  velocidadY,
}: {
  expandida: boolean
  posicionY: number
  offsetPeekPx: number
  recorridoY: number
  velocidadY: number
}): DestinoHoja {
  const pasadoDelPeek = posicionY - offsetPeekPx
  if (
    pasadoDelPeek > UMBRAL_ARRASTRE_PX ||
    (!expandida && velocidadY > VELOCIDAD_ARRASTRE)
  ) {
    return 'cerrada'
  }
  if (recorridoY < -UMBRAL_ARRASTRE_PX || velocidadY < -VELOCIDAD_ARRASTRE) {
    return 'expandida'
  }
  if (recorridoY > UMBRAL_ARRASTRE_PX || velocidadY > VELOCIDAD_ARRASTRE) {
    return 'peek'
  }
  return expandida ? 'expandida' : 'peek'
}
