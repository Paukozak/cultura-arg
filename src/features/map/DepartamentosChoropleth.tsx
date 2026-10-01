import type { geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import { memo, useMemo, type MouseEvent } from 'react'
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

type DepartamentoFeature = FeatureCollection<
  Geometry,
  DepartamentoProperties
>['features'][number]

interface DepartamentoProps {
  feature: DepartamentoFeature
  d: string
  capaActiva: Capa
  scales: ReturnType<typeof buildColorScales>
  isHovered: boolean
  atenuado: boolean
  onHover: Props['onHover']
  onLeave: () => void
  onClick: (id: string) => void
}

// Memoizado: un movimiento de mouse sobre el mapa re-renderiza al padre, pero
// a cada path solo le cambian las props cuando entra o sale de hover/atenuado.
const Departamento = memo(function Departamento({
  feature: f,
  d,
  capaActiva,
  scales,
  isHovered,
  atenuado,
  onHover,
  onLeave,
  onClick,
}: DepartamentoProps) {
  const id = f.properties.id
  const color = colorForFeature(f.properties, capaActiva, scales)
  const bordeBase = darken(color, 0.35)
  const alHover = (e: MouseEvent) =>
    onHover(id, f.properties.nombre, f.properties, e.clientX, e.clientY)
  return (
    <path
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
        transition: 'filter 150ms ease, stroke 150ms ease, fill 150ms ease',
      }}
      onMouseEnter={alHover}
      onMouseMove={alHover}
      onMouseLeave={onLeave}
      onClick={() => onClick(id)}
    />
  )
})

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
  // Generar el `d` recorre cada punto de la geometría: se hace una vez por
  // provincia/proyección, no en cada movimiento del mouse.
  const paths = useMemo(
    () =>
      (datos?.features ?? []).flatMap((f) => {
        const d = path(f)
        return d ? [{ f, d }] : []
      }),
    [datos, path],
  )
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
      {paths.map(({ f, d }) => {
        const id = f.properties.id
        const idResaltado = hoveredId ?? departamentoResaltado
        const isHovered = id === idResaltado
        return (
          <Departamento
            key={id}
            feature={f}
            d={d}
            capaActiva={capaActiva}
            scales={scales}
            isHovered={isHovered}
            atenuado={idResaltado !== null && !isHovered}
            onHover={onHover}
            onLeave={onLeave}
            onClick={abrirVistaCompletaPorDepartamento}
          />
        )
      })}
    </g>
  )
}
