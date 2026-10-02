import { describe, expect, it } from 'vitest'
import { bboxProvincia } from './bboxSilueta'

describe('bboxProvincia', () => {
  it('devuelve un path y un viewBox con ancho/alto positivos para una provincia común', () => {
    const caja = bboxProvincia('14') // Córdoba
    expect(caja).not.toBeNull()
    expect(caja!.d.length).toBeGreaterThan(0)
    const [, , width, height] = caja!.viewBox.split(' ').map(Number)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    expect(caja!.aspect).toBeCloseTo(width / height)
  })

  it('encuadra la provincia entera, islas incluidas, para un multipolígono (Tierra del Fuego)', () => {
    const caja = bboxProvincia('94')
    expect(caja).not.toBeNull()
    // Con islas lejos del continente, el bbox real es bastante más ancho
    // que alto si solo se recortara la parte continental — un aspect muy
    // chico (más alto que ancho) sería señal de que se perdió alguna parte.
    expect(caja!.aspect).toBeGreaterThan(0.3)
  })

  it('encuadra Buenos Aires con sus islas sin recortarlas', () => {
    const caja = bboxProvincia('06')
    expect(caja).not.toBeNull()
    expect(caja!.d.length).toBeGreaterThan(0)
  })

  it('devuelve null para un id que no existe', () => {
    expect(bboxProvincia('no-existe')).toBeNull()
  })
})
