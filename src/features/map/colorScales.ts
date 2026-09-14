import { scaleQuantile } from 'd3-scale'
import type { ProvinciaProperties } from '../../data/provincias'
import type { Capa } from '../../store/mapStore'

// Escala secuencial cálida (gris claro -> durazno -> naranja -> rojo intenso),
// según la identidad visual del mockup de referencia. Es una rampa de marca a
// medida (no la rampa secuencial azul del sistema por defecto): la validez de
// una rampa secuencial se juega en la monotonicidad de luminancia, no en
// separación CVD entre pasos adyacentes (eso es un check categórico, no
// aplica acá). Luminancia relativa verificada: 0.76 → 0.62 → 0.42 → 0.29 → 0.13.
const WARM_SEQUENTIAL_STEPS = [
  '#e6e2d6', // baja
  '#eec9a0',
  '#e2a05c',
  '#d97a3a',
  '#b83a2e', // alta
]

export const SIN_DATOS_COLOR = '#3f3f46'

// scaleQuantile (en vez de scaleQuantize con dominio [0, max]) porque "total
// de espacios" está muy sesgado por CABA y Buenos Aires (miles de espacios)
// contra el resto de las provincias (decenas a cientos): con una escala
// lineal, casi todas las provincias caían en el primer escalón y el mapa se
// veía practicamente de un solo color. scaleQuantile arma los escalones por
// cantidad de provincias (percentiles de la propia distribución), no por
// rango absoluto, así que siempre hay variedad de color visible.
function warmQuantileScale(valores: number[]) {
  return scaleQuantile<string>().domain(valores).range(WARM_SEQUENTIAL_STEPS)
}

export function buildColorScales(
  features: { properties: ProvinciaProperties }[],
) {
  const densidades = features
    .map((f) => f.properties.densidadPor100k)
    .filter((v): v is number => v !== null)
  const totales = features.map((f) => f.properties.totalEspacios)

  const densidadScale = warmQuantileScale(densidades)
  const totalScale = warmQuantileScale(totales)

  return { densidadScale, totalScale }
}

function canales(hex: string): [number, number, number] {
  const num = parseInt(hex.slice(1), 16)
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff]
}

function aHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

function darken(hex: string, cantidad: number): string {
  const [r, g, b] = canales(hex)
  const mezclar = (canal: number) => canal * (1 - cantidad)
  return aHex([mezclar(r), mezclar(g), mezclar(b)])
}

// Borde de hover/selección derivado del propio color de relleno de la
// provincia (no un naranja fijo para todas). Siempre oscurece (nunca
// aclara): aclarar un naranja o un rojo medio-claro un 50-55% lo empuja
// visualmente a blanco lavado — se ve como si el borde perdiera el color
// en vez de resaltarlo. Oscurecer, en cambio, da un tinte del mismo color
// que se lee bien contra el relleno (que además se ilumina con el filtro
// de brightness en hover) sin importar cuán clara u oscura sea la base.
export function highlightStroke(hex: string): string {
  return darken(hex, 0.4)
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

export { WARM_SEQUENTIAL_STEPS }
