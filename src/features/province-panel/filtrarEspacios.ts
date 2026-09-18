import type { Espacio } from '../../data/espacios'
import { normalizar } from '../../utils/texto'

export type Orden = 'alfabetico' | 'anio-asc' | 'anio-desc' | 'categoria'

export const ORDEN_LABEL: Record<Orden, string> = {
  alfabetico: 'Alfabético',
  'anio-asc': 'Año (más antiguo)',
  'anio-desc': 'Año (más reciente)',
  categoria: 'Categoría',
}

/** Extraída de ProvinceFullView.tsx (Etapa 5) para poder testearla sin
 * montar el componente — es la pieza con más lógica pura de la vista
 * completa (orden, filtros combinables, búsqueda insensible a acentos). */
export function ordenarEspacios(espacios: Espacio[], orden: Orden): Espacio[] {
  const arr = [...espacios]
  switch (orden) {
    case 'alfabetico':
      return arr.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))
    case 'anio-asc':
      return arr.sort(
        (a, b) => (a.anioInauguracion ?? Infinity) - (b.anioInauguracion ?? Infinity),
      )
    case 'anio-desc':
      return arr.sort(
        (a, b) => (b.anioInauguracion ?? -Infinity) - (a.anioInauguracion ?? -Infinity),
      )
    case 'categoria':
      return arr.sort(
        (a, b) =>
          a.categoria.localeCompare(b.categoria, 'es') ||
          (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'),
      )
  }
}

export interface FiltrosEspacios {
  /** Texto libre, se compara sin distinguir acentos/mayúsculas contra
   * nombre y localidad. */
  busqueda?: string
  /** `null` (default) = todas. Un Set, aunque esté vacío, filtra a esas
   * categorías puntuales — así "Ninguna" (Set vacío) puede vaciar la lista
   * a propósito sin que se confunda con "sin filtro". */
  categoriasActivas?: Set<string> | null
  gestionesActivas?: Set<string> | null
  /** Un espacio sin gestión/localidad documentada cae bajo la clave
   * `'sin dato'`, la misma que arma la UI para esos chips/opciones. */
  localidadActiva?: string | null
}

export function filtrarEspacios(espacios: Espacio[], filtros: FiltrosEspacios): Espacio[] {
  const q = normalizar((filtros.busqueda ?? '').trim())
  let resultado = espacios
  if (q) {
    resultado = resultado.filter(
      (e) => normalizar(e.nombre ?? '').includes(q) || normalizar(e.localidad ?? '').includes(q),
    )
  }
  if (filtros.categoriasActivas) {
    resultado = resultado.filter((e) => filtros.categoriasActivas!.has(e.categoria))
  }
  if (filtros.gestionesActivas) {
    resultado = resultado.filter((e) => filtros.gestionesActivas!.has(e.gestion ?? 'sin dato'))
  }
  if (filtros.localidadActiva) {
    resultado = resultado.filter((e) => (e.localidad ?? 'sin dato') === filtros.localidadActiva)
  }
  return resultado
}

export function filtrarYOrdenarEspacios(
  espacios: Espacio[],
  filtros: FiltrosEspacios,
  orden: Orden,
): Espacio[] {
  return ordenarEspacios(filtrarEspacios(espacios, filtros), orden)
}
