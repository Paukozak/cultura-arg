#!/usr/bin/env node
/**
 * Genera dos variantes WebP (480px y 960px de ancho) de cada foto curada de
 * public/fotos-destacados/ — `<nombre>-480.webp` y `<nombre>-960.webp` — para
 * servirlas con `srcset` (ver EspacioFoto.tsx). El .jpg original queda como
 * fallback/`src`. Idempotente: se saltea las variantes ya generadas y más
 * nuevas que su original. Correr con `npm run fotos:variantes` tras sumar
 * una foto nueva.
 */
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'fotos-destacados',
)
const ANCHOS = [480, 960]
const CALIDAD_WEBP = 78

const esOriginal = (f) => /\.jpe?g$/i.test(f)

async function existeMasNuevo(ruta, mtimeOriginal) {
  try {
    return (await stat(ruta)).mtimeMs >= mtimeOriginal
  } catch {
    return false
  }
}

let generadas = 0
let bytes = 0
for (const archivo of (await readdir(DIR)).filter(esOriginal)) {
  const origen = path.join(DIR, archivo)
  const { mtimeMs } = await stat(origen)
  const base = path.parse(archivo).name
  for (const ancho of ANCHOS) {
    const destino = path.join(DIR, `${base}-${ancho}.webp`)
    if (await existeMasNuevo(destino, mtimeMs)) continue
    const info = await sharp(origen)
      .rotate()
      .resize({ width: ancho, withoutEnlargement: true })
      .webp({ quality: CALIDAD_WEBP })
      .toFile(destino)
    generadas++
    bytes += info.size
  }
}
console.log(
  `${generadas} variantes generadas (${(bytes / 1024 / 1024).toFixed(1)} MB)`,
)
