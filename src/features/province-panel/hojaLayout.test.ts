import { describe, expect, it } from 'vitest'
import { destinoTrasArrastre } from './hojaLayout'

// Hoja de ejemplo: en peek asoma desplazada 400 px hacia abajo; expandida
// está en 0. `posicionY` es dónde queda la hoja al soltar.
const OFFSET_PEEK = 400

function soltar(opts: {
  expandida: boolean
  recorridoY: number
  velocidadY?: number
}) {
  const inicio = opts.expandida ? 0 : OFFSET_PEEK
  return destinoTrasArrastre({
    expandida: opts.expandida,
    posicionY: Math.max(0, inicio + opts.recorridoY),
    offsetPeekPx: OFFSET_PEEK,
    recorridoY: opts.recorridoY,
    velocidadY: opts.velocidadY ?? 0,
  })
}

describe('destinoTrasArrastre', () => {
  describe('desde peek', () => {
    it('tirar hacia abajo más allá del umbral cierra', () => {
      expect(soltar({ expandida: false, recorridoY: 120 })).toBe('cerrada')
    })

    it('un tirón rápido hacia abajo cierra aunque el recorrido sea corto', () => {
      expect(
        soltar({ expandida: false, recorridoY: 20, velocidadY: 500 }),
      ).toBe('cerrada')
    })

    it('un arrastre corto y lento hacia abajo no cierra: vuelve al peek', () => {
      expect(
        soltar({ expandida: false, recorridoY: 30, velocidadY: 100 }),
      ).toBe('peek')
    })

    it('deslizar hacia arriba expande', () => {
      expect(soltar({ expandida: false, recorridoY: -250 })).toBe('expandida')
    })

    it('un tirón rápido hacia arriba expande aunque el recorrido sea corto', () => {
      expect(
        soltar({ expandida: false, recorridoY: -20, velocidadY: -500 }),
      ).toBe('expandida')
    })

    it('un arrastre corto y lento hacia arriba no cambia nada', () => {
      expect(
        soltar({ expandida: false, recorridoY: -25, velocidadY: -100 }),
      ).toBe('peek')
    })
  })

  describe('desde expandida', () => {
    it('deslizar hacia abajo baja al peek, no cierra', () => {
      expect(soltar({ expandida: true, recorridoY: 250 })).toBe('peek')
    })

    it('un tirón rápido hacia abajo solo baja al peek: cerrar es un segundo gesto', () => {
      expect(
        soltar({ expandida: true, recorridoY: 200, velocidadY: 1500 }),
      ).toBe('peek')
    })

    it('arrastrar hacia abajo más allá del peek cierra', () => {
      expect(soltar({ expandida: true, recorridoY: 600 })).toBe('cerrada')
    })

    it('arrastrar hacia arriba la deja expandida', () => {
      expect(soltar({ expandida: true, recorridoY: -150 })).toBe('expandida')
    })

    it('un arrastre corto y lento hacia abajo no cambia nada', () => {
      expect(soltar({ expandida: true, recorridoY: 20, velocidadY: 100 })).toBe(
        'expandida',
      )
    })
  })
})
