import { useEffect, useState } from 'react'
import type { FeatureCollection, Geometry } from 'geojson'
import { cargarDepartamentos, type DepartamentoProperties } from './departamentos'

/** Carga (lazy, cacheada por el import dinámico) los departamentos de una
 * provincia — mismo patrón que `useEspacios`. */
export function useDepartamentos(
  provinciaId: string | null,
): FeatureCollection<Geometry, DepartamentoProperties> | null {
  const [resultado, setResultado] = useState<{
    provinciaId: string
    datos: FeatureCollection<Geometry, DepartamentoProperties>
  } | null>(null)

  useEffect(() => {
    if (!provinciaId) return
    let cancelado = false
    cargarDepartamentos(provinciaId).then((datos) => {
      if (!cancelado) setResultado({ provinciaId, datos })
    })
    return () => {
      cancelado = true
    }
  }, [provinciaId])

  // Derivado, no reseteado a mano: si el resultado guardado es de una
  // provincia distinta a la pedida (todavía cargando la nueva), se
  // devuelve null en vez de mostrar por un instante los datos viejos.
  if (!provinciaId || resultado?.provinciaId !== provinciaId) return null
  return resultado.datos
}
