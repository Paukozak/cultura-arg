import type { Espacio } from '../../data/espacios'
import { fotoCuradaPara, nombreMostradoPara } from './curaduriaDestacados'

interface Props {
  espacio: Espacio
  className?: string
  onClick?: () => void
}

/** Foto de un espacio: solo se muestra si es uno de los destacados curados a
 * mano (ver destacados-curados.json / public/fotos-destacados/). El resto no
 * tiene foto — se sacó la búsqueda automática en Wikipedia. */
export function EspacioFoto({ espacio, className, onClick }: Props) {
  const curada = fotoCuradaPara(espacio.id)
  if (!curada) return null

  const contenido = (
    <img
      // Con barra inicial: `curada` es una ruta relativa a `public/`
      // ("fotos-destacados/x.jpg"). Antes daba igual porque la app siempre
      // vivía en `/`, pero ahora que las URLs reales cambian el pathname
      // (`/provincia/:id`), un <img src> relativo se resolvería contra esa
      // URL en vez de la raíz del sitio y la foto daba 404.
      src={`/${curada}`}
      alt={nombreMostradoPara(espacio.id) ?? espacio.nombre ?? ''}
      loading="lazy"
      className="h-full w-full rounded-lg border border-neutral-800 object-cover"
    />
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`block ${className ?? ''}`}
      >
        {contenido}
      </button>
    )
  }
  return <div className={className}>{contenido}</div>
}
