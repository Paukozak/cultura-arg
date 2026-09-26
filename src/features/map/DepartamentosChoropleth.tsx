import type { geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import type { MouseEvent } from 'react'
import type { DepartamentoProperties } from '../../data/departamentos'
import { useMapStore, type Capa } from '../../store/mapStore'
import {
  apagarConFondo,
  buildColorScales,
  colorForFeature,
  darken,
  highlightStroke,
  type ConEstadisticas,
} from './colorScales'

interface Props {
  provinciaId: string
  path: ReturnType<typeof geoPath>
  capaActiva: Capa
  scales: ReturnType<typeof buildColorScales>
  visible: boolean
  datos: FeatureCollection<Geometry, DepartamentoProperties> | null
  // Controlado desde NationalMap (no un `useState` local acá): en mobile, el
  // arrastre táctil que recorre el mapa (ver el efecto "mantener presionado"
  // en NationalMap.tsx) hace su propio hit-test con `elementFromPoint` fuera
  // de este componente y necesita poder marcar un departamento como resaltado
  // sin pasar por sus eventos de mouse, que el touch nunca dispara.
  hoveredId: string | null
  onHover: (
    id: string,
    nombre: string,
    estadisticas: ConEstadisticas,
    clientX: number,
    clientY: number,
  ) => void
  onLeave: () => void
}

/** Choropleth por departamento/partido de la provincia zoomeada (Etapa 9):
 * mismo color plano por `capaActiva` (total/densidad) que las provincias del
 * mapa nacional, a una escala calculada sobre TODOS los departamentos del
 * país (ver `departamentosResumen` en NationalMap.tsx) para que el color de
 * un departamento no dependa de qué otra provincia se visitó antes.
 *
 * Hover muestra el nombre (tooltip manejado por NationalMap, igual que el
 * de provincia); clic abre la vista completa con el agrupador en modo
 * 'departamento' y ese departamento tildado (ver
 * `abrirVistaCompletaPorDepartamento`). */
export function DepartamentosChoropleth({
  provinciaId,
  path,
  capaActiva,
  scales,
  visible,
  datos,
  hoveredId,
  onHover,
  onLeave,
}: Props) {
  const abrirVistaCompletaPorDepartamento = useMapStore(
    (s) => s.abrirVistaCompletaPorDepartamento,
  )
  const departamentoResaltado = useMapStore((s) => s.departamentoResaltado)
  if (!datos) return null

  return (
    <g
      data-provincia={provinciaId}
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      {/* `data-provincia` en el grupo (no en cada path): ProvincePanel
          cierra el panel (y deselecciona la provincia) en cualquier click
          que no sea sobre `[data-provincia]` ni dentro del panel — sin
          esto, clickear un departamento se leía como "afuera" y
          deseleccionaba la provincia ANTES de que este `onClick` llegara a
          correr (el listener de ProvincePanel escucha en `pointerdown`,
          que dispara antes que el `click` sintético de React). */}
      {/* Con un departamento resaltado (hover del mapa o de su fila en la
          lista, ver DepartamentosLista.tsx), el resto se atenúa para que se
          destaque — mismo criterio que las provincias del mapa nacional
          cuando se resalta una desde el ranking (ver NationalMap.tsx). */}
      {datos.features.map((f) => {
        const d = path(f)
        if (!d) return null
        const id = f.properties.id
        const idResaltado = hoveredId ?? departamentoResaltado
        const isHovered = id === idResaltado
        const atenuado = idResaltado !== null && !isHovered
        const color = colorForFeature(f.properties, capaActiva, scales)
        const bordeBase = darken(color, 0.35)
        return (
          <path
            key={id}
            data-departamento={id}
            d={d}
            fill={atenuado ? apagarConFondo(color, 0.45) : color}
            stroke={
              isHovered
                ? highlightStroke(color)
                : atenuado
                  ? apagarConFondo(bordeBase, 0.45)
                  : bordeBase
            }
            strokeWidth={isHovered ? 1.75 : 1}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{
              cursor: 'pointer',
              filter: isHovered ? 'brightness(1.15)' : 'none',
              transition:
                'filter 150ms ease, stroke 150ms ease, fill 150ms ease',
            }}
            onMouseEnter={(e: MouseEvent) =>
              onHover(
                id,
                f.properties.nombre,
                f.properties,
                e.clientX,
                e.clientY,
              )
            }
            onMouseMove={(e: MouseEvent) =>
              onHover(
                id,
                f.properties.nombre,
                f.properties,
                e.clientX,
                e.clientY,
              )
            }
            onMouseLeave={() => onLeave()}
            onClick={() => abrirVistaCompletaPorDepartamento(id)}
          />
        )
      })}
    </g>
  )
}
