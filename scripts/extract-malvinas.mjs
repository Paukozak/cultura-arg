#!/usr/bin/env node
/**
 * Extrae la geometría de las Islas Malvinas del GeoJSON crudo de Georef
 * (vienen como parte del MultiPolygon de la provincia 94, junto con la Isla
 * Grande de Tierra del Fuego, el sector antártico y otros archipiélagos del
 * Atlántico Sur — ver `dropRemoteParts` en process-data.mjs, que las
 * descarta del mapa interactivo por no tener espacios culturales en el
 * dataset de SInCA).
 *
 * Esto es un script aparte de process-data.mjs (no un paso más del
 * pipeline principal) porque el resultado es puramente decorativo: una
 * ficha gris, no interactiva, sin datos de espacios asociados.
 *
 * Entrada:  /data/raw/provincias.geojson
 * Salida:   /src/data/malvinas.json
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import simplify from '@turf/simplify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// Mismos valores que SIMPLIFY_TOLERANCE en process-data.mjs, para que el
// trazo "low-poly" de las Malvinas combine con el resto del mapa.
const SIMPLIFY_TOLERANCE = 0.05
// Islotes con el lado más largo de su bounding box menor a esto (en grados)
// se descartan — mismo umbral y misma razón que MIN_PART_SPAN_DEG en
// process-data.mjs (triángulos casi degenerados tras simplificar). Quedan
// las dos islas principales (Gran Malvina y Soledad) y los islotes más
// grandes alrededor.
const MIN_PART_SPAN_DEG = 0.1
// Bounding box que separa las partes "Malvinas" del resto del MultiPolygon
// de la provincia 94 (Isla Grande, sector antártico, Georgias del Sur,
// Shetland del Sur, etc. quedan todos fuera de esto).
const MALVINAS_BBOX = {
  minLat: -53.5,
  maxLat: -50.5,
  minLon: -62.5,
  maxLon: -56.5,
}

function ringBounds(ring) {
  let minLat = 90
  let maxLat = -90
  let minLon = 180
  let maxLon = -180
  for (const [lon, lat] of ring) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
  }
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    span: Math.max(maxLat - minLat, maxLon - minLon),
  }
}

async function main() {
  const geojsonRaw = JSON.parse(
    await readFile(
      path.join(ROOT, 'data', 'raw', 'provincias.geojson'),
      'utf-8',
    ),
  )
  const tdf = geojsonRaw.features.find((f) => f.properties.id === '94')
  if (!tdf)
    throw new Error('No se encontró la provincia 94 en el GeoJSON crudo')

  const parts = tdf.geometry.coordinates.filter((part) => {
    const b = ringBounds(part[0])
    return (
      b.minLat >= MALVINAS_BBOX.minLat &&
      b.maxLat <= MALVINAS_BBOX.maxLat &&
      b.minLon >= MALVINAS_BBOX.minLon &&
      b.maxLon <= MALVINAS_BBOX.maxLon &&
      b.span >= MIN_PART_SPAN_DEG
    )
  })

  if (parts.length === 0)
    throw new Error('No se encontraron partes de Malvinas')

  const simplified = simplify(
    {
      type: 'Feature',
      properties: { id: 'malvinas', nombre: 'Islas Malvinas' },
      geometry: { type: 'MultiPolygon', coordinates: parts },
    },
    { tolerance: SIMPLIFY_TOLERANCE, highQuality: true },
  )

  // Islotes que la simplificación redujo a un triángulo casi degenerado (4
  // puntos: 3 vértices + cierre) se descartan acá, después de simplificar
  // -- no antes, porque el span en grados no predice cuáles van a colapsar.
  // Mismo problema documentado en process-data.mjs junto a MIN_PART_SPAN_DEG:
  // un anillo así confunde el cálculo de límites esférico de d3-geo.
  const sinTriangulos = simplified.geometry.coordinates.filter(
    (part) => part[0].length > 4,
  )

  const geometry = { type: 'MultiPolygon', coordinates: sinTriangulos }
  const out = { ...simplified, geometry }

  const outPath = path.join(ROOT, 'src', 'data', 'malvinas.json')
  await writeFile(outPath, JSON.stringify(out))
  console.log(
    `Malvinas: ${parts.length} partes -> ${simplified.geometry.coordinates.length} tras simplificar -> ${sinTriangulos.length} sin triángulos degenerados. Escrito en ${path.relative(ROOT, outPath)}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
