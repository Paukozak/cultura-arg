import { describe, expect, it } from 'vitest'
import { buscarGlobal, precargarIndiceBusqueda } from './buscarGlobal'

describe('buscarGlobal — casos límite', () => {
  it('query vacía no devuelve nada', () => {
    expect(buscarGlobal('')).toEqual([])
  })

  it('query de un solo caracter no devuelve nada (mínimo 2)', () => {
    expect(buscarGlobal('a')).toEqual([])
  })

  it('espacios en blanco alrededor no cuentan para el mínimo', () => {
    expect(buscarGlobal('  a  ')).toEqual([])
  })

  it('una query sin ningún match da lista vacía', () => {
    expect(buscarGlobal('xzqwzxqw')).toEqual([])
  })
})

describe('buscarGlobal — provincias', () => {
  it('encuentra por nombre ignorando acentos y mayúsculas', () => {
    const resultados = buscarGlobal('CORDOBA')
    expect(resultados).toEqual([
      { tipo: 'provincia', id: '14', nombre: 'Córdoba' },
    ])
  })

  it('alias de CABA: "caba" encuentra Ciudad Autónoma de Buenos Aires', () => {
    const resultados = buscarGlobal('caba')
    expect(resultados).toContainEqual({
      tipo: 'provincia',
      id: '02',
      nombre: 'Ciudad Autónoma de Buenos Aires',
    })
  })

  it('alias de CABA: "capital federal" también matchea (no es substring del nombre oficial)', () => {
    const resultados = buscarGlobal('capital federal')
    expect(resultados).toContainEqual({
      tipo: 'provincia',
      id: '02',
      nombre: 'Ciudad Autónoma de Buenos Aires',
    })
  })

  it('coincidencia exacta y por substring se ordenan alfabéticamente entre sí a igual rango', () => {
    // "san" matea (por prefijo) San Juan, San Luis, Santa Cruz, Santa Fe y
    // Santiago del Estero, todas al mismo rango (empiezan con "san") — se
    // espera orden alfabético y recorte a las primeras 4 (MAX_PROVINCIAS).
    const provincias = buscarGlobal('san').filter((r) => r.tipo === 'provincia')
    expect(provincias.map((r) => r.nombre)).toEqual([
      'San Juan',
      'San Luis',
      'Santa Cruz',
      'Santa Fe',
    ])
  })

  it('recorta a un máximo de 4 provincias aunque matcheen más', () => {
    // "provincia de" está al principio (o, con "del", como prefijo de "de")
    // del nombreCompleto de 23 de las 24 jurisdicciones (todas menos CABA).
    const resultados = buscarGlobal('provincia de')
    const provincias = resultados.filter((r) => r.tipo === 'provincia')
    expect(provincias.length).toBe(4)
  })
})

describe('buscarGlobal — departamentos', () => {
  it('encuentra un departamento por nombre y resuelve el nombre de su provincia', () => {
    const resultados = buscarGlobal('tulumba')
    expect(resultados).toEqual([
      {
        tipo: 'departamento',
        id: '14175',
        nombre: 'Tulumba',
        provinciaId: '14',
        provinciaNombre: 'Córdoba',
        totalEspacios: 8,
      },
    ])
  })

  it('mismo nombre de departamento en varias provincias: aparecen todos, sin duplicarse ni perderse', () => {
    const resultados = buscarGlobal('general alvear')
    const departamentos = resultados.filter((r) => r.tipo === 'departamento')
    expect(departamentos).toEqual([
      {
        tipo: 'departamento',
        id: '06287',
        nombre: 'General Alvear',
        provinciaId: '06',
        provinciaNombre: 'Buenos Aires',
        totalEspacios: 2,
      },
      {
        tipo: 'departamento',
        id: '50014',
        nombre: 'General Alvear',
        provinciaId: '50',
        provinciaNombre: 'Mendoza',
        totalEspacios: 8,
      },
      {
        tipo: 'departamento',
        id: '18056',
        nombre: 'General Alvear',
        provinciaId: '18',
        provinciaNombre: 'Corrientes',
        totalEspacios: 1,
      },
    ])
  })
})

describe('buscarGlobal — localidades y espacios (índice cargado de forma diferida)', () => {
  it('antes de precargar el índice, localidades y espacios no aparecen (pero provincias/departamentos sí)', () => {
    const resultados = buscarGlobal('tulumba')
    expect(resultados.some((r) => r.tipo === 'localidad')).toBe(false)
    expect(resultados.some((r) => r.tipo === 'espacio')).toBe(false)
    expect(resultados.some((r) => r.tipo === 'departamento')).toBe(true)
  })

  it('precarga el índice y ya no hace falta repetirla (promesa cacheada)', async () => {
    const p1 = precargarIndiceBusqueda()
    const p2 = precargarIndiceBusqueda()
    expect(p1).toBe(p2)
    await p1
  })

  it('localidad: coincidencia exacta trae la cantidad de espacios de esa localidad', () => {
    const localidades = buscarGlobal('villa carlos paz').filter(
      (r) => r.tipo === 'localidad',
    )
    expect(localidades).toEqual([
      {
        tipo: 'localidad',
        nombre: 'Villa Carlos Paz',
        provinciaId: '14',
        provinciaNombre: 'Córdoba',
        cantidadEspacios: 17,
      },
    ])
  })

  it('espacio: se puede encontrar por el nombre de su localidad, no solo por su propio nombre', () => {
    // "Emilio V. Bunge" no aparece en el nombre del espacio — solo coincide
    // por su campo `localidad`.
    const resultados = buscarGlobal('emilio v. bunge')
    const espacio = resultados.find((r) => r.tipo === 'espacio')
    expect(espacio).toEqual({
      tipo: 'espacio',
      id: 'museos-45',
      nombre: 'Museo Comunal Pedro Bargero',
      provinciaId: '06',
      categoria: 'Museos',
      localidad: 'Emilio V. Bunge',
    })
  })

  it('recorta espacios a un máximo de 8, priorizando coincidencia exacta y desempatando alfabéticamente', () => {
    // "colon" matchea (nombre o localidad) muchos más de 8 espacios en todo
    // el país; los 16 con coincidencia EXACTA de localidad ("Colón"/"Colon")
    // deben ganarle a los que solo contienen "colon" como substring
    // ("Colonia Caroya", etc.), y entre ellos se ordena por nombre.
    const resultados = buscarGlobal('colon').filter((r) => r.tipo === 'espacio')
    expect(resultados).toHaveLength(8)
    expect(resultados.map((r) => r.nombre)).toEqual([
      'Bib.Pop. Fiat Lux',
      'Bib.Pop. Mariano Moreno',
      'Biblioteca Pedagógica “Celia Pellenc” Colón',
      'Casa Bertoldi',
      'Casa de la Historia y la Cultura del Bicentenario Colon',
      'Centro Cultural Político y Social Espacio Abierto Nunca Menos',
      'Cine Teatro Colon',
      'Finca de Saldan',
    ])
  })
})
