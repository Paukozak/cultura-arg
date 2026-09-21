import type { Geometry } from 'geojson'

type Anillo = number[][]

/** Área mínima (grados² de lon/lat) que debe tener un HUECO de una provincia
 * para que se dibuje. Los datos de Corrientes y Entre Ríos traen lagunas e
 * islotes de río como huecos de 0,000005 a 0,0011 grados² — a escala país son
 * de una fracción de píxel, y aun con mucho zoom no aportan nada.
 *
 * Pero dibujados hacen daño: un anillo de subpíxel con trazo hace que el
 * rasterizador (Skia) dibuje un filamento vertical oscuro que baja por la
 * provincia — en Corrientes se veía como una línea partiéndola en dos, y
 * según la escala de pantalla y el estado (resaltada, en hover) aparecía o
 * no. Por eso se descartan. 0,005 deja afuera los 11 huecos que hay hoy y
 * queda muy por debajo de cualquier hueco con sentido geográfico. */
export const AREA_MINIMA_HUECO = 0.005

/** Área de un anillo (fórmula del cordón / shoelace, siempre positiva). Solo
 * sirve para comparar tamaños: está en grados², no en unidades reales. */
function areaAnillo(anillo: Anillo): number {
  let suma = 0
  for (let i = 0; i < anillo.length - 1; i++) {
    suma += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1]
  }
  return Math.abs(suma) / 2
}

// El primer anillo de un polígono es el contorno; el resto, huecos. El
// contorno no se toca nunca (una isla chica sigue siendo una isla).
function sinHuecosChicos(poligono: Anillo[]): Anillo[] {
  const [contorno, ...huecos] = poligono
  return [
    contorno,
    ...huecos.filter((hueco) => areaAnillo(hueco) >= AREA_MINIMA_HUECO),
  ]
}

/** Devuelve la geometría sin los huecos de área menor a `AREA_MINIMA_HUECO`.
 * No modifica la original; los tipos que no son (Multi)Polygon pasan tal
 * cual. */
export function sinHuecosMinusculos<G extends Geometry>(geometry: G): G {
  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: sinHuecosChicos(geometry.coordinates as Anillo[]),
    }
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: (geometry.coordinates as Anillo[][]).map(sinHuecosChicos),
    }
  }
  return geometry
}
