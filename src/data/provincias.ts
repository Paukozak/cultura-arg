import type { Feature, FeatureCollection, Geometry } from 'geojson'
import raw from './provincias-resumen.json'

export interface ProvinciaProperties {
  id: string
  nombre: string
  nombreCompleto: string
  poblacion: number | null
  totalEspacios: number
  porCategoria: Record<string, number>
  categoriasPredominantes: string[]
  densidadPor100k: number | null
}

export type ProvinciaFeature = Feature<Geometry, ProvinciaProperties>

export const provinciasGeo = raw as unknown as FeatureCollection<
  Geometry,
  ProvinciaProperties
>
