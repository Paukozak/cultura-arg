import archivosFotos from 'virtual:fotos-destacados'
import destacadosCurados from '../../data/destacados-curados.json'
import type { EntradaCurada } from './getDestacados'

/** Ruta real de una foto curada, buscándola por nombre e ignorando extensión
 * y mayúsculas (ver el plugin en vite.config.ts para el porqué). `archivos`
 * es la lista de archivos de public/fotos-destacados/ (clave: nombre sin
 * extensión, en minúscula). Si no hay ningún archivo con ese nombre se
 * devuelve la ruta tal cual: no se oculta el error, la foto va a dar 404 como
 * antes. */
export function resolverFoto(
  foto: string,
  archivos: Record<string, string> = archivosFotos,
): string {
  const clave = (foto.split('/').pop() ?? foto)
    .replace(/\.[^.]*$/, '')
    .toLowerCase()
  const real = archivos[clave]
  if (!real) return foto
  const carpeta = foto.includes('/') ? foto.slice(0, foto.lastIndexOf('/')) : ''
  return carpeta ? `${carpeta}/${real}` : real
}

const TODAS_LAS_ENTRADAS = Object.values(
  destacadosCurados.porProvincia as Record<string, EntradaCurada[]>,
).flat()

const FOTOS_POR_ID = new Map(
  TODAS_LAS_ENTRADAS.filter((e): e is EntradaCurada & { foto: string } =>
    Boolean(e.foto),
  ).map((e) => [e.id, resolverFoto(e.foto)]),
)

const NOMBRES_POR_ID = new Map(
  TODAS_LAS_ENTRADAS.filter(
    (e): e is EntradaCurada & { nombreMostrado: string } =>
      Boolean(e.nombreMostrado),
  ).map((e) => [e.id, e.nombreMostrado]),
)

/** Foto elegida a mano para un destacado (ver destacados-curados.json), si
 * existe. Solo cubre los ~120 destacados curados — el resto de los espacios
 * no muestra foto. */
export function fotoCuradaPara(espacioId: string): string | null {
  return FOTOS_POR_ID.get(espacioId) ?? null
}

/** Nombre editorial elegido a mano para un destacado (p. ej. para corregir
 * un typo de la fuente o preferir el nombre actual de un lugar), si existe.
 * Antes solo se aplicaba en el panel de destacados (vía getDestacados); esta
 * función deja aplicarlo también donde se muestra el espacio "suelto" (la
 * ficha de la vista completa), para que el nombre sea el mismo en todos
 * lados. */
export function nombreMostradoPara(espacioId: string): string | null {
  return NOMBRES_POR_ID.get(espacioId) ?? null
}
