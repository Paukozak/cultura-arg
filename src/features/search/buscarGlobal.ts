import { departamentosResumen } from '../../data/departamentos'
import { provinciasGeo } from '../../data/provincias'
import { normalizar } from '../../utils/texto'
import { nombreMostradoPara } from '../province-panel/curaduriaDestacados'

interface EntradaIndiceEspacio {
  id: string
  nombre: string
  categoria: string
  localidad: string | null
  provinciaId: string
}

interface EntradaIndiceLocalidad {
  localidad: string
  provinciaId: string
  cantidadEspacios: number
}

// `indice-busqueda.json` pesa ~1.8MB (uno de los campos por cada uno de los
// ~11 mil espacios del país) — importado de forma estática like antes, se
// sumaba entero al bundle principal, algo que descargar y parsear ANTES de
// poder pintar la página, para un buscador que ni siquiera se usa hasta que
// alguien le hace click. `import()` dinámico lo separa en su propio chunk,
// pedido en paralelo apenas monta el buscador (ver `precargarIndiceBusqueda`
// en GlobalSearch.tsx) en vez de bloquear la carga inicial.
let indiceEspacios: EntradaIndiceEspacio[] | null = null
let indiceLocalidades: EntradaIndiceLocalidad[] | null = null
let cargaEnCurso: Promise<void> | null = null

export function precargarIndiceBusqueda(): Promise<void> {
  if (!cargaEnCurso) {
    cargaEnCurso = Promise.all([
      import('../../data/indice-busqueda.json'),
      import('../../data/indice-localidades.json'),
    ]).then(([espaciosMod, localidadesMod]) => {
      indiceEspacios = espaciosMod.default as EntradaIndiceEspacio[]
      indiceLocalidades = localidadesMod.default as EntradaIndiceLocalidad[]
    })
  }
  return cargaEnCurso
}

const NOMBRE_PROVINCIA_POR_ID = new Map(
  provinciasGeo.features.map((f) => [f.properties.id, f.properties.nombre]),
)

// Alias cortos que la gente realmente escribe y que no son substring del
// nombre oficial de la provincia (p. ej. "CABA" no aparece en "Ciudad
// Autónoma de Buenos Aires").
const ALIAS_PROVINCIA: Record<string, string[]> = {
  '02': ['caba', 'capital federal'],
}

export type ResultadoBusqueda =
  | { tipo: 'provincia'; id: string; nombre: string }
  | {
      tipo: 'departamento'
      id: string
      nombre: string
      provinciaId: string
      provinciaNombre: string
      totalEspacios: number
    }
  | {
      tipo: 'localidad'
      nombre: string
      provinciaId: string
      provinciaNombre: string
      cantidadEspacios: number
    }
  | {
      tipo: 'espacio'
      id: string
      nombre: string
      provinciaId: string
      categoria: string
      localidad: string | null
    }

const MAX_PROVINCIAS = 4
const MAX_DEPARTAMENTOS = 5
const MAX_LOCALIDADES = 5
const MAX_ESPACIOS = 8

function coincidencia(campo: string, q: string): 0 | 1 | 2 {
  const norm = normalizar(campo)
  if (norm === q) return 2
  if (norm.startsWith(q)) return 1
  return norm.includes(q) ? 1 : 0
}

function porRelevancia(
  a: [ResultadoBusqueda, number],
  b: [ResultadoBusqueda, number],
) {
  return b[1] - a[1] || a[0].nombre.localeCompare(b[0].nombre, 'es')
}

export function buscarGlobal(query: string): ResultadoBusqueda[] {
  const q = normalizar(query.trim())
  if (!q || q.length < 2) return []

  const provincias: [ResultadoBusqueda, number][] = []
  for (const feature of provinciasGeo.features) {
    const { id, nombre } = feature.properties
    const alias = ALIAS_PROVINCIA[id] ?? []
    const rank = Math.max(
      coincidencia(nombre, q),
      coincidencia(feature.properties.nombreCompleto, q),
      ...alias.map((a) => (normalizar(a).includes(q) ? 2 : 0)),
    )
    if (rank > 0) provincias.push([{ tipo: 'provincia', id, nombre }, rank])
  }
  provincias.sort(porRelevancia)

  // `departamentosResumen` ya está cargado eager (lo usa el choropleth de
  // NationalMap.tsx antes de zoomear a ninguna provincia), a diferencia de
  // los índices de localidad/espacio de abajo: no hace falta esperar
  // `precargarIndiceBusqueda` para que aparezcan resultados.
  const departamentos: [ResultadoBusqueda, number][] = []
  for (const d of departamentosResumen) {
    const rank = coincidencia(d.nombre, q)
    if (rank > 0) {
      departamentos.push([
        {
          tipo: 'departamento',
          id: d.id,
          nombre: d.nombre,
          provinciaId: d.provinciaId,
          provinciaNombre: NOMBRE_PROVINCIA_POR_ID.get(d.provinciaId) ?? '',
          totalEspacios: d.totalEspacios,
        },
        rank,
      ])
    }
  }
  departamentos.sort(porRelevancia)

  const localidades: [ResultadoBusqueda, number][] = []
  for (const l of indiceLocalidades ?? []) {
    const rank = coincidencia(l.localidad, q)
    if (rank > 0) {
      localidades.push([
        {
          tipo: 'localidad',
          nombre: l.localidad,
          provinciaId: l.provinciaId,
          provinciaNombre: NOMBRE_PROVINCIA_POR_ID.get(l.provinciaId) ?? '',
          cantidadEspacios: l.cantidadEspacios,
        },
        rank,
      ])
    }
  }
  localidades.sort(porRelevancia)

  const espacios: [ResultadoBusqueda, number][] = []
  for (const e of indiceEspacios ?? []) {
    const nombreEfectivo = nombreMostradoPara(e.id) ?? e.nombre
    const rank = Math.max(
      coincidencia(nombreEfectivo, q),
      e.localidad ? coincidencia(e.localidad, q) : 0,
    )
    if (rank > 0) {
      espacios.push([
        {
          tipo: 'espacio',
          id: e.id,
          nombre: nombreEfectivo,
          provinciaId: e.provinciaId,
          categoria: e.categoria,
          localidad: e.localidad,
        },
        rank,
      ])
    }
  }
  // Recorrer las ~11k entradas del índice es barato (comparaciones de
  // strings cortos), así que se ordena por relevancia sobre todos los
  // matches en vez de cortar temprano — cortar antes de ordenar podría
  // descartar una coincidencia exacta que aparece más tarde en el archivo
  // a favor de coincidencias parciales que aparecen antes.
  espacios.sort(porRelevancia)

  return [
    ...provincias.slice(0, MAX_PROVINCIAS).map(([r]) => r),
    ...departamentos.slice(0, MAX_DEPARTAMENTOS).map(([r]) => r),
    ...localidades.slice(0, MAX_LOCALIDADES).map(([r]) => r),
    ...espacios.slice(0, MAX_ESPACIOS).map(([r]) => r),
  ]
}
