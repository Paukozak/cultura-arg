import { useMemo } from 'react'
import { bboxProvincia } from './bboxSilueta'

interface SiluetaProvinciaProps {
  provinciaId: string
  className?: string
  fill?: string
  stroke?: string
}

/** Silueta de una sola provincia, recortada a su propio bbox (ver
 * `bboxProvincia`). No es un recorte del `<path>` del mapa nacional: ese
 * vive en un viewBox pensado para el país entero (NationalMap.tsx) y
 * reusarlo acá, a otra escala y otro sistema de coordenadas, es justo lo
 * que `layoutId` haría mal (ver el comentario en SiluetaViajera.tsx) —
 * conviene un dibujo propio, chico y con su viewBox ya ajustado.
 */
export function SiluetaProvincia({
  provinciaId,
  className,
  fill = 'var(--color-accent)',
  stroke = 'rgba(10, 10, 10, 0.7)',
}: SiluetaProvinciaProps) {
  const caja = useMemo(() => bboxProvincia(provinciaId), [provinciaId])
  if (!caja) return null
  return (
    <svg
      viewBox={caja.viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden="true"
    >
      <path
        d={caja.d}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
