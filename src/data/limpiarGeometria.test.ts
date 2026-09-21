import type { Geometry, MultiPolygon, Point, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { AREA_MINIMA_HUECO, sinHuecosMinusculos } from './limpiarGeometria'
import { geometriaDetalle, provinciasGeo } from './provincias'

// Cuadrado de lado `lado` con esquina inferior izquierda en (x, y), cerrado.
function cuadrado(x: number, y: number, lado: number): number[][] {
  return [
    [x, y],
    [x + lado, y],
    [x + lado, y + lado],
    [x, y + lado],
    [x, y],
  ]
}

const CONTORNO = cuadrado(0, 0, 10)
const HUECO_CHICO = cuadrado(2, 2, 0.01) // área 0,0001 — muy por debajo
const HUECO_GRANDE = cuadrado(5, 5, 1) // área 1 — un hueco de verdad

describe('sinHuecosMinusculos', () => {
  it('saca los huecos de subpíxel y conserva los grandes', () => {
    const poligono: Polygon = {
      type: 'Polygon',
      coordinates: [CONTORNO, HUECO_CHICO, HUECO_GRANDE],
    }
    expect(sinHuecosMinusculos(poligono).coordinates).toEqual([
      CONTORNO,
      HUECO_GRANDE,
    ])
  })

  it('nunca toca el contorno, por chico que sea (una isla chica sigue siendo una isla)', () => {
    const isla = cuadrado(0, 0, 0.01) // área menor que el umbral
    const multi: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [[CONTORNO], [isla]],
    }
    expect(sinHuecosMinusculos(multi).coordinates).toEqual([[CONTORNO], [isla]])
  })

  it('en un MultiPolygon limpia cada polígono por separado', () => {
    const multi: MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [CONTORNO, HUECO_CHICO],
        [cuadrado(20, 20, 10), HUECO_GRANDE],
      ],
    }
    expect(sinHuecosMinusculos(multi).coordinates).toEqual([
      [CONTORNO],
      [cuadrado(20, 20, 10), HUECO_GRANDE],
    ])
  })

  it('el umbral es el área mínima: apenas por encima se conserva, apenas por debajo se saca', () => {
    const arriba = cuadrado(2, 2, Math.sqrt(AREA_MINIMA_HUECO * 1.05))
    const abajo = cuadrado(2, 2, Math.sqrt(AREA_MINIMA_HUECO * 0.95))
    const conArriba: Polygon = {
      type: 'Polygon',
      coordinates: [CONTORNO, arriba],
    }
    const conAbajo: Polygon = {
      type: 'Polygon',
      coordinates: [CONTORNO, abajo],
    }
    expect(sinHuecosMinusculos(conArriba).coordinates).toHaveLength(2)
    expect(sinHuecosMinusculos(conAbajo).coordinates).toHaveLength(1)
  })

  it('no modifica la geometría original', () => {
    const poligono: Polygon = {
      type: 'Polygon',
      coordinates: [CONTORNO, HUECO_CHICO],
    }
    sinHuecosMinusculos(poligono)
    expect(poligono.coordinates).toHaveLength(2)
  })

  it('las geometrías que no son (Multi)Polygon pasan tal cual', () => {
    const punto: Point = { type: 'Point', coordinates: [1, 2] }
    expect(sinHuecosMinusculos(punto)).toBe(punto)
  })
})

describe('geometría de las provincias', () => {
  // Es el problema real que motivó la limpieza: Corrientes traía 5 huecos de
  // fracción de píxel que Skia dibujaba como un filamento vertical.
  it('ninguna provincia (mapa nacional ni detalle) tiene huecos de subpíxel', () => {
    function huecosChicos(geometry: Geometry): number {
      if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
        return 0
      }
      const poligonos = (
        geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [geometry.coordinates]
      ) as number[][][][]
      let chicos = 0
      for (const poligono of poligonos) {
        for (const hueco of poligono.slice(1)) {
          let suma = 0
          for (let i = 0; i < hueco.length - 1; i++) {
            suma +=
              hueco[i][0] * hueco[i + 1][1] - hueco[i + 1][0] * hueco[i][1]
          }
          if (Math.abs(suma) / 2 < AREA_MINIMA_HUECO) chicos++
        }
      }
      return chicos
    }

    for (const feature of provinciasGeo.features) {
      expect(huecosChicos(feature.geometry), `resumen ${feature.properties.id}`).toBe(0)
      const detalle = geometriaDetalle(feature.properties.id)
      if (detalle) {
        expect(huecosChicos(detalle), `detalle ${feature.properties.id}`).toBe(0)
      }
    }
  })
})
