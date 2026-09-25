import { describe, expect, it } from 'vitest'
import type { Espacio } from '../../data/espacios'
import { espacio } from './espacioDePrueba'
import {
  alternarTodos,
  alternarValorFiltro,
  etiquetaVerEspacios,
  filtrarEspacios,
  filtrarYOrdenarEspacios,
  hayFiltrosAplicados,
  ordenarEspacios,
  type FiltrosEspacios,
} from './filtrarEspacios'

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

  it('localidadesActivas filtra por coincidencia exacta', () => {
    const resultado = filtrarEspacios(espacios, {
      localidadesActivas: new Set(['Rosario']),
    })
    expect(resultado.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('localidadesActivas admite más de una localidad a la vez', () => {
    const resultado = filtrarEspacios(espacios, {
      localidadesActivas: new Set(['Rosario', 'Venado Tuerto']),
    })
    expect(resultado.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('localidadesActivas como Set vacío filtra todo (a propósito, "Ninguna")', () => {
    expect(
      filtrarEspacios(espacios, { localidadesActivas: new Set() }),
    ).toEqual([])
  })

  it('departamentosActivos filtra por departamentoId en vez de localidad', () => {
    const conDepartamento: Espacio[] = [
      espacio({ id: 'd1', categoria: 'Museos', departamentoId: '02007' }),
      espacio({ id: 'd2', categoria: 'Museos', departamentoId: '02014' }),
    ]
    const resultado = filtrarEspacios(conDepartamento, {
      departamentosActivos: new Set(['02007']),
    })
    expect(resultado.map((e) => e.id)).toEqual(['d1'])
  })

  it('departamentosActivos como Set vacío filtra todo (a propósito, "Ninguna")', () => {
    expect(
      filtrarEspacios(espacios, { departamentosActivos: new Set() }),
    ).toEqual([])
  })

  it('combina búsqueda, categoría y localidad a la vez', () => {
    const resultado = filtrarEspacios(espacios, {
      busqueda: 'museo',
      categoriasActivas: new Set(['Museos']),
      localidadesActivas: new Set(['Rosario']),
    })
    expect(resultado.map((e) => e.id)).toEqual(['a'])
  })

  it('combina categoría y departamento a la vez (caso CABA)', () => {
    const conDepartamento: Espacio[] = [
      espacio({
        id: 'd1',
        categoria: 'Museos',
        nombre: 'Museo Roca',
        departamentoId: '02007',
      }),
      espacio({
        id: 'd2',
        categoria: 'Cines',
        nombre: 'Cine Roca',
        departamentoId: '02007',
      }),
      espacio({
        id: 'd3',
        categoria: 'Museos',
        nombre: 'Museo Lezama',
        departamentoId: '02014',
      }),
    ]
    const resultado = filtrarEspacios(conDepartamento, {
      categoriasActivas: new Set(['Museos']),
      departamentosActivos: new Set(['02007']),
    })
    expect(resultado.map((e) => e.id)).toEqual(['d1'])
  })
})

describe('hayFiltrosAplicados', () => {
  it('sin filtros, o con todos en su valor por defecto, es falso', () => {
    expect(hayFiltrosAplicados({})).toBe(false)
    expect(
      hayFiltrosAplicados({
        busqueda: '',
        categoriasActivas: null,
        gestionesActivas: null,
        localidadesActivas: null,
      }),
    ).toBe(false)
  })

  it('una búsqueda de solo espacios no cuenta (filtrarEspacios también la ignora)', () => {
    expect(hayFiltrosAplicados({ busqueda: '   ' })).toBe(false)
  })

  it('una búsqueda con texto cuenta', () => {
    expect(hayFiltrosAplicados({ busqueda: 'museo' })).toBe(true)
  })

  it('un Set de categorías o gestiones cuenta aunque esté vacío ("Ninguna")', () => {
    expect(hayFiltrosAplicados({ categoriasActivas: new Set() })).toBe(true)
    expect(hayFiltrosAplicados({ gestionesActivas: new Set() })).toBe(true)
    expect(hayFiltrosAplicados({ categoriasActivas: new Set(['Cines']) })).toBe(
      true,
    )
  })

  it('una o más localidades elegidas cuentan', () => {
    expect(
      hayFiltrosAplicados({ localidadesActivas: new Set(['Famaillá']) }),
    ).toBe(true)
    expect(hayFiltrosAplicados({ localidadesActivas: new Set() })).toBe(true)
  })

  it('uno o más departamentos elegidos cuentan', () => {
    expect(
      hayFiltrosAplicados({ departamentosActivos: new Set(['02007']) }),
    ).toBe(true)
    expect(hayFiltrosAplicados({ departamentosActivos: new Set() })).toBe(true)
  })

  it('coincide con filtrarEspacios: si dice que no hay filtros, no recorta nada', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos' }),
      espacio({ id: 'b', categoria: 'Cines' }),
    ]
    const sinFiltro: FiltrosEspacios[] = [
      {},
      { busqueda: '  ' },
      {
        categoriasActivas: null,
        gestionesActivas: null,
        localidadesActivas: null,
        departamentosActivos: null,
      },
    ]
    for (const filtros of sinFiltro) {
      expect(hayFiltrosAplicados(filtros)).toBe(false)
      expect(filtrarEspacios(espacios, filtros)).toHaveLength(espacios.length)
    }
  })
})

describe('etiquetaVerEspacios', () => {
  it('singular con uno, plural con varios', () => {
    expect(etiquetaVerEspacios(1)).toBe('Ver 1 espacio')
    expect(etiquetaVerEspacios(249)).toBe('Ver 249 espacios')
  })

  it('sin resultados avisa y deja cerrar igual', () => {
    expect(etiquetaVerEspacios(0)).toBe('Sin resultados · cerrar filtros')
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

describe('alternarValorFiltro', () => {
  it('estando en "Todas" (null), elegir un valor arranca una selección nueva con solo ese', () => {
    expect(alternarValorFiltro(null, 'Museos')).toEqual(new Set(['Museos']))
  })

  it('con una selección puntual ya activa, suma el valor si no estaba', () => {
    const resultado = alternarValorFiltro(new Set(['Museos']), 'Cines')
    expect(resultado).toEqual(new Set(['Museos', 'Cines']))
  })

  it('con una selección puntual ya activa, saca el valor si ya estaba', () => {
    const resultado = alternarValorFiltro(new Set(['Museos', 'Cines']), 'Cines')
    expect(resultado).toEqual(new Set(['Museos']))
  })

  it('sacar el último valor deja un Set vacío, no vuelve a "Todas"', () => {
    expect(alternarValorFiltro(new Set(['Museos']), 'Museos')).toEqual(
      new Set(),
    )
  })

  it('no muta el Set recibido', () => {
    const activos = new Set(['Museos'])
    alternarValorFiltro(activos, 'Cines')
    expect(activos).toEqual(new Set(['Museos']))
  })
})

describe('alternarTodos', () => {
  it('de "Todas" (null) pasa a un Set vacío ("Ninguna" a propósito)', () => {
    expect(alternarTodos(null)).toEqual(new Set())
  })

  it('de cualquier selección puntual (incluido un Set vacío) vuelve a "Todas" (null)', () => {
    expect(alternarTodos(new Set())).toBeNull()
    expect(alternarTodos(new Set(['Museos']))).toBeNull()
  })
})
