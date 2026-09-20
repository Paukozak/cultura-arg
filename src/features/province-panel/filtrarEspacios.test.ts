import { describe, expect, it } from 'vitest'
import type { Espacio } from '../../data/espacios'
import {
  filtrarEspacios,
  filtrarYOrdenarEspacios,
  ordenarEspacios,
} from './filtrarEspacios'

function espacio(
  overrides: Partial<Espacio> & Pick<Espacio, 'id' | 'categoria'>,
): Espacio {
  return {
    nombre: overrides.id,
    subcategoria: null,
    provinciaId: '99',
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

describe('ordenarEspacios', () => {
  const espacios: Espacio[] = [
    espacio({
      id: 'a',
      categoria: 'Museos',
      nombre: 'Biblioteca Sur',
      anioInauguracion: 1990,
    }),
    espacio({
      id: 'b',
      categoria: 'Cines',
      nombre: 'Archivo Norte',
      anioInauguracion: 1920,
    }),
    espacio({
      id: 'c',
      categoria: 'Museos',
      nombre: 'Centro Este',
      anioInauguracion: null,
    }),
  ]

  it('alfabetico ordena por nombre sin importar categoría', () => {
    const resultado = ordenarEspacios(espacios, 'alfabetico')
    expect(resultado.map((e) => e.id)).toEqual(['b', 'a', 'c'])
  })

  it('anio-asc pone primero el año más antiguo y los sin dato al final', () => {
    const resultado = ordenarEspacios(espacios, 'anio-asc')
    expect(resultado.map((e) => e.id)).toEqual(['b', 'a', 'c'])
  })

  it('anio-desc pone primero el año más reciente y los sin dato al final', () => {
    const resultado = ordenarEspacios(espacios, 'anio-desc')
    expect(resultado.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('categoria agrupa por categoría y desempata alfabéticamente dentro de cada una', () => {
    // Cines (b) antes que Museos; dentro de Museos, "Biblioteca Sur" (a)
    // antes que "Centro Este" (c) por orden alfabético de nombre.
    const resultado = ordenarEspacios(espacios, 'categoria')
    expect(resultado.map((e) => e.id)).toEqual(['b', 'a', 'c'])
  })

  it('no muta el array original', () => {
    const copia = [...espacios]
    ordenarEspacios(espacios, 'alfabetico')
    expect(espacios).toEqual(copia)
  })
})

describe('filtrarEspacios', () => {
  const espacios: Espacio[] = [
    espacio({
      id: 'a',
      categoria: 'Museos',
      nombre: 'Museo de Bellas Artes',
      localidad: 'Rosario',
      gestion: 'pública',
    }),
    espacio({
      id: 'b',
      categoria: 'Cines',
      nombre: 'Cine Teatro Ideal',
      localidad: 'Rosario',
      gestion: 'privada',
    }),
    espacio({
      id: 'c',
      categoria: 'Museos',
      nombre: 'Museo Histórico',
      localidad: 'Venado Tuerto',
      gestion: null,
    }),
  ]

  it('sin filtros devuelve todo', () => {
    expect(filtrarEspacios(espacios, {})).toHaveLength(3)
  })

  it('busqueda por nombre es insensible a acentos y mayúsculas', () => {
    const resultado = filtrarEspacios(espacios, { busqueda: 'HISTORICO' })
    expect(resultado.map((e) => e.id)).toEqual(['c'])
  })

  it('busqueda también encuentra por localidad', () => {
    const resultado = filtrarEspacios(espacios, { busqueda: 'venado' })
    expect(resultado.map((e) => e.id)).toEqual(['c'])
  })

  it('categoriasActivas como Set vacío filtra todo (a propósito, "Ninguna")', () => {
    expect(filtrarEspacios(espacios, { categoriasActivas: new Set() })).toEqual(
      [],
    )
  })

  it('categoriasActivas filtra solo a las categorías incluidas', () => {
    const resultado = filtrarEspacios(espacios, {
      categoriasActivas: new Set(['Cines']),
    })
    expect(resultado.map((e) => e.id)).toEqual(['b'])
  })

  it('gestionesActivas trata la gestión null como la clave "sin dato"', () => {
    const resultado = filtrarEspacios(espacios, {
      gestionesActivas: new Set(['sin dato']),
    })
    expect(resultado.map((e) => e.id)).toEqual(['c'])
  })

  it('localidadActiva filtra por coincidencia exacta', () => {
    const resultado = filtrarEspacios(espacios, { localidadActiva: 'Rosario' })
    expect(resultado.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('combina búsqueda, categoría y localidad a la vez', () => {
    const resultado = filtrarEspacios(espacios, {
      busqueda: 'museo',
      categoriasActivas: new Set(['Museos']),
      localidadActiva: 'Rosario',
    })
    expect(resultado.map((e) => e.id)).toEqual(['a'])
  })
})

describe('filtrarYOrdenarEspacios', () => {
  it('aplica el filtro y después ordena el resultado', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos', nombre: 'Zeta' }),
      espacio({ id: 'b', categoria: 'Cines', nombre: 'Alfa' }),
      espacio({ id: 'c', categoria: 'Museos', nombre: 'Beta' }),
    ]
    const resultado = filtrarYOrdenarEspacios(
      espacios,
      { categoriasActivas: new Set(['Museos']) },
      'alfabetico',
    )
    expect(resultado.map((e) => e.id)).toEqual(['c', 'a'])
  })
})
