import { geoMercator, geoPath } from 'd3-geo'
import { geometriaDetalle, provinciasGeo } from '../../data/provincias'

export interface CajaSilueta {
  /** Atributo `d` del `<path>`, ya proyectado. */
  d: string
  /** `viewBox` del `<svg>` que lo contiene, recortado al bbox real de la
   * geometría (no un cuadrado con sobra de aire alrededor). */
  viewBox: string
  /** Ancho / alto del bbox — para que quien dibuje la silueta (o calcule el
   * tamaño de su caja destino) respete la proporción real sin distorsionarla. */
  aspect: number
}

// Lado de la proyección interna, en unidades arbitrarias: como después se
// recorta al bbox real (ver `path.bounds` más abajo), esta constante no
// determina el tamaño final de nada — solo tiene que ser lo bastante grande
// para que `geoMercator` tenga margen de sobra al calcular el `d`.
const LADO_PROYECCION = 1000

/** Silueta de UNA sola provincia, recortada a su propio bbox — no reutiliza
 * la proyección ni el viewBox del mapa nacional (NationalMap.tsx) porque ahí
 * el viewBox es fijo (pensado para el país entero) y acá se necesita uno
 * ajustado a esta provincia en particular. Usa su propia proyección
 * `geoMercator` fiteada solo a esta geometría: al ser la misma familia de
 * proyección (mercator no distorsiona ángulos/formas relativas dentro de sí
 * misma, solo cambia la escala global), la silueta resultante tiene la misma
 * forma que la de esta provincia en el mapa nacional, aunque el `scale`
 * numérico sea otro.
 *
 * Usa la geometría de detalle si existe (mismo criterio que NationalMap al
 * zoomear) — más fiel a la frontera real que la low-poly del mapa a escala
 * país. `path.bounds` sobre un multipolígono (Tierra del Fuego con sus islas,
 * Buenos Aires) ya cubre TODAS sus partes, así que el bbox encuadra la
 * provincia entera sin recortar ninguna isla.
 */
export function bboxProvincia(provinciaId: string): CajaSilueta | null {
  const feature = provinciasGeo.features.find(
    (f) => f.properties.id === provinciaId,
  )
  if (!feature) return null
  // Mismo criterio que `geomDetalle` en NationalMap.tsx: si no hay geometría
  // de detalle para esta provincia, se usa el FEATURE entero (no solo
  // `.geometry`) como entrada de `geoPath`/`fitSize` — ambos aceptan
  // cualquier `GeoPermissibleObjects`, feature o geometría pelada.
  const geometria = geometriaDetalle(provinciaId) ?? feature

  const projection = geoMercator().fitSize(
    [LADO_PROYECCION, LADO_PROYECCION],
    geometria,
  )
  const path = geoPath(projection)
  const d = path(geometria)
  if (!d) return null

  const [[x0, y0], [x1, y1]] = path.bounds(geometria)
  const width = x1 - x0
  const height = y1 - y0
  if (!(width > 0) || !(height > 0)) return null

  return {
    d,
    viewBox: `${x0} ${y0} ${width} ${height}`,
    aspect: width / height,
  }
}
