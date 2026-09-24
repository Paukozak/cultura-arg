import { useEffect, useRef } from 'react'
import { ComoSeHizo } from '../features/about/ComoSeHizo'
import { GlobalSearch } from '../features/search/GlobalSearch'
import { useMapStore } from '../store/mapStore'
import { useMediaQuery } from '../utils/useMediaQuery'
import { ThemeToggle } from './ThemeToggle'

function Acciones() {
  return (
    <>
      <ComoSeHizo />
      <ThemeToggle />
    </>
  )
}

export function Header() {
  const headerRef = useRef<HTMLElement>(null)
  const setHeaderHeight = useMapStore((s) => s.setHeaderHeight)
  const provinciaSeleccionada = useMapStore((s) => s.provinciaSeleccionada)
  const esMobil = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [setHeaderHeight])

  // Dos layouts bien distintos (no una reordenada con CSS): en mobile el
  // buscador va SOLO en su propia fila y los tres botones se agrupan con
  // el título; en desktop el buscador se agrupa CON los botones, pegado a
  // la derecha. Ese cambio de "con quién agrupa" el buscador no se puede
  // resolver con `order`/`display:contents` (reordena entre hermanos
  // planos, no cambia de padre) — intentarlo dejaba el buscador y los
  // botones separados por un hueco en desktop. Más simple y confiable:
  // ramas de JSX separadas según el viewport.
  if (esMobil) {
    return (
      <header
        ref={headerRef}
        className="flex flex-col gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="shrink-0 text-base font-semibold tracking-tight text-neutral-100">
            Cultura Argentina
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <Acciones />
          </div>
        </div>
        {/* Con una provincia seleccionada, el foco ya es esa provincia (hoja
            inferior abierta con su "volver" propio) — el buscador global acá
            queda como una fila más para nada, y ocultarla le devuelve esa
            altura al mapa (`headerHeight`, medido por el ResizeObserver de
            arriba, baja solo). */}
        {!provinciaSeleccionada && <GlobalSearch />}
      </header>
    )
  }

  return (
    <header
      ref={headerRef}
      className="flex h-16 shrink-0 items-center gap-4 border-b border-neutral-800 bg-neutral-950 px-6"
    >
      <h1 className="shrink-0 text-lg font-semibold tracking-tight text-neutral-100">
        Cultura Argentina
      </h1>
      <div className="flex flex-1 items-center justify-end gap-3">
        <GlobalSearch />
        <Acciones />
      </div>
    </header>
  )
}
