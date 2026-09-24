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
      return arr.sort((a, b) =>
        (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'),
      )
    case 'anio-asc':
      return arr.sort(
        (a, b) =>
          (a.anioInauguracion ?? Infinity) - (b.anioInauguracion ?? Infinity),
      )
    case 'anio-desc':
      return arr.sort(
        (a, b) =>
          (b.anioInauguracion ?? -Infinity) - (a.anioInauguracion ?? -Infinity),
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
   * `'sin dato'`, la misma que arma la UI para esos chips/opciones. Igual
   * que `categoriasActivas`: un Set (aunque esté vacío) filtra a esas
   * localidades puntuales, permitiendo elegir más de una a la vez. */
  localidadesActivas?: Set<string> | null
  /** Filtra por `departamentoId` en vez de localidad — hoy solo lo usa CABA
   * (ver ProvinceFullView): ahí todos los espacios comparten una única
   * localidad ("Ciudad Autónoma de Buenos Aires", ver `forzarLocalidadCaba`
   * en process-data.mjs), así que filtrar por localidad no distingue nada
   * — se reemplaza por comuna. Mutuamente excluyente con
   * `localidadesActivas` en la práctica (ProvinceFullView solo pasa uno de
   * los dos), pero acá no se hace cumplir: son dos filtros independientes
   * que, si vinieran los dos, se combinan con AND como cualquier otro par. */
  departamentosActivos?: Set<string> | null
}

export function filtrarEspacios(
  espacios: Espacio[],
  filtros: FiltrosEspacios,
): Espacio[] {
  const q = normalizar((filtros.busqueda ?? '').trim())
  let resultado = espacios
  if (q) {
    resultado = resultado.filter(
      (e) =>
        normalizar(e.nombre ?? '').includes(q) ||
        normalizar(e.localidad ?? '').includes(q),
    )
  }
  if (filtros.categoriasActivas) {
    resultado = resultado.filter((e) =>
      filtros.categoriasActivas!.has(e.categoria),
    )
  }
  if (filtros.gestionesActivas) {
    resultado = resultado.filter((e) =>
      filtros.gestionesActivas!.has(e.gestion ?? 'sin dato'),
    )
  }
  if (filtros.localidadesActivas) {
    resultado = resultado.filter((e) =>
      filtros.localidadesActivas!.has(e.localidad ?? 'sin dato'),
    )
  }
  if (filtros.departamentosActivos) {
    resultado = resultado.filter((e) =>
      filtros.departamentosActivos!.has(e.departamentoId ?? 'sin dato'),
    )
  }
  return resultado
}

/** Si `filtrarEspacios` está recortando la lista con estos filtros. Usa los
 * mismos criterios que ella (búsqueda sin espacios sobrantes; un Set cuenta
 * aunque esté vacío) para que el aviso de "hay filtros aplicados" con los
 * filtros plegados no pueda contradecir lo que realmente se filtra. */
export function hayFiltrosAplicados(filtros: FiltrosEspacios): boolean {
  return (
    (filtros.busqueda ?? '').trim() !== '' ||
    filtros.categoriasActivas != null ||
    filtros.gestionesActivas != null ||
    filtros.localidadesActivas != null ||
    filtros.departamentosActivos != null
  )
}

/** Texto del botón que cierra los filtros en mobile. */
export function etiquetaVerEspacios(cantidad: number): string {
  if (cantidad === 0) return 'Sin resultados · cerrar filtros'
  return `Ver ${cantidad} ${cantidad === 1 ? 'espacio' : 'espacios'}`
}

export function filtrarYOrdenarEspacios(
  espacios: Espacio[],
  filtros: FiltrosEspacios,
  orden: Orden,
): Espacio[] {
  return ordenarEspacios(filtrarEspacios(espacios, filtros), orden)
}

/** Alterna un valor puntual dentro de un filtro "Todas o algunos"
 * (categoría/gestión/localidad, en ProvinceFullView.tsx): el chip "Todas"
 * (`null`) es excluyente con cualquier valor puntual, así que elegir uno
 * estando en "Todas" arranca una selección nueva con solo ese; si ya había
 * una selección puntual, se suma/saca de ahí como cualquier multi-select. */
export function alternarValorFiltro(
  activos: Set<string> | null,
  valor: string,
): Set<string> {
  if (activos === null) return new Set([valor])
  const siguiente = new Set(activos)
  if (siguiente.has(valor)) siguiente.delete(valor)
  else siguiente.add(valor)
  return siguiente
}

/** Alterna el propio chip/checkbox "Todas": si ya está marcado (`null`),
 * pasa a un Set vacío (ningún valor puntual seleccionado, "Ninguna" a
 * propósito); si no, vuelve a "Todas". No hay forma implícita de volver a
 * "Todas" salvo marcándolo de nuevo. */
export function alternarTodos(activos: Set<string> | null): Set<string> | null {
  return activos === null ? new Set() : null
}
