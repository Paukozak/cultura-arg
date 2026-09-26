import { useEffect, useState } from 'react'
import { cargarEspacios, type Espacio } from './espacios'

type Estado =
  | { provinciaId: string; tipo: 'listo'; espacios: Espacio[] }
  | { provinciaId: string; tipo: 'error' }

/** Carga (lazy, cacheada por el import dinámico) los espacios de una
 * provincia. Compartido entre el panel lateral y los pines del mapa
 * nacional para no duplicar la lógica de carga/cancelación. */
export function useEspacios(provinciaId: string | null): {
  espacios: Espacio[] | null
  error: boolean
  reintentar: () => void
} {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!provinciaId) return
    let cancelado = false
    cargarEspacios(provinciaId)
      .then((data) => {
        if (!cancelado)
          setEstado({ provinciaId, tipo: 'listo', espacios: data })
      })
      .catch(() => {
        if (!cancelado) setEstado({ provinciaId, tipo: 'error' })
      })
    return () => {
      cancelado = true
    }
  }, [provinciaId, intento])

  // Derivado, no reseteado a mano: si el estado guardado es de una
  // provincia distinta a la pedida (todavía cargando la nueva, o cambió
  // antes de que termine), se ignora en vez de mostrar por un instante los
  // datos/error viejos.
  const vigente = estado?.provinciaId === provinciaId ? estado : null

  return {
    espacios: vigente?.tipo === 'listo' ? vigente.espacios : null,
    error: vigente?.tipo === 'error',
    reintentar: () => setIntento((n) => n + 1),
  }
}
