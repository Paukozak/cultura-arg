import { describe, expect, it } from 'vitest'
import type { Espacio } from '../../data/espacios'
import {
  claveAgrupador,
  espaciosDeAgrupador,
  numeroComuna,
  opcionesAgrupador,
  opcionesMostradas,
  resumenAgrupador,
} from './agruparEspacios'
import { espacio } from './espacioDePrueba'
import { filtrarEspacios } from './filtrarEspacios'

describe('claveAgrupador', () => {
  it('fuera de CABA usa localidad', () => {
    const e = espacio({ id: 'a', categoria: 'Museos', localidad: 'Rosario' })
    expect(claveAgrupador(e, false)).toBe('Rosario')
  })

  it('fuera de CABA, sin localidad, cae en "sin dato"', () => {
    const e = espacio({ id: 'a', categoria: 'Museos', localidad: null })
    expect(claveAgrupador(e, false)).toBe('sin dato')
  })

  it('en CABA usa departamentoId, no localidad', () => {
    const e = espacio({
      id: 'a',
      categoria: 'Museos',
      localidad: 'Ciudad Autónoma de Buenos Aires',
      departamentoId: '02007',
    })
    expect(claveAgrupador(e, true)).toBe('02007')
  })

  it('en CABA, sin departamentoId, cae en "sin dato"', () => {
    const e = espacio({ id: 'a', categoria: 'Museos', departamentoId: null })
    expect(claveAgrupador(e, true)).toBe('sin dato')
  })

  it('en CABA no "limpia" el placeholder 02000 — queda tal cual', () => {
    // A propósito: `claveAgrupador` tiene que devolver la MISMA clave cruda
    // que compara `filtrarEspacios` (departamentosActivos). Si acá se
    // mapeara '02000' a otra cosa (p. ej. una clave sintética "sin-comuna"),
    // tildar esa opción del picker dejaría de coincidir con lo que filtra
    // de verdad — exactamente el bug que motivó este archivo.
    const e = espacio({ id: 'a', categoria: 'Museos', departamentoId: '02000' })
    expect(claveAgrupador(e, true)).toBe('02000')
  })
})

describe('numeroComuna', () => {
  it('extrae el número de "Comuna N"', () => {
    expect(numeroComuna('Comuna 1')).toBe(1)
    expect(numeroComuna('Comuna 15')).toBe(15)
  })

  it('sin número en la etiqueta, devuelve null', () => {
    expect(numeroComuna('Sin comuna')).toBeNull()
    expect(numeroComuna('Rosario')).toBeNull()
  })
})

describe('opcionesAgrupador', () => {
  it('fuera de CABA agrupa por localidad, etiqueta === clave, orden alfabético', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos', localidad: 'Rosario' }),
      espacio({ id: 'b', categoria: 'Cines', localidad: 'Rosario' }),
      espacio({ id: 'c', categoria: 'Museos', localidad: 'Venado Tuerto' }),
    ]
    const opciones = opcionesAgrupador(espacios, false, new Map())
    expect(opciones).toEqual([
      { clave: 'Rosario', etiqueta: 'Rosario', count: 2 },
      { clave: 'Venado Tuerto', etiqueta: 'Venado Tuerto', count: 1 },
    ])
  })

  it('en CABA agrupa por departamentoId, con la etiqueta real de la comuna', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos', departamentoId: '02007' }),
      espacio({ id: 'b', categoria: 'Museos', departamentoId: '02007' }),
      espacio({ id: 'c', categoria: 'Cines', departamentoId: '02014' }),
    ]
    const nombres = new Map([
      ['02007', 'Comuna 1'],
      ['02014', 'Comuna 2'],
    ])
    const opciones = opcionesAgrupador(espacios, true, nombres)
    expect(opciones).toEqual([
      { clave: '02007', etiqueta: 'Comuna 1', count: 2 },
      { clave: '02014', etiqueta: 'Comuna 2', count: 1 },
    ])
  })

  it('en CABA, un departamentoId sin comuna real se muestra como "Sin comuna"', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos', departamentoId: '02007' }),
      espacio({ id: 'b', categoria: 'Museos', departamentoId: '02000' }),
    ]
    const nombres = new Map([['02007', 'Comuna 1']])
    const opciones = opcionesAgrupador(espacios, true, nombres)
    const sinComuna = opciones.find((o) => o.etiqueta === 'Sin comuna')
    expect(sinComuna).toEqual({
      clave: '02000',
      etiqueta: 'Sin comuna',
      count: 1,
    })
  })

  it('en CABA ordena de menor a mayor por número de comuna, no alfabético', () => {
    // "Comuna 10" alfabéticamente cae antes que "Comuna 2" — acá tiene que
    // quedar después.
    const espacios: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos', departamentoId: '02x10' }),
      espacio({ id: 'b', categoria: 'Museos', departamentoId: '02x02' }),
      espacio({ id: 'c', categoria: 'Museos', departamentoId: '02x01' }),
    ]
    const nombres = new Map([
      ['02x10', 'Comuna 10'],
      ['02x02', 'Comuna 2'],
      ['02x01', 'Comuna 1'],
    ])
    const opciones = opcionesAgrupador(espacios, true, nombres)
    expect(opciones.map((o) => o.etiqueta)).toEqual([
      'Comuna 1',
      'Comuna 2',
      'Comuna 10',
    ])
  })

  it('en CABA, "Sin comuna" (sin número) queda al final', () => {
    const espacios: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos', departamentoId: '02000' }),
      espacio({ id: 'b', categoria: 'Museos', departamentoId: '02x10' }),
      espacio({ id: 'c', categoria: 'Museos', departamentoId: '02x01' }),
    ]
    const nombres = new Map([
      ['02x10', 'Comuna 10'],
      ['02x01', 'Comuna 1'],
    ])
    const opciones = opcionesAgrupador(espacios, true, nombres)
    expect(opciones.map((o) => o.etiqueta)).toEqual([
      'Comuna 1',
      'Comuna 10',
      'Sin comuna',
    ])
  })
})

describe('resumenAgrupador — texto del gatillo del picker', () => {
  const opciones = [
    { clave: 'a', etiqueta: 'Alfa', count: 1 },
    { clave: 'b', etiqueta: 'Beta', count: 2 },
    { clave: 'c', etiqueta: 'Gama', count: 3 },
  ]

  it('null ("todas") muestra el total entre paréntesis', () => {
    expect(resumenAgrupador(null, opciones)).toBe('Todas (3)')
  })

  it('Set vacío ("ninguna") lo dice explícitamente', () => {
    expect(resumenAgrupador(new Set(), opciones)).toBe('Ninguna')
  })

  it('un Set que terminó incluyendo a todas cuenta como "todas", no "3 de 3"', () => {
    expect(resumenAgrupador(new Set(['a', 'b', 'c']), opciones)).toBe(
      'Todas (3)',
    )
  })

  it('una sola opción elegida muestra su etiqueta', () => {
    expect(resumenAgrupador(new Set(['b']), opciones)).toBe('Beta')
  })

  it('varias opciones muestran la primera + cuántas más', () => {
    expect(resumenAgrupador(new Set(['a', 'c']), opciones)).toBe('Alfa +1')
  })
})

describe('opcionesMostradas — buscador del propio picker', () => {
  const opciones = [
    { clave: 'a', etiqueta: 'Rosario', count: 1 },
    { clave: 'b', etiqueta: 'Río Cuarto', count: 1 },
    { clave: 'c', etiqueta: 'Venado Tuerto', count: 1 },
  ]

  it('sin texto de búsqueda devuelve todas', () => {
    expect(opcionesMostradas(opciones, '')).toEqual(opciones)
  })

  it('filtra por etiqueta, insensible a acentos y mayúsculas', () => {
    const resultado = opcionesMostradas(opciones, 'CUARTO')
    expect(resultado.map((o) => o.clave)).toEqual(['b'])
  })

  it('la búsqueda es insensible a acentos (sin tilde encuentra "Río")', () => {
    const resultado = opcionesMostradas(opciones, 'rio cuarto')
    expect(resultado.map((o) => o.clave)).toEqual(['b'])
  })

  it('sin coincidencias devuelve vacío', () => {
    expect(opcionesMostradas(opciones, 'catamarca')).toEqual([])
  })
})

describe('espaciosDeAgrupador', () => {
  const espacios: Espacio[] = [
    espacio({ id: 'a', categoria: 'Museos', localidad: 'Rosario' }),
    espacio({ id: 'b', categoria: 'Cines', localidad: 'Rosario' }),
    espacio({ id: 'c', categoria: 'Museos', localidad: 'Venado Tuerto' }),
  ]

  it('null ("todas") devuelve todos los espacios sin recortar', () => {
    expect(espaciosDeAgrupador(espacios, null, false)).toEqual(espacios)
  })

  it('un Set recorta a los espacios con esa clave', () => {
    const resultado = espaciosDeAgrupador(espacios, new Set(['Rosario']), false)
    expect(resultado.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('Set vacío recorta todo (a propósito, "ninguna")', () => {
    expect(espaciosDeAgrupador(espacios, new Set(), false)).toEqual([])
  })
})

describe('integración con filtrarEspacios: tildar una opción del picker filtra exactamente su count', () => {
  // Este es el caso que se rompió en producción: `opcionesAgrupador` armaba
  // una clave sintética distinta a la que comparaba `filtrarEspacios`
  // (departamentosActivos), así que tildar "Sin comuna" (28 espacios, según
  // el picker) daba 0 resultados reales. Estos tests recorren TODAS las
  // opciones armadas por `opcionesAgrupador` y verifican que filtrarlas de
  // verdad (con la función que usa ProvinceFullView, no una reimplementación
  // del test) devuelve exactamente `count` espacios — así una clave que se
  // desincroniza entre los dos módulos rompe el test, no un usuario.
  const espacios: Espacio[] = [
    espacio({ id: 'a', categoria: 'Museos', departamentoId: '02007' }),
    espacio({ id: 'b', categoria: 'Cines', departamentoId: '02007' }),
    espacio({ id: 'c', categoria: 'Museos', departamentoId: '02014' }),
    espacio({ id: 'd', categoria: 'Museos', departamentoId: '02000' }),
    espacio({ id: 'e', categoria: 'Bibliotecas', departamentoId: '02000' }),
  ]
  const nombres = new Map([
    ['02007', 'Comuna 1'],
    ['02014', 'Comuna 2'],
  ])

  it('cada opción de CABA (incluida "Sin comuna") filtra exactamente su count', () => {
    const opciones = opcionesAgrupador(espacios, true, nombres)
    for (const opcion of opciones) {
      const resultado = filtrarEspacios(espacios, {
        departamentosActivos: new Set([opcion.clave]),
      })
      expect(resultado).toHaveLength(opcion.count)
    }
  })

  it('específicamente, "Sin comuna" filtra los 2 espacios con placeholder 02000', () => {
    const opciones = opcionesAgrupador(espacios, true, nombres)
    const sinComuna = opciones.find((o) => o.etiqueta === 'Sin comuna')!
    const resultado = filtrarEspacios(espacios, {
      departamentosActivos: new Set([sinComuna.clave]),
    })
    expect(resultado.map((e) => e.id).sort()).toEqual(['d', 'e'])
  })

  it('fuera de CABA, cada opción de localidad filtra exactamente su count', () => {
    const espaciosProvincia: Espacio[] = [
      espacio({ id: 'a', categoria: 'Museos', localidad: 'Rosario' }),
      espacio({ id: 'b', categoria: 'Cines', localidad: 'Rosario' }),
      espacio({ id: 'c', categoria: 'Museos', localidad: null }),
    ]
    const opciones = opcionesAgrupador(espaciosProvincia, false, new Map())
    for (const opcion of opciones) {
      const resultado = filtrarEspacios(espaciosProvincia, {
        localidadesActivas: new Set([opcion.clave]),
      })
      expect(resultado).toHaveLength(opcion.count)
    }
  })
})
