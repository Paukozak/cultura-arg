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
