export interface PuntoProyectado {
  id: string
  nombre: string
  x: number
  y: number
}

export interface GrupoPuntos {
  x: number
  y: number
  items: PuntoProyectado[]
}

/** Extraída de ProvincePins.tsx (Etapa 6) para poder testearla sin d3/DOM.
 * Grilla simple: agrupa puntos que caen en la misma celda de tamaño
 * `celdaPx` (en las mismas unidades que `x`/`y` de los puntos — el llamador
 * ya convierte la separación deseada en pantalla a esa unidad dividiendo
 * por la escala de zoom actual). Un grupo de un solo punto conserva su
 * posición real; un grupo de más de uno se ancla al CENTRO de la celda, no
 * al promedio de sus puntos, para garantizar como mínimo `celdaPx` de
 * separación entre clusters vecinos (promediar podía dejar dos clusters
 * casi pegados si sus puntos caían cerca del borde compartido). */
export function clusterizarPuntos(
  puntos: PuntoProyectado[],
  celdaPx: number,
): GrupoPuntos[] {
  const buckets = new Map<string, { ix: number; iy: number; items: PuntoProyectado[] }>()
  for (const p of puntos) {
    const ix = Math.floor(p.x / celdaPx)
    const iy = Math.floor(p.y / celdaPx)
    const clave = `${ix}:${iy}`
    const actual = buckets.get(clave)
    if (actual) actual.items.push(p)
    else buckets.set(clave, { ix, iy, items: [p] })
  }
  return Array.from(buckets.values()).map(({ ix, iy, items }) =>
    items.length === 1
      ? { x: items[0].x, y: items[0].y, items }
      : { x: (ix + 0.5) * celdaPx, y: (iy + 0.5) * celdaPx, items },
  )
}
