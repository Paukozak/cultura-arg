import type { Espacio } from '../../data/espacios'
import destacadosCurados from '../../data/destacados-curados.json'

export interface EntradaCurada {
  id: string
  nombreMostrado?: string
  /** Foto elegida a mano para este destacado (ver public/fotos-destacados/),
   * ruta relativa a la raíz pública. Si no está, el espacio no muestra foto
   * (ver curaduriaDestacados.ts / EspacioFoto). */
  foto?: string
}

const CURADOS = destacadosCurados.porProvincia as Record<
  string,
  EntradaCurada[]
>

/**
 * Devuelve los espacios destacados de una provincia según la curaduría
 * editorial (ver src/data/destacados-curados.json): una lista fija de ids
 * reales de SInCA por provincia, acordada a mano con el usuario en vez de
 * derivarse de un criterio automático (categoría más presente + año más
 * antiguo, el enfoque original de esta etapa). Si un id curado ya no existe
 * en los datos de la provincia (por ejemplo tras una regeneración del
 * pipeline), se omite en silencio en vez de romper el panel.
 */
export function getDestacados(
  provinciaId: string,
  espacios: Espacio[],
  curadosPorProvincia: Record<string, EntradaCurada[]> = CURADOS,
): Espacio[] {
  const curados = curadosPorProvincia[provinciaId] ?? []
  const porId = new Map(espacios.map((e) => [e.id, e]))

  const resultado: Espacio[] = []
  for (const entrada of curados) {
    const espacio = porId.get(entrada.id)
    if (!espacio) continue
    resultado.push(
      entrada.nombreMostrado
        ? { ...espacio, nombre: entrada.nombreMostrado }
        : espacio,
    )
  }
  return resultado
}
