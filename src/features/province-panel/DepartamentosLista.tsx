import { useEffect, useMemo } from 'react'
import { departamentosResumen } from '../../data/departamentos'
import { useMapStore } from '../../store/mapStore'
import { buildColorScales, SIN_DATOS_COLOR } from '../map/colorScales'

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

/** Filas de departamentos de una provincia — color, nombre y cantidad —
 * usadas por ProvincePanel.tsx cuando reemplaza ahí mismo la sección de
 * destacados por esta lista. La escala de color se arma sobre TODOS los
 * departamentos del país, no solo los de esta provincia: es la misma escala
 * que usa el choropleth (ver DepartamentosChoropleth.tsx y NationalMap.tsx),
 * así que el color de cada fila coincide con el que se ve pintado en el
 * mapa. */
export function DepartamentosLista({
  provinciaId,
  onElegir,
}: {
  provinciaId: string
  onElegir?: () => void
}) {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const abrirVistaCompletaPorDepartamento = useMapStore(
    (s) => s.abrirVistaCompletaPorDepartamento,
  )
  const resaltarDepartamento = useMapStore((s) => s.resaltarDepartamento)

  // Si esta lista se desmonta (se vuelve a destacados, o se cierra el
  // panel) con el mouse todavía sobre una fila, el navegador nunca manda un
  // "mouse salió" — sin este cleanup el resaltado se quedaría pegado en el
  // choropleth.
  useEffect(() => {
    return () => resaltarDepartamento(null)
  }, [resaltarDepartamento])

  const scales = useMemo(
    () =>
      buildColorScales(
        departamentosResumen.map((properties) => ({ properties })),
      ),
    [],
  )
  const scale =
    capaActiva === 'densidad' ? scales.densidadScale : scales.totalScale

  const filas = useMemo(() => {
    return departamentosResumen
      .filter((d) => d.provinciaId === provinciaId)
      .map((d) => {
        const valor =
          capaActiva === 'densidad' ? d.densidadPor100k : d.totalEspacios
        const color = valor === null ? SIN_DATOS_COLOR : scale(valor)
        return { id: d.id, nombre: d.nombre, valor, color }
      })
      .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1))
  }, [provinciaId, capaActiva, scale])

  if (filas.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No hay departamentos registrados en esta provincia.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {filas.map((fila) => (
        <button
          key={fila.id}
          type="button"
          onClick={() => {
            abrirVistaCompletaPorDepartamento(fila.id)
            onElegir?.()
          }}
          onMouseEnter={() => resaltarDepartamento(fila.id)}
          onMouseLeave={() => resaltarDepartamento(null)}
          onFocus={() => resaltarDepartamento(fila.id)}
          onBlur={() => resaltarDepartamento(null)}
          className="-mx-2 flex items-center gap-3 rounded-md border-b border-neutral-900 px-2 py-1.5 text-left text-sm transition-colors last:border-b-0 hover:bg-neutral-900 focus-visible:bg-neutral-900"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: fila.color }}
          />
          <span
            className="flex-1 truncate text-neutral-200"
            title={fila.nombre}
          >
            {fila.nombre}
          </span>
          <span className="font-mono text-xs text-neutral-400">
            {fila.valor === null ? 's/d' : formatNumero(fila.valor)}
          </span>
        </button>
      ))}
    </div>
  )
}
