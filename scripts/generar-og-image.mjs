import sharp from 'sharp'

// Sol de Mayo — símbolo público de la bandera argentina, versión vectorial
// de dominio público (Wikimedia Commons).
const solResp = await fetch(
  'https://commons.wikimedia.org/wiki/Special:FilePath/Sol_de_Mayo-Bandera_de_Argentina.svg',
)
const solSvgRaw = await solResp.text()
const solInner = solSvgRaw
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')

const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <style>
    .titulo { font-family: Arial, sans-serif; font-weight: 700; font-size: 64px; fill: #f5f5f5; text-anchor: middle; }
    .sub { font-family: Arial, sans-serif; font-weight: 500; font-size: 32px; fill: #3065bd; text-anchor: middle; }
  </style>
  <rect width="1200" height="630" fill="#0c0a09" />
  <svg x="490" y="110" width="220" height="220" viewBox="-165 -165 330 330">
    ${solInner}
  </svg>
  <text x="600" y="400" class="titulo">CulturArg</text>
  <text x="600" y="448" class="sub">Cartografía Cultural Argentina</text>
</svg>
`

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og-image.png')
console.log('Listo: public/og-image.png')
