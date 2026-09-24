import { describe, expect, it } from 'vitest'
import { normalizar } from './texto'

describe('normalizar', () => {
  it('pasa a minúsculas', () => {
    expect(normalizar('CÓRDOBA')).toBe('cordoba')
  })

  it('saca acentos y diéresis sin tocar la letra base', () => {
    expect(normalizar('áéíóú')).toBe('aeiou')
    expect(normalizar('Córdoba')).toBe('cordoba')
    expect(normalizar('San Martín')).toBe('san martin')
    expect(normalizar('Ñandú')).toBe('nandu')
    expect(normalizar('güiraldes')).toBe('guiraldes')
  })

  it('no toca texto que ya está sin acentos', () => {
    expect(normalizar('Buenos Aires')).toBe('buenos aires')
  })

  it('deja espacios, números y puntuación tal cual', () => {
    expect(normalizar('9 de Julio')).toBe('9 de julio')
    expect(normalizar('  con espacios  ')).toBe('  con espacios  ')
  })

  it('el string vacío da string vacío', () => {
    expect(normalizar('')).toBe('')
  })
})
