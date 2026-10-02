import { describe, expect, it } from 'vitest'
import { desplazamientoHacia } from './rectProvinciaMapa'

describe('desplazamientoHacia', () => {
  it('devuelve la identidad si origen y destino coinciden', () => {
    const r = { left: 10, top: 20, width: 100, height: 50 }
    expect(desplazamientoHacia(r, r)).toEqual({ x: 0, y: 0, scale: 1 })
  })

  it('calcula el corrimiento y la escala para ver el destino sobre el origen', () => {
    const origen = { left: 270, top: 160, width: 290, height: 480 }
    const destino = { left: 66, top: 16, width: 34, height: 56 }
    const { x, y, scale } = desplazamientoHacia(origen, destino)
    expect(x).toBe(204)
    expect(y).toBe(144)
    expect(scale).toBeCloseTo(290 / 34)
  })
})
