export interface Espacio {
  id: string
  nombre: string | null
  categoria: string
  subcategoria: string | null
  provinciaId: string | null
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
}

/** Carga diferida del JSON de espacios de una provincia (uno por archivo, ver
 * scripts/process-data.mjs) — así el drill-down no baja los 11.234 espacios
 * del país de una sola vez, solo los de la provincia que se abre. */
export async function cargarEspacios(provinciaId: string): Promise<Espacio[]> {
  const mod = (await import(`./espacios/${provinciaId}.json`)) as { default: Espacio[] }
  return mod.default
}
