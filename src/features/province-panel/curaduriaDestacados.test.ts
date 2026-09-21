import archivosFotos from 'virtual:fotos-destacados'
import { describe, expect, it } from 'vitest'
import destacadosCurados from '../../data/destacados-curados.json'
import { fotoCuradaPara, resolverFoto } from './curaduriaDestacados'
import type { EntradaCurada } from './getDestacados'

describe('resolverFoto', () => {
  const archivos = { chaco3: 'chaco3.jpg', salta1: 'salta1.JPG' }

  it('encuentra la foto aunque la extensión del json no coincida', () => {
    expect(resolverFoto('fotos-destacados/chaco3.jpeg', archivos)).toBe(
      'fotos-destacados/chaco3.jpg',
    )
  })

  it('ignora mayúsculas en el nombre y en la extensión', () => {
    expect(resolverFoto('fotos-destacados/Salta1.jpg', archivos)).toBe(
      'fotos-destacados/salta1.JPG',
    )
  })

  it('devuelve la ruta tal cual si no hay ningún archivo con ese nombre', () => {
    expect(resolverFoto('fotos-destacados/nope.jpg', archivos)).toBe(
      'fotos-destacados/nope.jpg',
    )
  })
})

describe('fotos de los destacados curados', () => {
  // Con la lista real de public/fotos-destacados/: cada foto pedida en el json
  // tiene que terminar apuntando a un archivo que existe, con el nombre
  // exacto que tiene en disco (lo que exige Linux). Si falla, el nombre está
  // mal escrito en el json o falta subir la foto.
  const archivosReales = new Set(Object.values(archivosFotos))
  const entradas = Object.values(
    destacadosCurados.porProvincia as Record<string, EntradaCurada[]>,
  )
    .flat()
    .filter((e) => e.foto)

  it.each(entradas.map((e) => [e.id, e.foto] as const))(
    '%s (%s) apunta a un archivo existente',
    (id) => {
      const nombre = fotoCuradaPara(id)?.split('/').pop() ?? ''
      expect(archivosReales.has(nombre)).toBe(true)
    },
  )
})
