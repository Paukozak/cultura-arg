import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import archivosFotos from 'virtual:fotos-destacados'
import destacadosCurados from '../../data/destacados-curados.json'
import { EspacioFoto } from './EspacioFoto'
import { espacio } from './espacioDePrueba'
import type { EntradaCurada } from './getDestacados'

const entradasConFoto = Object.values(
  destacadosCurados.porProvincia as Record<string, EntradaCurada[]>,
)
  .flat()
  .filter((e): e is EntradaCurada & { foto: string } => Boolean(e.foto))

describe('EspacioFoto', () => {
  it.each(entradasConFoto.map((e) => [e.id, e.foto] as const))(
    '%s: renderiza una ruta absoluta a un archivo que existe (%s)',
    (id) => {
      const html = renderToStaticMarkup(
        <EspacioFoto espacio={espacio({ id, categoria: 'Museos' })} />,
      )
      const src = html.match(/src="([^"]+)"/)?.[1]

      // Absoluta (arranca con "/"): si no, un cambio de pathname de la SPA
      // (ver useHistorialPaneles.ts, que ahora empuja URLs reales como
      // /provincia/:slug) resolvería este <img src> relativo contra esa URL
      // en vez de la raíz del sitio y la foto daría 404 — eso fue justo lo
      // que rompió las fotos la primera vez que se sumaron URLs reales.
      expect(src).toMatch(/^\/fotos-destacados\//)

      const archivo = src?.split('/').pop()
      expect(new Set(Object.values(archivosFotos)).has(archivo ?? '')).toBe(
        true,
      )
    },
  )

  it('no renderiza nada si el espacio no tiene foto curada', () => {
    const html = renderToStaticMarkup(
      <EspacioFoto
        espacio={espacio({ id: 'id-sin-curar-inventado', categoria: 'Museos' })}
      />,
    )
    expect(html).toBe('')
  })
})
