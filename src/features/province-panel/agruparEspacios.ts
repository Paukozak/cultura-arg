import type { Espacio } from '../../data/espacios'
import { normalizar } from '../../utils/texto'

/** Extraída de ProvinceFullView.tsx para poder testearla sin montar el
 * componente (mismo criterio que filtrarEspacios.ts) — es la lógica del
 * filtro de "Localidad"/"Comuna" del panel de una provincia: en CABA se
 * agrupa por comuna en vez de por localidad, porque SInCA no distingue
 * localidades ahí (todos sus espacios comparten una sola, "Ciudad Autónoma
 * de Buenos Aires" — ver `forzarLocalidadCaba` en process-data.mjs). */

export interface OpcionAgrupador {
  /** Lo que se guarda en `agrupadorActivo` y lo que compara el filtro real
   * (`departamentosActivos`/`localidadesActivas` en filtrarEspacios.ts). */
  clave: string
  /** Lo que se muestra en el picker. Igual a `clave` salvo en CABA, donde
   * `clave` es un `departamentoId` (p. ej. "02007") y `etiqueta` es el
   * nombre legible de la comuna (p. ej. "Comuna 1"). */
  etiqueta: string
  count: number
}

/** Clave de agrupación de un espacio: `departamentoId` (comuna) en CABA,
 * `localidad` en el resto. A propósito NO se "limpia" acá (p. ej. mapear el
 * placeholder `02000` de CABA a otra cosa): tiene que ser la MISMA clave
 * cruda que compara `filtrarEspacios` — si difirieran, tildar una opción
 * del picker no filtraría nada (bug real que motivó este archivo: la clave
 * sintética `'sin-comuna'` no coincidía con el `departamentoId` real
 * `'02000'` que compara el filtro, así que esa opción siempre daba 0
 * resultados). El rótulo lindo se resuelve aparte, en `opcionesAgrupador`,
 * solo para mostrar. */
export function claveAgrupador(espacio: Espacio, esCaba: boolean): string {
  return esCaba
    ? (espacio.departamentoId ?? 'sin dato')
    : (espacio.localidad ?? 'sin dato')
}

/** El número dentro de una etiqueta "Comuna N", para ordenar el filtro de
 * CABA de menor a mayor en vez de alfabéticamente ("Comuna 10" ordenado
 * alfabéticamente cae antes que "Comuna 2"). `null` si la etiqueta no trae
 * ningún número (hoy, "Sin comuna"). */
export function numeroComuna(etiqueta: string): number | null {
  const match = etiqueta.match(/\d+/)
  return match ? Number(match[0]) : null
}

/** Arma las opciones del picker: una fila por clave distinta de
 * `claveAgrupador`, con su conteo. En CABA, la etiqueta es el nombre real
 * de la comuna (`nombrePorDepartamentoId`) o "Sin comuna" si la clave no
 * resuelve a ninguna (el placeholder `02000` de los espacios sin
 * coordenadas confiables que `asignarComunasCaba`, en process-data.mjs, no
 * pudo geocodificar). Ordenadas de menor a mayor por número de comuna en
 * CABA ("Sin comuna", sin número, siempre al final); alfabéticamente en el
 * resto. */
export function opcionesAgrupador(
  espacios: Espacio[],
  esCaba: boolean,
  nombrePorDepartamentoId: Map<string, string>,
): OpcionAgrupador[] {
  const conteo = new Map<string, number>()
  for (const e of espacios) {
    const clave = claveAgrupador(e, esCaba)
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
  }
  const opciones = [...conteo.entries()].map(([clave, count]) => ({
    clave,
    etiqueta: esCaba
      ? (nombrePorDepartamentoId.get(clave) ?? 'Sin comuna')
      : clave,
    count,
  }))
  return opciones.sort((a, b) =>
    esCaba
      ? (numeroComuna(a.etiqueta) ?? Infinity) -
        (numeroComuna(b.etiqueta) ?? Infinity)
      : a.etiqueta.localeCompare(b.etiqueta, 'es'),
  )
}

/** Texto del gatillo del picker (plegado): qué está eligiendo sin tener que
 * abrirlo. Mismo criterio de "todas" que categoría/gestión — un Set que
 * terminó incluyendo a todas las opciones cuenta como "todas", no como "3
 * de 3". */
export function resumenAgrupador(
  agrupadorActivo: Set<string> | null,
  opciones: OpcionAgrupador[],
): string {
  if (!agrupadorActivo) return `Todas (${opciones.length})`
  if (agrupadorActivo.size === 0) return 'Ninguna'
  if (agrupadorActivo.size === opciones.length)
    return `Todas (${opciones.length})`
  const primera = opciones.find((o) => agrupadorActivo.has(o.clave))?.etiqueta
  return agrupadorActivo.size === 1
    ? (primera ?? '')
    : `${primera ?? ''} +${agrupadorActivo.size - 1}`
}

/** Opciones que quedan tras filtrar por el texto del buscador propio del
 * picker (no confundir con la búsqueda de espacios, que es otro campo). */
export function opcionesMostradas(
  opciones: OpcionAgrupador[],
  busqueda: string,
): OpcionAgrupador[] {
  const q = normalizar(busqueda.trim())
  if (!q) return opciones
  return opciones.filter((o) => normalizar(o.etiqueta).includes(q))
}

/** Espacios recortados por la(s) clave(s) activa(s) del agrupador — base
 * para los conteos de categoría/gestión (ver `ProvinceFullView`, que solo
 * recorta esos conteos por localidad/comuna, nunca entre sí). */
export function espaciosDeAgrupador(
  espacios: Espacio[],
  agrupadorActivo: Set<string> | null,
  esCaba: boolean,
): Espacio[] {
  if (!agrupadorActivo) return espacios
  return espacios.filter((e) => agrupadorActivo.has(claveAgrupador(e, esCaba)))
}
