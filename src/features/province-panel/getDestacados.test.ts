import { describe, expect, it } from 'vitest'
import type { Espacio } from '../../data/espacios'
import { getDestacados } from './getDestacados'

function espacio(
  overrides: Partial<Espacio> & Pick<Espacio, 'id' | 'categoria'>,
): Espacio {
  return {
    nombre: overrides.id,
    subcategoria: null,
    provinciaId: '99',
    departamentoId: null,
    departamento: null,
    localidad: null,
    lat: null,
    lon: null,
    anioInauguracion: null,
    gestion: null,
    direccion: null,
    telefono: null,
    mail: null,
    web: null,
    ...overrides,
  }
}

describe('getDestacados', () => {
  it('devuelve los espacios curados en el orden de la curaduría, no el de la lista original', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'museos-2', categoria: 'Museos' }),
      espacio({ id: 'museos-1', categoria: 'Museos' }),
    ]
    const curados = { '99': [{ id: 'museos-1' }, { id: 'museos-2' }] }

    const destacados = getDestacados('99', espacios, curados)

    expect(destacados.map((e) => e.id)).toEqual(['museos-1', 'museos-2'])
  })

  it('omite en silencio un id curado que ya no existe en los espacios de la provincia', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'museos-1', categoria: 'Museos' }),
    ]
    const curados = { '99': [{ id: 'museos-1' }, { id: 'museos-borrado' }] }

    const destacados = getDestacados('99', espacios, curados)

    expect(destacados).toHaveLength(1)
    expect(destacados[0].id).toBe('museos-1')
  })

  it('aplica nombreMostrado como override del nombre real cuando está definido', () => {
    const espacios: Espacio[] = [
      espacio({
        id: 'salas-de-teatro-1',
        categoria: 'Salas de Teatro',
        nombre: 'Panaderia Museo Maritimo Presidio',
      }),
    ]
    const curados = {
      '99': [
        {
          id: 'salas-de-teatro-1',
          nombreMostrado: 'Museo Marítimo y del Presidio',
        },
      ],
    }

    const destacados = getDestacados('99', espacios, curados)

    expect(destacados[0].nombre).toBe('Museo Marítimo y del Presidio')
  })

  it('devuelve un array vacío si la provincia no tiene curaduría', () => {
    const destacados = getDestacados('00', [], {})
    expect(destacados).toEqual([])
  })
})
