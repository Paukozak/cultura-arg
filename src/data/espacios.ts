export interface Espacio {
  id: string
  nombre: string | null
  categoria: string
  subcategoria: string | null
  provinciaId: string | null
  departamentoId: string | null
  departamento: string | null
  localidad: string | null
  lat: number | null
  lon: number | null
  anioInauguracion: number | null
  gestion: string | null
  direccion: string | null
  telefono: string | null
  mail: string | null
  web: string | null
  direccionMapa: string | null
  nombreMapa: string | null
}

// Fila tal como la emite `process-data.mjs`: tupla posicional en vez de
// objeto (evita repetir los 16 nombres de campo en cada una de las ~2500
// filas de, por ejemplo, Buenos Aires), con `categoria`/`subcategoria`/
// `gestion`/`departamento`/`localidad` como índice a una tabla de valores
// distintos del archivo (muy pocos frente a la cantidad de filas) en vez del
// string repetido entero. `provinciaId` ni viaja: es el mismo para todo el
// archivo, lo repone esta función a partir del parámetro que ya recibe.
type FilaEspacio = [
  id: string,
  nombre: string | null,
  categoriaIdx: number,
  subcategoriaIdx: number,
  departamentoId: string | null,
  departamentoIdx: number,
  localidadIdx: number,
  lat: number | null,
  lon: number | null,
  anioInauguracion: number | null,
  gestionIdx: number,
  direccion: string | null,
  telefono: string | null,
  mail: string | null,
  web: string | null,
  direccionMapa: string | null,
  nombreMapa: string | null,
]
interface EspaciosProvinciaJSON {
  categorias: string[]
  subcategorias: (string | null)[]
  gestiones: (string | null)[]
  departamentos: (string | null)[]
  localidades: (string | null)[]
  espacios: FilaEspacio[]
}

/** Carga diferida del JSON de espacios de una provincia (uno por archivo, ver
 * scripts/process-data.mjs) — así el drill-down no baja los 11.234 espacios
 * del país de una sola vez, solo los de la provincia que se abre. */
export async function cargarEspacios(provinciaId: string): Promise<Espacio[]> {
  const mod = await import(`./espacios/${provinciaId}.json`)
  const { categorias, subcategorias, gestiones, departamentos, localidades, espacios } =
    mod.default as unknown as EspaciosProvinciaJSON
  return espacios.map(
    ([
      id,
      nombre,
      categoriaIdx,
      subcategoriaIdx,
      departamentoId,
      departamentoIdx,
      localidadIdx,
      lat,
      lon,
      anioInauguracion,
      gestionIdx,
      direccion,
      telefono,
      mail,
      web,
      direccionMapa,
      nombreMapa,
    ]) => ({
      id,
      nombre,
      categoria: categorias[categoriaIdx],
      subcategoria: subcategorias[subcategoriaIdx],
      provinciaId,
      departamentoId,
      departamento: departamentos[departamentoIdx],
      localidad: localidades[localidadIdx],
      lat,
      lon,
      anioInauguracion,
      gestion: gestiones[gestionIdx],
      direccion,
      telefono,
      mail,
      web,
      direccionMapa,
      nombreMapa,
    }),
  )
}
