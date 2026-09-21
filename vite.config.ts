import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Módulo virtual `virtual:fotos-destacados`: { nombre-sin-extensión-en-
// minúscula: nombre real del archivo } de public/fotos-destacados/. Deja que
// destacados-curados.json apunte a una foto por su nombre sin que importe la
// extensión ni las mayúsculas (`chaco3.jpeg` encuentra `chaco3.jpg`,
// `salta1.jpg` encuentra `salta1.JPG`): en Windows/macOS esas diferencias no
// molestan, pero en Linux (Vercel) sí — la foto se veía local y daba 404 en el
// deploy. Se lee una vez al arrancar: una foto agregada con `npm run dev`
// andando pide reiniciarlo.
function fotosDestacadosPlugin(): Plugin {
  const idVirtual = 'virtual:fotos-destacados'
  const idResuelto = `\0${idVirtual}`
  let raiz = process.cwd()
  return {
    name: 'fotos-destacados-manifest',
    configResolved(config) {
      raiz = config.root
    },
    resolveId(id) {
      if (id === idVirtual) return idResuelto
    },
    load(id) {
      if (id !== idResuelto) return
      const archivos: Record<string, string> = {}
      const dir = path.join(raiz, 'public', 'fotos-destacados')
      for (const archivo of readdirSync(dir).sort()) {
        const clave = path.parse(archivo).name.toLowerCase()
        archivos[clave] ??= archivo
      }
      return `export default ${JSON.stringify(archivos)}`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), fotosDestacadosPlugin()],
  test: {
    environment: 'node',
  },
})
