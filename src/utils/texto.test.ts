import { describe, expect, it } from 'vitest'
import { normalizar } from './texto'

describe('normalizar', () => {
  it('pasa a minúsculas', () => {
    expect(normalizar('CÓRDOBA')).toBe('cordoba')
  })

  it.each([
    ['áéíóú', 'aeiou'],
    ['Córdoba', 'cordoba'],
    ['San Martín', 'san martin'],
    ['Ñandú', 'nandu'],
    ['güiraldes', 'guiraldes'],
  ])('saca acentos y diéresis: %s → %s', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado)
  })

  it('no toca texto que ya está sin acentos', () => {
    expect(normalizar('Buenos Aires')).toBe('buenos aires')
  })

  it.each([
    ['9 de Julio', '9 de julio'],
    ['  con espacios  ', '  con espacios  '],
  ])(
    'deja espacios, números y puntuación tal cual: %j → %j',
    (entrada, esperado) => {
      expect(normalizar(entrada)).toBe(esperado)
    },
  )

  it('el string vacío da string vacío', () => {
    expect(normalizar('')).toBe('')
  })
})
