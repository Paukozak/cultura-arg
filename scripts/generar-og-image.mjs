import sharp from 'sharp'

// Logo del sol (ilustración propia, ver scripts/assets/logo-sol.png),
// recortado a su margen transparente y embebido como PNG en el SVG.
const solRecortado = await sharp('scripts/assets/logo-sol.png')
  .trim({ threshold: 10 })
  .png()
  .toBuffer()
const solBase64 = solRecortado.toString('base64')

const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <style>
    .titulo { font-family: Arial, sans-serif; font-weight: 700; font-size: 64px; fill: #f5f5f5; text-anchor: middle; }
    .sub { font-family: Arial, sans-serif; font-weight: 500; font-size: 32px; fill: #3065bd; text-anchor: middle; }
  </style>
  <rect width="1200" height="630" fill="#0c0a09" />
  <image x="490" y="90" width="220" height="220" href="data:image/png;base64,${solBase64}" preserveAspectRatio="xMidYMid meet" />
  <text x="600" y="400" class="titulo">CulturArg</text>
  <text x="600" y="448" class="sub">Cartografía Cultural Argentina</text>
</svg>
`

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile('public/og-image.png')
console.log('Listo: public/og-image.png')
