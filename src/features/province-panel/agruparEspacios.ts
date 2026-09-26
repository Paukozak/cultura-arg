import type { Espacio } from '../../data/espacios'
import { normalizar } from '../../utils/texto'

/** Extraída de ProvinceFullView.tsx para poder testearla sin montar el
 * componente (mismo criterio que filtrarEspacios.ts) — es la lógica del
 * filtro de "Localidad"/"Departamento"/"Comuna" del panel de una provincia:
 * se puede agrupar por localidad o por departamento (`departamentoId`,
 * elegible con un toggle). En CABA el modo queda forzado en 'departamento'
 * (mostrado como "Comuna", sin selector), porque SInCA no distingue
 * localidades ahí (todos sus espacios comparten una sola, "Ciudad Autónoma
 * de Buenos Aires" — ver `forzarLocalidadCaba` en process-data.mjs). */

/** Qué campo del espacio arma la clave de agrupación: `departamento`
 * (`departamentoId`, comuna incluida) o `localidad`. En CABA siempre es
 * `'departamento'` (forzado, sin selector — ver `ProvinceFullView`); en el
 * resto de las provincias es elegible con un toggle Localidad/Departamento. */
export type ModoAgrupador = 'localidad' | 'departamento'

export interface OpcionAgrupador {
  /** Lo que se guarda en `agrupadorActivo` y lo que compara el filtro real
   * (`departamentosActivos`/`localidadesActivas` en filtrarEspacios.ts). */
  clave: string
  /** Lo que se muestra en el picker. Igual a `clave` salvo en modo
   * `'departamento'`, donde `clave` es un `departamentoId` (p. ej. "02007")
   * y `etiqueta` es el nombre legible del departamento/comuna (p. ej.
   * "Comuna 1"). */
  etiqueta: string
  count: number
}

/** Clave de agrupación de un espacio: `departamentoId` en modo
 * `'departamento'`, `localidad` en modo `'localidad'`. A propósito NO se
 * "limpia" acá (p. ej. mapear el placeholder `02000` de CABA a otra cosa):
 * tiene que ser la MISMA clave cruda que compara `filtrarEspacios` — si
 * difirieran, tildar una opción del picker no filtraría nada (bug real que
 * motivó este archivo: la clave sintética `'sin-comuna'` no coincidía con
 * el `departamentoId` real `'02000'` que compara el filtro, así que esa
 * opción siempre daba 0 resultados). El rótulo lindo se resuelve aparte, en
 * `opcionesAgrupador`, solo para mostrar. */
export function claveAgrupador(espacio: Espacio, modo: ModoAgrupador): string {
  return modo === 'departamento'
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
 * `claveAgrupador` (según `modo`), con su conteo. En modo `'departamento'`,
 * la etiqueta es el nombre real del departamento/comuna
 * (`nombrePorDepartamentoId`) o "Sin comuna" si la clave no resuelve a
 * ninguna (el placeholder `02000` de los espacios de CABA sin coordenadas
 * confiables que `asignarComunasCaba`, en process-data.mjs, no pudo
 * geocodificar). El orden numérico ("Comuna 1".."Comuna 15" en vez de
 * alfabético) es específico de CABA, no de "modo departamento" en general:
 * hay departamentos reales que arrancan con un número (p. ej. "9 de Julio"
 * en Buenos Aires) y se romperían con esa regla — por eso `esCaba` se pasa
 * aparte de `modo`, solo para decidir el orden.
 *
 * `departamentosDeProvincia` (solo relevante en modo `'departamento'`): los
 * ids de TODOS los departamentos de la provincia según
 * `departamentos-resumen.json`, no solo los que tienen espacios cargados —
 * sin esto, un departamento con 0 espacios (p. ej. Ramón Lista en Formosa)
 * no tendría ninguna clave que contar y quedaría afuera del picker aunque
 * el choropleth sí lo pinte. En modo `'localidad'` no hay equivalente (no
 * existe un padrón de localidades del país en el proyecto, solo las que ya
 * aparecen en algún espacio), así que ahí este parámetro no se usa. */
export function opcionesAgrupador(
  espacios: Espacio[],
  modo: ModoAgrupador,
  esCaba: boolean,
  nombrePorDepartamentoId: Map<string, string>,
  departamentosDeProvincia: string[] = [],
): OpcionAgrupador[] {
  const conteo = new Map<string, number>()
  if (modo === 'departamento') {
    for (const id of departamentosDeProvincia) conteo.set(id, 0)
  }
  for (const e of espacios) {
    const clave = claveAgrupador(e, modo)
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
  }
  const opciones = [...conteo.entries()].map(([clave, count]) => ({
    clave,
    etiqueta:
      modo === 'departamento'
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
  modo: ModoAgrupador,
): Espacio[] {
  if (!agrupadorActivo) return espacios
  return espacios.filter((e) => agrupadorActivo.has(claveAgrupador(e, modo)))
}
