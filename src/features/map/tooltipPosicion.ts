// Altos aproximados de los tooltips del mapa (padding + líneas de texto +
// borde). No hace falta medirlos: solo deciden de qué lado del cursor caben.
export const ALTO_TOOLTIP_PROVINCIA_PX = 56
// Mismo layout de dos líneas (nombre + métrica) y mismo padding/borde que el
// de provincia — de ahí el mismo alto.
export const ALTO_TOOLTIP_DEPARTAMENTO_PX = 56

// Aire entre el cursor y el tooltip (el mismo que usa el offset de arriba) más
// un pequeño colchón para que no quede pegado al borde recortado.
const SEPARACION_PX = 10
const COLCHON_PX = 4

/** Si el tooltip debe dibujarse DEBAJO del cursor en vez de arriba.
 *
 * `main` recorta el mapa contra el borde del header (`overflow-hidden`, ver
 * App.tsx) y deja apenas unos px de margen por encima del SVG: con el cursor
 * sobre una provincia del norte (Jujuy, Salta) un tooltip que sube hasta 60px
 * queda cortado y se lee como "tapado por el header". `espacioArribaPx` es la
 * distancia, en px de pantalla, entre el cursor y ese borde. */
export function tooltipVaDebajo(
  espacioArribaPx: number,
  altoTooltipPx: number,
): boolean {
  return espacioArribaPx < altoTooltipPx + SEPARACION_PX + COLCHON_PX
}
