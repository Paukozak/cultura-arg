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
export function alturaHojaPx(alturaVentana: number, headerHeight: number): number {
  return alturaVentana - headerHeight - 16
}

/** Cuánto asoma la hoja en reposo (sin expandir), en píxeles reales — el
 * mismo valor que App.tsx debe reservarle al mapa como espacio libre. */
export function altoPeekPx(alturaVentana: number, headerHeight: number): number {
  return alturaHojaPx(alturaVentana, headerHeight) * PEEK_FRACCION
}
