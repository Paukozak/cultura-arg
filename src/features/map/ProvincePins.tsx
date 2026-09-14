import type { GeoProjection } from 'd3-geo'
import { useMemo } from 'react'
import { distanciaAGeometria } from '../../data/geometriaProvincia'
import { geometriaDetalle } from '../../data/provincias'
import { useEspacios } from '../../data/useEspacios'
import { useMapStore } from '../../store/mapStore'

export interface ZoomState {
  cx: number
  cy: number
  scale: number
}

interface Props {
  provinciaId: string
  projection: GeoProjection
  zoom: ZoomState
  visible: boolean
  onCluster: (cx: number, cy: number) => void
  onHoverPin: (etiqueta: string, clientX: number, clientY: number) => void
  onLeavePin: () => void
}

// Separación mínima en pantalla (px) antes de agrupar dos espacios en un
// mismo cluster. En provincias con miles de espacios (CABA, Buenos Aires) al
// nivel de zoom inicial esto colapsa la nube entera en unos pocos clusters
// — necesario para que el SVG no tenga que dibujar miles de pines a la vez.
const CLUSTER_CELL_PX = 26
const PIN_RADIO = 5
const CLUSTER_RADIO = 9

// Margen (grados de lon/lat, ~3km) que se tolera fuera del polígono real de
// la provincia antes de descartar un pin. El dataset de SInCA tiene, para
// una minoría de espacios, una coordenada que no coincide con la provincia
// que el propio registro dice tener (desde error de geocodificación hasta
// casos sistemáticos — ver NOTES.md). Dibujar esos pines donde caiga la
// coordenada los muestra en cualquier lugar del mapa, a veces a cientos o
// miles de km — peor que no mostrarlos. El margen es a propósito generoso
// para NO descartar casos legítimos cerca del borde real (p. ej. un club
// náutico sobre un muelle, geográficamente "fuera" del polígono de tierra
// firme pero a metros de la costa).
const MARGEN_FUERA_DE_PROVINCIA_DEG = 0.03

export function ProvincePins({
  provinciaId,
  projection,
  zoom,
  visible,
  onCluster,
  onHoverPin,
  onLeavePin,
}: Props) {
  const espacios = useEspacios(provinciaId)
  const abrirVistaCompleta = useMapStore((s) => s.abrirVistaCompleta)

  const puntos = useMemo(() => {
    if (!espacios) return []
    const geometria = geometriaDetalle(provinciaId)
    return espacios.flatMap((e) => {
      if (e.lat === null || e.lon === null) return []
      // Descartar (no dibujar) coordenadas que no coinciden con la
      // provincia que el propio registro dice tener — ver el comentario
      // de MARGEN_FUERA_DE_PROVINCIA_DEG.
      if (geometria && distanciaAGeometria(e.lon, e.lat, geometria) > MARGEN_FUERA_DE_PROVINCIA_DEG) {
        return []
      }
      const proyectado = projection([e.lon, e.lat])
      if (!proyectado) return []
      return [{ id: e.id, nombre: e.nombre ?? e.categoria, x: proyectado[0], y: proyectado[1] }]
    })
  }, [espacios, projection, provinciaId])

  // Grilla simple: el tamaño de celda se calcula en coordenadas "de mapa"
  // (sin zoom) a partir de la separación deseada en pantalla dividida por
  // la escala actual — así el agrupamiento se recalcula solo al cambiar de
  // nivel de zoom (clic en cluster), no en cada frame de la animación.
  const grupos = useMemo(() => {
    const celda = CLUSTER_CELL_PX / zoom.scale
    const buckets = new Map<string, { ix: number; iy: number; items: typeof puntos }>()
    for (const p of puntos) {
      const ix = Math.floor(p.x / celda)
      const iy = Math.floor(p.y / celda)
      const clave = `${ix}:${iy}`
      const actual = buckets.get(clave)
      if (actual) actual.items.push(p)
      else buckets.set(clave, { ix, iy, items: [p] })
    }
    return Array.from(buckets.values()).map(({ ix, iy, items }) =>
      items.length === 1
        ? { x: items[0].x, y: items[0].y, items }
        : // Centro de la celda de la grilla, no el promedio de sus puntos: dos
          // clusters vecinos pueden tener puntos muy cerca del borde
          // compartido, y promediar sus posiciones los deja casi pegados
          // (superpuestos e imposibles de clickear por separado). Anclar al
          // centro de celda garantiza como mínimo `celda` de separación.
          { x: (ix + 0.5) * celda, y: (iy + 0.5) * celda, items },
    )
  }, [puntos, zoom.scale])

  const contraescala = 1 / zoom.scale

  return (
    <g
      data-provincia={provinciaId}
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {grupos.map((grupo) => {
        const esCluster = grupo.items.length > 1
        const etiqueta = esCluster ? `${grupo.items.length} espacios` : grupo.items[0].nombre
        return (
          <g
            key={`${grupo.items[0].id}-${grupo.items.length}`}
            transform={`translate(${grupo.x}, ${grupo.y}) scale(${contraescala})`}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (esCluster) onCluster(grupo.x, grupo.y)
              else abrirVistaCompleta(grupo.items[0].id)
            }}
            onMouseEnter={(e) => onHoverPin(etiqueta, e.clientX, e.clientY)}
            onMouseLeave={onLeavePin}
          >
            <circle
              r={esCluster ? CLUSTER_RADIO : PIN_RADIO}
              fill={esCluster ? '#f5820d' : '#f5f2ea'}
              stroke="#141414"
              strokeWidth={1.25}
            />
            {esCluster && (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={700}
                fill="#141414"
                style={{ fontFamily: 'ui-monospace, monospace' }}
                pointerEvents="none"
              >
                {grupo.items.length}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
