#!/usr/bin/env node
/**
 * Descarga los CSV de SInCA (datos.cultura.gob.ar) y el GeoJSON de
 * provincias y departamentos de Georef (apis.datos.gob.ar) a /data/raw. Si
 * no hay acceso de red a esos dominios, no inventa nada: falla con
 * instrucciones para colocar los archivos manualmente.
 *
 * La población por departamento (Censo 2022) es un pipeline aparte —
 * ver `scripts/fetch-poblacion-departamentos.mjs` — porque no hay un
 * cuadro nacional único como `provincias.geojson`, sino 24 archivos por
 * provincia.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SINCA_RESOURCES,
  GEOREF_PROVINCIAS_URL,
  GEOREF_DEPARTAMENTOS_URL,
} from './lib/sinca-sources.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_DIR = path.join(__dirname, '..', 'data', 'raw')
const SINCA_DIR = path.join(RAW_DIR, 'sinca')

async function download(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar ${url}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(destPath, buf)
  return buf.length
}

async function main() {
  await mkdir(SINCA_DIR, { recursive: true })

  const failed = []

  for (const resource of SINCA_RESOURCES) {
    const dest = path.join(SINCA_DIR, `${resource.slug}.csv`)
    try {
      const bytes = await download(resource.url, dest)
      console.log(`OK  ${resource.slug}.csv (${bytes} bytes)`)
    } catch (err) {
      console.error(`FALLÓ ${resource.slug}.csv: ${err.message}`)
      failed.push({ ...resource, dest })
    }
  }

  const geojsonDest = path.join(RAW_DIR, 'provincias.geojson')
  try {
    const bytes = await download(GEOREF_PROVINCIAS_URL, geojsonDest)
    console.log(`OK  provincias.geojson (${bytes} bytes)`)
  } catch (err) {
    console.error(`FALLÓ provincias.geojson: ${err.message}`)
    failed.push({
      slug: 'provincias',
      url: GEOREF_PROVINCIAS_URL,
      dest: geojsonDest,
    })
  }

  const departamentosDest = path.join(RAW_DIR, 'departamentos.geojson')
  try {
    const bytes = await download(GEOREF_DEPARTAMENTOS_URL, departamentosDest)
    console.log(`OK  departamentos.geojson (${bytes} bytes)`)
  } catch (err) {
    console.error(`FALLÓ departamentos.geojson: ${err.message}`)
    failed.push({
      slug: 'departamentos',
      url: GEOREF_DEPARTAMENTOS_URL,
      dest: departamentosDest,
    })
  }

  if (failed.length) {
    console.error('\n--- No se pudo completar la descarga ---')
    console.error(
      'No hay acceso de red a alguna de las fuentes, o cambiaron de URL. ' +
        'Sin estos archivos el pipeline no puede seguir (no se generan datos de relleno).\n' +
        'Descargalos manualmente y colocalos en estas rutas exactas:\n',
    )
    for (const f of failed) {
      console.error(`  - ${f.url}\n    -> ${f.dest}`)
    }
    console.error('\nUna vez colocados, corré: node scripts/process-data.mjs')
    process.exit(1)
  }

  console.log('\nDescarga completa. Ahora corré: node scripts/process-data.mjs')
}

main()
