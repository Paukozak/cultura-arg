import { describe, expect, it } from 'vitest'
import {
  ALTO_TOOLTIP_PIN_PX,
  ALTO_TOOLTIP_PROVINCIA_PX,
  tooltipVaDebajo,
} from './tooltipPosicion'

describe('tooltipVaDebajo', () => {
  it('con lugar de sobra arriba del cursor, el tooltip va arriba', () => {
    expect(tooltipVaDebajo(300, ALTO_TOOLTIP_PROVINCIA_PX)).toBe(false)
  })

  it('cursor pegado al borde superior (norte del país): va debajo', () => {
    // Jujuy queda a ~25px del borde recortado por el header.
    expect(tooltipVaDebajo(25, ALTO_TOOLTIP_PROVINCIA_PX)).toBe(true)
    expect(tooltipVaDebajo(0, ALTO_TOOLTIP_PROVINCIA_PX)).toBe(true)
  })

  it('un cursor por encima del borde (negativo) también va debajo', () => {
    expect(tooltipVaDebajo(-10, ALTO_TOOLTIP_PROVINCIA_PX)).toBe(true)
  })

  it('el umbral es justo lo que necesita el tooltip para entrar', () => {
    const necesario = ALTO_TOOLTIP_PROVINCIA_PX + 10 + 4
    expect(tooltipVaDebajo(necesario, ALTO_TOOLTIP_PROVINCIA_PX)).toBe(false)
    expect(tooltipVaDebajo(necesario - 1, ALTO_TOOLTIP_PROVINCIA_PX)).toBe(true)
  })

  it('el tooltip de pin, más bajo, necesita menos lugar', () => {
    const espacio = 60
    expect(tooltipVaDebajo(espacio, ALTO_TOOLTIP_PROVINCIA_PX)).toBe(true)
    expect(tooltipVaDebajo(espacio, ALTO_TOOLTIP_PIN_PX)).toBe(false)
  })
})
