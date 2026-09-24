import { MapPin } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useMapStore } from '../../store/mapStore'
import {
  ICONOS_POR_CATEGORIA,
  ICONO_POR_DEFECTO,
} from '../province-panel/categoriaIcons'
import {
  buscarGlobal,
  precargarIndiceBusqueda,
  type ResultadoBusqueda,
} from './buscarGlobal'

const QUERY_MINIMA = 2

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(0)
  // Se suma 1 cuando termina de cargar el índice de espacios/localidades
  // (ver buscarGlobal.ts) para forzar a recalcular `resultados` — si el
  // usuario ya escribió algo mientras el índice todavía viajaba por red,
  // los resultados de espacio/localidad aparecen solos apenas está listo,
  // en vez de quedar pegados a lo que había en ese primer cálculo.
  const [indiceListoTick, setIndiceListoTick] = useState(0)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const seleccionarProvincia = useMapStore((s) => s.seleccionarProvincia)
  const abrirVistaCompleta = useMapStore((s) => s.abrirVistaCompleta)
  const abrirVistaCompletaPorLocalidad = useMapStore(
    (s) => s.abrirVistaCompletaPorLocalidad,
  )
  const abrirVistaCompletaPorDepartamento = useMapStore(
    (s) => s.abrirVistaCompletaPorDepartamento,
  )

  // Precarga apenas monta el buscador (siempre visible en el header), no
  // recién al primer tipeo: para cuando el usuario termina de escribir las
  // 2 letras mínimas, el índice ya está listo en la enorme mayoría de los
  // casos, sin haber bloqueado la carga inicial de la página (ver el
  // comentario en buscarGlobal.ts).
  useEffect(() => {
    precargarIndiceBusqueda().then(() => setIndiceListoTick((t) => t + 1))
  }, [])

  // `indiceListoTick` no lo lee `buscarGlobal` directamente (lee el módulo
  // cacheado en buscarGlobal.ts), está a propósito para forzar el
  // recálculo cuando el índice lazy-loaded termina de llegar.
  const resultados = useMemo(
    () => buscarGlobal(query),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, indiceListoTick],
  )
  const hayQuery = query.trim().length >= QUERY_MINIMA

  // Si cambia la búsqueda y el resultado resaltado quedó fuera de rango
  // (la lista se achicó), lo reacomoda — ajuste de estado durante el
  // render en vez de un efecto, ver la misma técnica en NationalMap.tsx.
  const [resultadosAnteriores, setResultadosAnteriores] = useState(resultados)
  if (resultados !== resultadosAnteriores) {
    setResultadosAnteriores(resultados)
    if (indiceActivo >= resultados.length) setIndiceActivo(0)
  }

  useEffect(() => {
    if (!abierto) return
    function onPointerDown(e: PointerEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [abierto])

  function elegir(resultado: ResultadoBusqueda) {
    // En los tres casos, seleccionar la provincia primero (dispara el zoom
    // + pines de la Etapa 6) y recién después abrir ficha/lista — al revés,
    // seleccionarProvincia pisa `vistaCompleta` de vuelta a false.
    if (resultado.tipo === 'provincia') {
      seleccionarProvincia(resultado.id)
    } else if (resultado.tipo === 'departamento') {
      seleccionarProvincia(resultado.provinciaId)
      abrirVistaCompletaPorDepartamento(resultado.id)
    } else if (resultado.tipo === 'localidad') {
      seleccionarProvincia(resultado.provinciaId)
      abrirVistaCompletaPorLocalidad(resultado.nombre)
    } else {
      seleccionarProvincia(resultado.provinciaId)
      abrirVistaCompleta(resultado.id)
    }
    setQuery('')
    setAbierto(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!abierto || resultados.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      elegir(resultados[indiceActivo])
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div ref={contenedorRef} className="relative w-full max-w-md">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar provincia, departamento, localidad o espacio…"
        className="w-full rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-accent"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={abierto && hayQuery}
        aria-controls="resultados-busqueda-global"
      />

      <AnimatePresence>
        {abierto && hayQuery && (
          <motion.div
            id="resultados-busqueda-global"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            // z-40, por encima del panel lateral (z-30): con un panel de
            // provincia abierto, este dropdown puede caer geométricamente
            // debajo de su franja derecha y quedar tapado si no se le da
            // más jerarquía.
            className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/98 py-1.5 shadow-xl shadow-black/50 backdrop-blur"
          >
            {resultados.length === 0 ? (
              <p className="px-4 py-3 text-sm text-neutral-500">
                Sin resultados.
              </p>
            ) : (
              resultados.map((r, i) => {
                const Icono =
                  r.tipo === 'espacio'
                    ? (ICONOS_POR_CATEGORIA[r.categoria] ?? ICONO_POR_DEFECTO)
                    : MapPin
                const clave =
                  r.tipo === 'localidad'
                    ? `localidad-${r.provinciaId}-${r.nombre}`
                    : `${r.tipo}-${r.id}`
                const subtitulo =
                  r.tipo === 'provincia'
                    ? 'Provincia'
                    : r.tipo === 'departamento'
                      ? `Departamento · ${r.provinciaNombre} · ${r.totalEspacios} ${r.totalEspacios === 1 ? 'espacio' : 'espacios'}`
                      : r.tipo === 'localidad'
                        ? `Localidad · ${r.provinciaNombre} · ${r.cantidadEspacios} ${r.cantidadEspacios === 1 ? 'espacio' : 'espacios'}`
                        : [r.categoria, r.localidad].filter(Boolean).join(' · ')
                return (
                  <button
                    key={clave}
                    type="button"
                    role="option"
                    aria-selected={i === indiceActivo}
                    onMouseEnter={() => setIndiceActivo(i)}
                    onClick={() => elegir(r)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === indiceActivo ? 'bg-neutral-900' : ''
                    }`}
                  >
                    <Icono
                      className="h-4 w-4 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-neutral-100">
                        {r.nombre}
                      </div>
                      <div className="truncate font-mono text-xs text-neutral-500">
                        {subtitulo}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
