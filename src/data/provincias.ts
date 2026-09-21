import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { sinHuecosMinusculos } from './limpiarGeometria'
import raw from './provincias-resumen.json'
import rawDetalle from './provincias-detalle.json'

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

const resumenGeo = raw as unknown as FeatureCollection<
  Geometry,
  ProvinciaProperties
>

// Sin los huecos de subpíxel (ver `AREA_MINIMA_HUECO`): dibujados, dejaban un
// filamento vertical oscuro dentro de Corrientes.
export const provinciasGeo: FeatureCollection<Geometry, ProvinciaProperties> = {
  ...resumenGeo,
  features: resumenGeo.features.map((f) => ({
    ...f,
    geometry: sinHuecosMinusculos(f.geometry),
  })),
}

/** Suma de espacios culturales de todas las provincias (para los textos de
 * bienvenida). */
export const TOTAL_ESPACIOS = provinciasGeo.features.reduce(
  (suma, f) => suma + f.properties.totalEspacios,
  0,
)

// Geometría con mucho más detalle que la del mapa nacional (ver
// scripts/process-data.mjs) — la nacional usa un trazo "low-poly" a
// propósito, que a escala país es invisible pero queda groseramente
// desalineado de la frontera real al hacer zoom a una sola provincia
// (Etapa 6). Se usa únicamente para la provincia zoomeada.
const detalleGeo = rawDetalle as unknown as FeatureCollection<Geometry, { id: string }>
const GEOMETRIA_DETALLE_POR_ID = new Map(
  detalleGeo.features.map((f) => [
    f.properties.id,
    sinHuecosMinusculos(f.geometry),
  ]),
)

export function geometriaDetalle(provinciaId: string): Geometry | null {
  return GEOMETRIA_DETALLE_POR_ID.get(provinciaId) ?? null
}
