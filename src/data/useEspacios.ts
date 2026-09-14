import { useEffect, useState } from 'react'
import { cargarEspacios, type Espacio } from './espacios'

/** Carga (lazy, cacheada por el import dinámico) los espacios de una
 * provincia. Compartido entre el panel lateral y los pines del mapa
 * nacional para no duplicar la lógica de carga/cancelación. */
export function useEspacios(provinciaId: string | null): Espacio[] | null {
  const [resultado, setResultado] = useState<{ provinciaId: string; espacios: Espacio[] } | null>(
    null,
  )

  useEffect(() => {
    if (!provinciaId) return
    let cancelado = false
    cargarEspacios(provinciaId).then((data) => {
      if (!cancelado) setResultado({ provinciaId, espacios: data })
    })
    return () => {
      cancelado = true
    }
  }, [provinciaId])

  // Derivado, no reseteado a mano: si el resultado guardado es de una
  // provincia distinta a la pedida (todavía cargando la nueva), se
  // devuelve null en vez de mostrar por un instante los datos viejos.
  if (!provinciaId || resultado?.provinciaId !== provinciaId) return null
  return resultado.espacios
}
