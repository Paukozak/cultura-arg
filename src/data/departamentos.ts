import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { sinHuecosMinusculos } from './limpiarGeometria'
import resumenRaw from './departamentos-resumen.json'

export interface DepartamentoProperties {
  id: string
  provinciaId: string
  nombre: string
  poblacion: number | null
  totalEspacios: number
  porCategoria: Record<string, number>
  categoriasPredominantes: string[]
  densidadPor100k: number | null
}

export type DepartamentoFeature = Feature<Geometry, DepartamentoProperties>

/** Propiedades (sin geometría) de los ~529 departamentos del país, cargadas
 * eager: hace falta conocer la distribución completa de totalEspacios/
 * densidadPor100k para construir la escala de color del choropleth por
 * departamento ANTES de zoomear a ninguna provincia en particular — si la
 * escala se armara solo con los departamentos de la provincia ya cargada,
 * el color de un mismo departamento cambiaría según qué otras provincias
 * se visitaron antes. La geometría (mucho más pesada, ver `cargarDepartamentos`)
 * se carga lazy, una provincia a la vez. */
export const departamentosResumen = resumenRaw as DepartamentoProperties[]

/** Carga diferida (lazy, cacheada por el import dinámico) de la geometría de
 * los departamentos de una provincia — ver scripts/process-data.mjs, un
 * archivo por provincia igual que `cargarEspacios`. Se usa recién al
 * zoomear a esa provincia, nunca las 24 de una. */
export async function cargarDepartamentos(
  provinciaId: string,
): Promise<FeatureCollection<Geometry, DepartamentoProperties>> {
  const mod = (await import(`./departamentos/${provinciaId}.json`)) as {
    default: FeatureCollection<Geometry, DepartamentoProperties>
  }
  return {
    ...mod.default,
    features: mod.default.features.map((f) => ({
      ...f,
      geometry: sinHuecosMinusculos(f.geometry),
    })),
  }
}
