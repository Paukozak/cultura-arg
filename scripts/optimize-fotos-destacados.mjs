#!/usr/bin/env node
/**
 * Redimensiona/comprime las fotos curadas de destacados en
 * public/fotos-destacados/: llegaron pesando hasta 12-13MB cada una (74MB
 * en total para 117 fotos), y en la app se muestran achicadas en tarjetas
 * de 144-224px de alto — servir el archivo original arruinaría el trabajo
 * de performance ya hecho en el panel de destacados. Achica al ancho/alto
 * máximo definido, recomprime como JPEG calidad 82 y sobrescribe el
 * archivo en el mismo lugar. Los .png se convierten a .jpg (el nombre
 * cambia, así que también hay que actualizar destacados-curados.json).
 */
import { readdir, rename, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.join(__dirname, '..', 'public', 'fotos-destacados')
const MAX_DIMENSION = 1600
// Subido de 82 a 92 (mejor calidad visible en la ficha completa, que ahora
// muestra la foto grande) — el tamaño total sigue siendo chico para la
// cantidad de fotos, así que hay margen de sobra. Esto no arregla fotos que
// ya vienen con resolución nativa baja (varias del lote actual son de
// ~300-700px de ancho, buscadas rápido de internet): subir la calidad de
// compresión no puede agregar detalle que la imagen de origen no tiene.
const CALIDAD_JPEG = 92

async function main() {
  const archivos = (await readdir(DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f))
  let totalAntes = 0
  let totalDespues = 0
  const renombrados = []

  for (const archivo of archivos) {
    const rutaOriginal = path.join(DIR, archivo)
    const { size: antes } = await stat(rutaOriginal)
    totalAntes += antes

    const esPng = /\.png$/i.test(archivo)
    const nombreFinal = esPng ? archivo.replace(/\.png$/i, '.jpg') : archivo
    const rutaFinal = path.join(DIR, nombreFinal)
    const rutaTemp = rutaFinal + '.tmp'

    await sharp(rutaOriginal)
      .rotate() // respeta la orientación EXIF antes de perderla al reescribir
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
      .toFile(rutaTemp)

    if (esPng) await unlink(rutaOriginal)
    await rename(rutaTemp, rutaFinal)

    if (esPng) renombrados.push({ de: archivo, a: nombreFinal })

    const { size: despues } = await stat(rutaFinal)
    totalDespues += despues
    console.log(
      `${archivo}${esPng ? ' -> ' + nombreFinal : ''}: ${(antes / 1024).toFixed(0)}KB -> ${(despues / 1024).toFixed(0)}KB`,
    )
  }

  console.log(`\nTotal: ${(totalAntes / 1024 / 1024).toFixed(1)}MB -> ${(totalDespues / 1024 / 1024).toFixed(1)}MB`)
  if (renombrados.length) {
    console.log('\nRenombrados (actualizar destacados-curados.json):', JSON.stringify(renombrados))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
