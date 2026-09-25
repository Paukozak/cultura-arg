import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  nombre: string
  direccion: string | null
  localidad: string | null
  lat: number | null
  lon: number | null
  className?: string
  /** Clase de alto del mapa (default `h-36`, el de las tarjetas de destacados). */
  alto?: string
}

// Prioriza nombre + dirección/localidad por sobre la coordenada cruda:
// buscando así, Google suele resolver directamente a la ficha real del
// lugar (con sus fotos y reseñas, si el lugar está cargado en Google Maps)
// en vez de tirar un pin genérico sin identificar nada. La coordenada queda
// como respaldo solo cuando no hay ni dirección ni localidad para buscar —
// ahí un nombre solo puede ser ambiguo y el pin exacto es más confiable.
function buildQuery({ nombre, direccion, localidad, lat, lon }: Props): string {
  const textoDescriptivo = [nombre, direccion, localidad]
    .filter(Boolean)
    .join(', ')
  if (direccion || localidad) return textoDescriptivo
  if (lat !== null && lon !== null) return `${lat},${lon}`
  return textoDescriptivo
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
          title={`Mapa de ${props.nombre}`}
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
        className="text-xs font-medium text-accent hover:underline"
      >
        Ver en Google Maps →
      </a>
    </div>
  )
}
