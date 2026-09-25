// scripts/comprimir-fotos-destacados.mjs
// Recomprime las fotos de public/fotos-destacados/: vienen directo de cámara/
// celular, varias pesando 2-3MB, para mostrarse como miniaturas de 144px o
// fichas de 384px de alto. Achica el lado más largo a 1600px (cubre pantallas
// retina sin desperdiciar) y reencodea en JPEG calidad 78. El plugin de Vite
// (fotosDestacadosPlugin en vite.config.ts) resuelve el nombre real del
// archivo en runtime por nombre sin extensión, así que convertir un .png o
// .jpeg a .jpg acá no rompe nada en destacados-curados.json.
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.join(process.cwd(), 'public', 'fotos-destacados')

let antes = 0
let despues = 0

for (const archivo of readdirSync(DIR)) {
  const rutaOriginal = path.join(DIR, archivo)
  const base = path.parse(archivo).name
  const rutaNueva = path.join(DIR, `${base}.jpg`)

  const entrada = readFileSync(rutaOriginal)
  antes += entrada.length

  const buffer = await sharp(entrada)
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer()

  if (rutaOriginal !== rutaNueva) rmSync(rutaOriginal)
  writeFileSync(rutaNueva, buffer)
  despues += buffer.length
}

console.log(`Antes:   ${(antes / 1024 / 1024).toFixed(1)} MB`)
console.log(`Después: ${(despues / 1024 / 1024).toFixed(1)} MB`)
