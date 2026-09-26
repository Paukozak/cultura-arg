import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Espacio } from '../../data/espacios'

interface Props {
  espacio: Espacio
  className?: string
  /** Clase de alto del mapa (default `h-36`, el de las tarjetas de destacados). */
  alto?: string
}

// Prioriza el texto (nombre + dirección/localidad) porque así Google suele
// resolver directo a la ficha real del lugar, con sus fotos y reseñas, en
// vez de tirar un pin genérico. Se le agrega "Argentina" al final para
// desambiguar nombres que se repiten en otros países (hay un "Teatro
// Colón" real en A Coruña, España, y otro en Bogotá — sin el país, Google
// puede dudar entre esos y el de Buenos Aires). La coordenada queda como
// último recurso, solo cuando no queda nada de texto útil para buscar.
function buildQuery({ espacio }: Props): string {
  const nombreMapa = espacio.nombreMapa ?? espacio.categoria
  const { direccionMapa, localidad, lat, lon } = espacio
  const partes = [nombreMapa, direccionMapa, localidad].filter(Boolean)
  if (partes.length === 0) {
    return lat !== null && lon !== null ? `${lat},${lon}` : ''
  }
  return [...partes, 'Argentina'].join(', ')
}

/** Mapa embebido de Google Maps (sin API key, vía el endpoint clásico
 * "output=embed") + link de salida.
 *
 * El iframe no se monta hasta que entra en viewport: el atributo nativo
 * `loading="lazy"` no alcanza acá — con 5 destacados por provincia, los 5
 * mapas (cada uno un iframe cross-origin corriendo su propio JS) terminaban
 * cargando todos juntos apenas se abría el panel, sin importar si estaban
 * scrolleados fuera de vista, y eso competía por CPU/GPU con el hover del
 * mapa nacional. Con IntersectionObserver solo se monta el que realmente
 * se ve (con un margen para que cargue un poco antes de aparecer del
 * todo); una vez visto, se deja montado para no recargarlo si se
 * scrollea de nuevo. */
export function GoogleMapsEmbed(props: Props) {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible) return
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  const alto = props.alto ?? 'h-36'
  const query = buildQuery(props)
  if (!query) return null
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
  const linkHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-1.5 ${props.className ?? ''}`}
    >
      {visible ? (
        <iframe
          title={`Mapa de ${props.espacio.nombre ?? props.espacio.categoria}`}
          src={embedSrc}
          className={`${alto} w-full rounded-lg border border-neutral-800`}
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div
          className={`${alto} flex w-full items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900`}
        >
          <Loader2
            className="h-5 w-5 animate-spin text-neutral-600"
            aria-hidden="true"
          />
        </div>
      )}
      <a
        href={linkHref}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-medium text-accent hover:underline"
      >
        Ver en Google Maps →
      </a>
    </div>
  )
}
