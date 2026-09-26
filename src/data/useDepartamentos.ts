import { useEffect, useState } from 'react'
import type { FeatureCollection, Geometry } from 'geojson'
import { cargarDepartamentos, type DepartamentoProperties } from './departamentos'

type Estado =
  | {
      provinciaId: string
      tipo: 'listo'
      datos: FeatureCollection<Geometry, DepartamentoProperties>
    }
  | { provinciaId: string; tipo: 'error' }

/** Carga (lazy, cacheada por el import dinámico) los departamentos de una
 * provincia — mismo patrón que `useEspacios`. */
export function useDepartamentos(provinciaId: string | null): {
  datos: FeatureCollection<Geometry, DepartamentoProperties> | null
  error: boolean
  reintentar: () => void
} {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!provinciaId) return
    let cancelado = false
    cargarDepartamentos(provinciaId)
      .then((datos) => {
        if (!cancelado) setEstado({ provinciaId, tipo: 'listo', datos })
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
    datos: vigente?.tipo === 'listo' ? vigente.datos : null,
    error: vigente?.tipo === 'error',
    reintentar: () => setIntento((n) => n + 1),
  }
}
