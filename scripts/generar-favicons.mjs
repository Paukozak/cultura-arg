import sharp from 'sharp'

// Genera favicon.png (512x512) y favicon.ico a partir del logo fuente,
// recortando el margen transparente y centrando el sol sobre un lienzo
// cuadrado también transparente.
const FUENTE = 'scripts/assets/logo-sol.png'

const solRecortado = await sharp(FUENTE).trim({ threshold: 10 }).toBuffer()
const { width, height } = await sharp(solRecortado).metadata()

const lado = Math.round(Math.max(width, height) * 1.08)

async function lienzoCuadrado(tamano) {
  return sharp(solRecortado)
    .resize({
      width: Math.round((width / lado) * tamano),
      height: Math.round((height / lado) * tamano),
      fit: 'inside',
    })
    .toBuffer()
    .then((redimensionado) =>
      sharp({
        create: {
          width: tamano,
          height: tamano,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: redimensionado, gravity: 'center' }])
        .png()
        .toBuffer(),
    )
}

const favicon512 = await lienzoCuadrado(512)
await sharp(favicon512).toFile('public/favicon.png')
console.log('Listo: public/favicon.png')

// .ico moderno: contenedor ICO con PNGs embebidos (soportado por navegadores
// y Windows) en los tamaños estándar de favicon.
const tamanosIco = [16, 32, 48]
const pngsIco = await Promise.all(tamanosIco.map(lienzoCuadrado))

function construirIco(pngs, tamanos) {
  const cantidad = pngs.length
  const cabecera = Buffer.alloc(6)
  cabecera.writeUInt16LE(0, 0) // reservado
  cabecera.writeUInt16LE(1, 2) // tipo: icono
  cabecera.writeUInt16LE(cantidad, 4)

  const entradas = []
  let offset = 6 + cantidad * 16
  const bloques = []

  for (let i = 0; i < cantidad; i++) {
    const png = pngs[i]
    const tamano = tamanos[i]
    const entrada = Buffer.alloc(16)
    entrada.writeUInt8(tamano >= 256 ? 0 : tamano, 0) // ancho
    entrada.writeUInt8(tamano >= 256 ? 0 : tamano, 1) // alto
    entrada.writeUInt8(0, 2) // paleta
    entrada.writeUInt8(0, 3) // reservado
    entrada.writeUInt16LE(1, 4) // planos de color
    entrada.writeUInt16LE(32, 6) // bits por pixel
    entrada.writeUInt32LE(png.length, 8) // tamaño de los datos
    entrada.writeUInt32LE(offset, 12) // offset de los datos
    entradas.push(entrada)
    bloques.push(png)
    offset += png.length
  }

  return Buffer.concat([cabecera, ...entradas, ...bloques])
}

const ico = construirIco(pngsIco, tamanosIco)
await sharp.cache(false) // no interfiere, solo evita cachear el buffer manual
const fs = await import('node:fs/promises')
await fs.writeFile('public/favicon.ico', ico)
console.log('Listo: public/favicon.ico')
