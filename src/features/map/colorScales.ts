import { scaleQuantile } from 'd3-scale'
import type { ProvinciaProperties } from '../../data/provincias'
import type { Capa } from '../../store/mapStore'

// Escala secuencial violeta (lavanda clarito -> violeta profundo), la gama
// principal de la app. Es una rampa a medida (no la rampa secuencial azul
// del sistema por defecto): la validez de una rampa secuencial se juega en
// la monotonicidad de luminancia, no en separación CVD entre pasos
// adyacentes (eso es un check categórico, no aplica acá). Luminancia
// relativa verificada: 0.79 → 0.51 → 0.25 → 0.12 → 0.04.
const VIOLETA_SEQUENTIAL_STEPS = [
  '#e8e3f5', // baja
  '#c9b3e8',
  '#a077d4',
  '#7645b8',
  '#4a1e82', // alta
]

// Alternativa "apto daltónicos": esquema secuencial de azules de
// ColorBrewer (5-class Blues), una de las rampas más usadas y verificadas
// para lectura de mapas con cualquier tipo de daltonismo — a diferencia de
// una rampa violeta/roja, el azul se distingue con claridad en los tres
// tipos de daltonismo más comunes (protanopia, deuteranopia, tritanopia).
// Luminancia relativa verificada: 0.90 → 0.65 → 0.38 → 0.20 → 0.08.
const DALTONICO_SEQUENTIAL_STEPS = [
  '#eff3ff', // baja
  '#bdd7e7',
  '#6baed6',
  '#3182bd',
  '#08519c', // alta
]

export const SIN_DATOS_COLOR = '#3f3f46'

export const TITULO_CAPA: Record<Capa, string> = {
  densidad: 'Densidad de espacios culturales',
  total: 'Total de espacios culturales',
}

function pasosPara(daltonico: boolean): string[] {
  return daltonico ? DALTONICO_SEQUENTIAL_STEPS : VIOLETA_SEQUENTIAL_STEPS
}

// scaleQuantile (en vez de scaleQuantize con dominio [0, max]) porque "total
// de espacios" está muy sesgado por CABA y Buenos Aires (miles de espacios)
// contra el resto de las provincias (decenas a cientos): con una escala
// lineal, casi todas las provincias caían en el primer escalón y el mapa se
// veía practicamente de un solo color. scaleQuantile arma los escalones por
// cantidad de provincias (percentiles de la propia distribución), no por
// rango absoluto, así que siempre hay variedad de color visible.
function quantileScale(valores: number[], daltonico: boolean) {
  return scaleQuantile<string>().domain(valores).range(pasosPara(daltonico))
}

export function buildColorScales(
  features: { properties: ProvinciaProperties }[],
  daltonico = false,
) {
  const densidades = features
    .map((f) => f.properties.densidadPor100k)
    .filter((v): v is number => v !== null)
  const totales = features.map((f) => f.properties.totalEspacios)

  const densidadScale = quantileScale(densidades, daltonico)
  const totalScale = quantileScale(totales, daltonico)

  return { densidadScale, totalScale }
}

function canales(hex: string): [number, number, number] {
  const num = parseInt(hex.slice(1), 16)
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff]
}

function aHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

export function darken(hex: string, cantidad: number): string {
  const [r, g, b] = canales(hex)
  const mezclar = (canal: number) => canal * (1 - cantidad)
  return aHex([mezclar(r), mezclar(g), mezclar(b)])
}

// Borde de hover/selección derivado del propio color de relleno de la
// provincia (no un color fijo para todas). Siempre oscurece (nunca
// aclara): aclarar un color medio-claro un 50-55% lo empuja visualmente a
// blanco lavado — se ve como si el borde perdiera el color en vez de
// resaltarlo. Oscurecer, en cambio, da un tinte del mismo color que se lee
// bien contra el relleno (que además se ilumina con el filtro de
// brightness en hover) sin importar cuán clara u oscura sea la base.
export function highlightStroke(hex: string): string {
  return darken(hex, 0.4)
}

/** Color "apagado" y OPACO: mezcla `color` con el fondo de la página (el
 * token `--color-neutral-950`, que cambia con el tema) en vez de bajarle la
 * opacidad al elemento. Con opacidad, la cara queda semitransparente y se
 * transparentan los lados extruidos oscuros de las provincias vecinas que hay
 * debajo — una línea fantasma sobre el borde. Mezclado, se ve igual de
 * apagado sobre el fondo pero no deja ver nada de abajo. Se aplica por CSS
 * (`style.fill`), donde `var()` y `color-mix()` funcionan; un navegador que no
 * soporte `color-mix` ignora el valor y deja el color normal. */
export function apagarConFondo(color: string, opacidad: number): string {
  return `color-mix(in srgb, var(--color-neutral-950) ${Math.round((1 - opacidad) * 100)}%, ${color})`
}

export function colorForFeature(
  props: ProvinciaProperties,
  capa: Capa,
  scales: ReturnType<typeof buildColorScales>,
): string {
  if (capa === 'densidad') {
    return props.densidadPor100k === null
      ? SIN_DATOS_COLOR
      : scales.densidadScale(props.densidadPor100k)
  }
  return scales.totalScale(props.totalEspacios)
}

/** Pasos de color de la rampa activa (violeta o apto daltónicos), en orden
 * de menor a mayor — para la leyenda y su panel de detalle. */
export function pasosActivos(daltonico: boolean): string[] {
  return pasosPara(daltonico)
}

export interface EscalonLeyenda {
  color: string
  min: number
  max: number
}

/** Desglose completo de una escala: para cada color, el rango de valores
 * real que representa (`scale.invertExtent`) — la leyenda compacta solo
 * muestra el mínimo y el máximo absolutos; esto arma la vista "panorama
 * completo" con los 5 escalones y su rango cada uno. */
export function desglosarEscala(
  scale: ReturnType<typeof quantileScale>,
): EscalonLeyenda[] {
  return scale.range().map((color) => {
    const [min, max] = scale.invertExtent(color)
    return { color, min, max }
  })
}
