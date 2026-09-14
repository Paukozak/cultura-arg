import { provinciasGeo } from '../../data/provincias'
import { normalizar } from '../../utils/texto'
import { nombreMostradoPara } from '../province-panel/curaduriaDestacados'
import indiceEspaciosRaw from '../../data/indice-busqueda.json'
import indiceLocalidadesRaw from '../../data/indice-localidades.json'

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

const indiceEspacios = indiceEspaciosRaw as EntradaIndiceEspacio[]
const indiceLocalidades = indiceLocalidadesRaw as EntradaIndiceLocalidad[]

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
const MAX_LOCALIDADES = 5
const MAX_ESPACIOS = 8

function coincidencia(campo: string, q: string): 0 | 1 | 2 {
  const norm = normalizar(campo)
  if (norm === q) return 2
  if (norm.startsWith(q)) return 1
  return norm.includes(q) ? 1 : 0
}

function porRelevancia(a: [ResultadoBusqueda, number], b: [ResultadoBusqueda, number]) {
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

  const localidades: [ResultadoBusqueda, number][] = []
  for (const l of indiceLocalidades) {
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
  for (const e of indiceEspacios) {
    const nombreEfectivo = nombreMostradoPara(e.id) ?? e.nombre
    const rank = Math.max(coincidencia(nombreEfectivo, q), e.localidad ? coincidencia(e.localidad, q) : 0)
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
    ...localidades.slice(0, MAX_LOCALIDADES).map(([r]) => r),
    ...espacios.slice(0, MAX_ESPACIOS).map(([r]) => r),
  ]
}
