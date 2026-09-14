import type { Geometry } from 'geojson'

type Anillo = number[][]

function distanciaAPunto(px: number, py: number, ax: number, ay: number): number {
  return Math.hypot(px - ax, py - ay)
}

function distanciaASegmento(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const largo2 = dx * dx + dy * dy
  if (largo2 === 0) return distanciaAPunto(px, py, ax, ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / largo2
  t = Math.max(0, Math.min(1, t))
  return distanciaAPunto(px, py, ax + t * dx, ay + t * dy)
}

function distanciaAAnillo(pt: [number, number], anillo: Anillo): number {
  let min = Infinity
  for (let i = 0; i < anillo.length - 1; i++) {
    const d = distanciaASegmento(pt[0], pt[1], anillo[i][0], anillo[i][1], anillo[i + 1][0], anillo[i + 1][1])
    if (d < min) min = d
  }
  return min
}

function puntoEnAnillo(pt: [number, number], anillo: Anillo): boolean {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      dentro = !dentro
    }
  }
  return dentro
}

function puntoEnPoligono(pt: [number, number], anillos: Anillo[]): boolean {
  if (!puntoEnAnillo(pt, anillos[0])) return false
  for (let k = 1; k < anillos.length; k++) {
    if (puntoEnAnillo(pt, anillos[k])) return false
  }
  return true
}

function distanciaAPoligono(pt: [number, number], anillos: Anillo[]): number {
  let min = Infinity
  for (const anillo of anillos) {
    const d = distanciaAAnillo(pt, anillo)
    if (d < min) min = d
  }
  return min
}

/** Distancia aproximada (en grados de lon/lat) de un punto al polígono/
 * multipolígono más cercano de la geometría. 0 si el punto está adentro. */
export function distanciaAGeometria(lon: number, lat: number, geometry: Geometry): number {
  const pt: [number, number] = [lon, lat]
  if (geometry.type === 'Polygon') {
    if (puntoEnPoligono(pt, geometry.coordinates as Anillo[])) return 0
    return distanciaAPoligono(pt, geometry.coordinates as Anillo[])
  }
  if (geometry.type === 'MultiPolygon') {
    let min = Infinity
    for (const poligono of geometry.coordinates as Anillo[][]) {
      if (puntoEnPoligono(pt, poligono)) return 0
      const d = distanciaAPoligono(pt, poligono)
      if (d < min) min = d
    }
    return min
  }
  return Infinity
}
