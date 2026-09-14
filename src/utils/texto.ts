/** Minúsculas y sin acentos, para comparar texto ingresado por el usuario
 * contra nombres reales sin que un acento de menos rompa la búsqueda. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
