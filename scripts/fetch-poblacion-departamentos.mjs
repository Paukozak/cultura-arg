#!/usr/bin/env node
/**
 * Descarga los 24 cuadros provinciales del Censo 2022 (INDEC/censo.gob.ar,
 * "Cuadro 2.N. <provincia>. Total de población y densidad, por superficie,
 * según departamento") y arma un único JSON {departamentoId: poblacion2022}.
 *
 * A diferencia de `data/poblacion-provincias.json` (24 filas, cargado a
 * mano desde el cuadro nacional), acá son ~529 filas repartidas en 24
 * archivos .xlsx distintos — no hay un cuadro nacional a nivel
 * departamento, cada provincia publica el suyo. Se automatiza la descarga y
 * el parseo en vez de tipear a mano.
 *
 * Salida: /data/poblacion-departamentos.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const RAW_DIR = path.join(ROOT, 'data', 'raw', 'censo-departamentos')

// slug del archivo + índice de "Cuadro 2.N" (orden alfabético de
// jurisdicción, el mismo que usa INDEC en todos sus cuadros del Censo
// 2022) para cada provincia. Confirmado uno por uno contra
// censo.gob.ar/wp-content/uploads/2023/11/c2022_{slug}_est_c2_{n}.xlsx
// (2026-09-23) — algunos slugs no son la provincia completa
// (`bsas`, `tdf`, `santiago`) y no se pueden adivinar por patrón.
const PROVINCIAS = [
  { id: '02', slug: 'caba', n: 1 },
  { id: '06', slug: 'bsas', n: 2 },
  { id: '10', slug: 'catamarca', n: 3 },
  { id: '22', slug: 'chaco', n: 4 },
  { id: '26', slug: 'chubut', n: 5 },
  { id: '14', slug: 'cordoba', n: 6 },
  { id: '18', slug: 'corrientes', n: 7 },
  { id: '30', slug: 'entrerios', n: 8 },
  { id: '34', slug: 'formosa', n: 9 },
  { id: '38', slug: 'jujuy', n: 10 },
  { id: '42', slug: 'lapampa', n: 11 },
  { id: '46', slug: 'larioja', n: 12 },
  { id: '50', slug: 'mendoza', n: 13 },
  { id: '54', slug: 'misiones', n: 14 },
  { id: '58', slug: 'neuquen', n: 15 },
  { id: '62', slug: 'rionegro', n: 16 },
  { id: '66', slug: 'salta', n: 17 },
  { id: '70', slug: 'sanjuan', n: 18 },
  { id: '74', slug: 'sanluis', n: 19 },
  { id: '78', slug: 'santacruz', n: 20 },
  { id: '82', slug: 'santafe', n: 21 },
  { id: '86', slug: 'santiago', n: 22 },
  { id: '94', slug: 'tdf', n: 23 },
  { id: '90', slug: 'tucuman', n: 24 },
]

function urlPara(slug, n) {
  return `https://censo.gob.ar/wp-content/uploads/2023/11/c2022_${slug}_est_c2_${n}.xlsx`
}

// Si ya está en `data/raw/censo-departamentos/` (bajado a mano o en una
// corrida anterior), no se vuelve a pedir por red — 24 archivos van a
// pesar lo mismo en cada corrida del pipeline completo, no tiene sentido
// re-descargarlos cada vez (a diferencia de los CSV de SInCA, que si
// cambian queremos verlo).
async function descargar(url, destPath) {
  if (existsSync(destPath)) return readFile(destPath)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(destPath, buf)
  return buf
}

// El código de departamento viene numérico en el xlsx (pierde el cero a la
// izquierda de la provincia: CABA da `2007`, no `2007` con 5 dígitos) —
// hay que rellenarlo para que coincida con el id de Georef/departamentos
// (siempre 5 dígitos: 2 de provincia + 3 de departamento).
function idDepartamento(codigo) {
  return String(codigo).padStart(5, '0')
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true })

  const poblacion = {}
  const fallos = []

  for (const { id, slug, n } of PROVINCIAS) {
    const url = urlPara(slug, n)
    const dest = path.join(RAW_DIR, `${slug}.xlsx`)
    let buf
    try {
      buf = await descargar(url, dest)
    } catch (err) {
      console.error(`FALLÓ ${slug}: ${err.message}`)
      fallos.push({ id, slug, url })
      continue
    }

    const wb = XLSX.read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]]
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false })

    let encontrados = 0
    for (const fila of filas) {
      const [codigo, nombre, , poblacionTotal] = fila
      if (typeof codigo !== 'number' || nombre === 'Total') continue
      if (typeof poblacionTotal !== 'number') continue
      poblacion[idDepartamento(codigo)] = poblacionTotal
      encontrados++
    }
    console.log(`OK  ${slug} (${id}): ${encontrados} departamentos`)
  }

  if (fallos.length) {
    console.error('\n--- No se pudo completar la descarga ---')
    for (const f of fallos) console.error(`  - ${f.slug}: ${f.url}`)
    process.exit(1)
  }

  const out = {
    _fuente:
      'INDEC, Censo Nacional de Población, Hogares y Viviendas 2022, resultados definitivos. ' +
      'Cuadro 2.N por provincia, "Total de población y densidad, por superficie, según departamento". ' +
      'https://censo.gob.ar/wp-content/uploads/2023/11/c2022_{slug}_est_c2_{n}.xlsx (ver PROVINCIAS en ' +
      'scripts/fetch-poblacion-departamentos.mjs), consultado 2026-09-23. Columna usada: población total 2022.',
    poblacion,
  }
  const outPath = path.join(ROOT, 'data', 'poblacion-departamentos.json')
  await writeFile(outPath, JSON.stringify(out, null, 2) + '\n')
  console.log(
    `\n${Object.keys(poblacion).length} departamentos -> ${path.relative(ROOT, outPath)}`,
  )
}

main()
