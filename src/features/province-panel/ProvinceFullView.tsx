import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { List, type RowComponentProps } from 'react-window'
import { cargarEspacios, type Espacio } from '../../data/espacios'
import { provinciasGeo } from '../../data/provincias'
import { useMapStore } from '../../store/mapStore'
import { normalizar } from '../../utils/texto'
import { ICONOS_POR_CATEGORIA, ICONO_POR_DEFECTO } from './categoriaIcons'
import { nombreMostradoPara } from './curaduriaDestacados'
import { EspacioFoto } from './EspacioFoto'
import { GoogleMapsEmbed } from './GoogleMapsEmbed'

/** Nombre a mostrar: el editorial curado (ver destacados-curados.json) si
 * existe, si no el de la fuente. Antes esto solo se aplicaba en el panel de
 * destacados; se usa acá también para que sea el mismo nombre en la ficha de
 * la vista completa. */
function nombreEfectivo(espacio: Espacio): string {
  return nombreMostradoPara(espacio.id) ?? espacio.nombre ?? ''
}

type Orden = 'alfabetico' | 'anio-asc' | 'anio-desc' | 'categoria'

const ORDEN_LABEL: Record<Orden, string> = {
  alfabetico: 'Alfabético',
  'anio-asc': 'Año (más antiguo)',
  'anio-desc': 'Año (más reciente)',
  categoria: 'Categoría',
}

function ordenar(espacios: Espacio[], orden: Orden): Espacio[] {
  const arr = [...espacios]
  switch (orden) {
    case 'alfabetico':
      return arr.sort((a, b) =>
        (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'),
      )
    case 'anio-asc':
      return arr.sort(
        (a, b) =>
          (a.anioInauguracion ?? Infinity) - (b.anioInauguracion ?? Infinity),
      )
    case 'anio-desc':
      return arr.sort(
        (a, b) =>
          (b.anioInauguracion ?? -Infinity) - (a.anioInauguracion ?? -Infinity),
      )
    case 'categoria':
      return arr.sort(
        (a, b) =>
          a.categoria.localeCompare(b.categoria, 'es') ||
          (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'),
      )
  }
}

interface RowProps {
  items: Espacio[]
  seleccionadoId: string | null
  onSelect: (espacio: Espacio) => void
}

function Fila({
  index,
  style,
  items,
  seleccionadoId,
  onSelect,
}: RowComponentProps<RowProps>) {
  const espacio = items[index]
  const Icono = ICONOS_POR_CATEGORIA[espacio.categoria] ?? ICONO_POR_DEFECTO
  const activo = espacio.id === seleccionadoId
  return (
    <div style={style} className="px-3 py-0.5">
      <button
        type="button"
        onClick={() => onSelect(espacio)}
        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
          activo
            ? 'border-accent bg-accent/10'
            : 'border-transparent hover:bg-neutral-900'
        }`}
      >
        <Icono
          className="h-4 w-4 shrink-0 text-neutral-500"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-neutral-100">
            {nombreEfectivo(espacio)}
          </div>
          <div className="truncate font-mono text-xs text-neutral-500">
            {espacio.categoria}
            {espacio.localidad ? ` · ${espacio.localidad}` : ''}
          </div>
        </div>
      </button>
    </div>
  )
}

function Ficha({ espacio }: { espacio: Espacio }) {
  const Icono = ICONOS_POR_CATEGORIA[espacio.categoria] ?? ICONO_POR_DEFECTO
  return (
    <div className="flex flex-col gap-5">
      <EspacioFoto espacio={espacio} className="h-96 w-full" />
      <div className="flex items-start gap-3">
        <Icono className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h3 className="text-2xl font-semibold text-neutral-100">
            {nombreEfectivo(espacio)}
          </h3>
          <p className="font-mono text-sm uppercase tracking-wide text-neutral-500">
            {espacio.categoria}
            {espacio.subcategoria &&
            espacio.subcategoria.toLowerCase() !==
              espacio.categoria.toLowerCase()
              ? ` · ${espacio.subcategoria}`
              : ''}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 font-mono text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            Año
          </dt>
          <dd className="text-neutral-200">
            {espacio.anioInauguracion ?? 's/d'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            Gestión
          </dt>
          <dd className="text-neutral-200 capitalize">
            {espacio.gestion ?? 's/d'}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            Localidad
          </dt>
          <dd className="text-neutral-200">
            {[espacio.localidad, espacio.departamento]
              .filter(Boolean)
              .join(', ') || 's/d'}
          </dd>
        </div>
        {espacio.direccion && (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              Dirección
            </dt>
            <dd className="text-neutral-200">{espacio.direccion}</dd>
          </div>
        )}
      </dl>

      {(espacio.telefono || espacio.mail || espacio.web) && (
        <div className="flex flex-col gap-1.5 border-t border-neutral-800 pt-4 text-base">
          {espacio.telefono && (
            <div className="text-neutral-300">☎ {espacio.telefono}</div>
          )}
          {espacio.mail && (
            <a
              href={`mailto:${espacio.mail}`}
              className="text-accent hover:underline"
            >
              {espacio.mail}
            </a>
          )}
          {espacio.web && (
            <a
              href={
                espacio.web.startsWith('http')
                  ? espacio.web
                  : `https://${espacio.web}`
              }
              target="_blank"
              rel="noreferrer"
              className="truncate text-accent hover:underline"
            >
              {espacio.web}
            </a>
          )}
        </div>
      )}

      <GoogleMapsEmbed
        nombre={espacio.nombre ?? espacio.categoria}
        direccion={espacio.direccion}
        localidad={espacio.localidad}
        lat={espacio.lat}
        lon={espacio.lon}
        className="mt-1"
      />
    </div>
  )
}

function ProvinceFullViewContent({
  provinciaId,
  espacioInicialId,
  localidadInicial,
  onCerrar,
}: {
  provinciaId: string
  espacioInicialId: string | null
  localidadInicial: string | null
  onCerrar: () => void
}) {
  const [espacios, setEspacios] = useState<Espacio[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('alfabetico')
  const [categoriasActivas, setCategoriasActivas] =
    useState<Set<string> | null>(null)
  const [gestionesActivas, setGestionesActivas] = useState<Set<string> | null>(
    null,
  )
  const [localidadActiva, setLocalidadActiva] = useState<string | null>(
    localidadInicial,
  )
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    espacioInicialId,
  )

  useEffect(() => {
    let cancelado = false
    cargarEspacios(provinciaId).then((data) => {
      if (!cancelado) setEspacios(data)
    })
    return () => {
      cancelado = true
    }
  }, [provinciaId])

  // Con la vista completa abierta, el body de atrás no debería poder
  // scrollear: es un overlay de pantalla completa y esa barra de scroll
  // quedaba activa (y confusa) por detrás sin ningún efecto visible.
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  const provincia = provinciasGeo.features.find(
    (f) => f.properties.id === provinciaId,
  )

  const categorias = useMemo(() => {
    if (!espacios) return []
    const conteo = new Map<string, number>()
    for (const e of espacios)
      conteo.set(e.categoria, (conteo.get(e.categoria) ?? 0) + 1)
    return [...conteo.entries()].sort((a, b) => b[1] - a[1])
  }, [espacios])

  const gestiones = useMemo(() => {
    if (!espacios) return []
    const conteo = new Map<string, number>()
    for (const e of espacios) {
      const clave = e.gestion ?? 'sin dato'
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
    }
    return [...conteo.entries()]
  }, [espacios])

  // La localidad puede tener cientos de valores distintos (Buenos Aires,
  // CABA) — a diferencia de categoría/gestión, no entra como chips: va en
  // un <select> nativo, ordenado alfabéticamente, con conteos.
  const localidades = useMemo(() => {
    if (!espacios) return []
    const conteo = new Map<string, number>()
    for (const e of espacios) {
      const clave = e.localidad ?? 'sin dato'
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
    }
    return [...conteo.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }, [espacios])

  const filtrados = useMemo(() => {
    if (!espacios) return []
    const q = normalizar(busqueda.trim())
    let resultado = espacios
    if (q) {
      resultado = resultado.filter(
        (e) =>
          normalizar(e.nombre ?? '').includes(q) ||
          normalizar(e.localidad ?? '').includes(q),
      )
    }
    if (categoriasActivas) {
      resultado = resultado.filter((e) => categoriasActivas.has(e.categoria))
    }
    if (gestionesActivas) {
      resultado = resultado.filter((e) =>
        gestionesActivas.has(e.gestion ?? 'sin dato'),
      )
    }
    if (localidadActiva) {
      resultado = resultado.filter(
        (e) => (e.localidad ?? 'sin dato') === localidadActiva,
      )
    }
    return ordenar(resultado, orden)
  }, [
    espacios,
    busqueda,
    categoriasActivas,
    gestionesActivas,
    localidadActiva,
    orden,
  ])

  // Por default se muestra la ficha del primero de la lista filtrada; si el
  // usuario eligió uno que sigue en el filtro actual, se respeta esa elección.
  const seleccionado = useMemo(() => {
    if (filtrados.length === 0) return null
    return filtrados.find((e) => e.id === seleccionadoId) ?? filtrados[0]
  }, [filtrados, seleccionadoId])

  function toggleCategoria(categoria: string) {
    setCategoriasActivas((prev) => {
      const base = prev ?? new Set(categorias.map(([c]) => c))
      const next = new Set(base)
      if (next.has(categoria)) next.delete(categoria)
      else next.add(categoria)
      return next
    })
  }

  function toggleGestion(gestion: string) {
    setGestionesActivas((prev) => {
      const base = prev ?? new Set(gestiones.map(([g]) => g))
      const next = new Set(base)
      if (next.has(gestion)) next.delete(gestion)
      else next.add(gestion)
      return next
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 flex flex-col bg-neutral-950"
    >
      <header className="flex items-center gap-3 border-b border-neutral-800 px-6 py-4">
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Volver"
          className="shrink-0 rounded-full border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:text-neutral-100"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">
            Todos los espacios · {provincia?.properties.nombre}
          </h2>
          <p className="font-mono text-xs text-neutral-500">
            {filtrados.length} de {espacios?.length ?? '…'} espacios
          </p>
        </div>
      </header>

      {!espacios ? (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
          Cargando espacios…
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <div className="flex w-full min-w-0 min-h-0 flex-col border-b border-neutral-800 md:w-[380px] md:flex-shrink-0 md:border-b-0 md:border-r">
            {/* Los filtros (buscador hasta Gestión) scrollean en su propio
                bloque, con techo propio: sin este límite, una provincia con
                muchas categorías (chips que se envuelven en varias líneas)
                podía empujar la lista de abajo hasta dejarla con 0px de
                alto (el `flex-1 min-h-0` de la lista se achica sin piso) —
                ahí no faltaban opciones, estaban ahí pero sin cómo verlas
                ni scrollear hasta ellas. */}
            <div className="flex max-h-[46vh] flex-col gap-3 overflow-y-auto p-4 md:max-h-[42vh]">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o localidad…"
                className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-600"
              />

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                  Ordenar
                </span>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as Orden)}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
                >
                  {(Object.keys(ORDEN_LABEL) as Orden[]).map((key) => (
                    <option key={key} value={key}>
                      {ORDEN_LABEL[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                  Localidad
                </span>
                <select
                  value={localidadActiva ?? ''}
                  onChange={(e) => setLocalidadActiva(e.target.value || null)}
                  className="max-w-55 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
                >
                  <option value="">Todas ({espacios.length})</option>
                  {localidades.map(([localidad, count]) => (
                    <option key={localidad} value={localidad}>
                      {localidad} ({count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                    Categoría
                  </span>
                  <div className="flex gap-2 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
                    <button
                      type="button"
                      onClick={() => setCategoriasActivas(null)}
                      className="hover:text-neutral-200"
                    >
                      Todas
                    </button>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => setCategoriasActivas(new Set())}
                      className="hover:text-neutral-200"
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {categorias.map(([categoria, count]) => {
                    const activa = categoriasActivas
                      ? categoriasActivas.has(categoria)
                      : true
                    return (
                      <button
                        key={categoria}
                        type="button"
                        onClick={() => toggleCategoria(categoria)}
                        aria-pressed={activa}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          activa
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-neutral-800 text-neutral-500'
                        }`}
                      >
                        {categoria} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {gestiones.length > 1 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
                      Gestión
                    </span>
                    <div className="flex gap-2 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
                      <button
                        type="button"
                        onClick={() => setGestionesActivas(null)}
                        className="hover:text-neutral-200"
                      >
                        Todas
                      </button>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => setGestionesActivas(new Set())}
                        className="hover:text-neutral-200"
                      >
                        Ninguna
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {gestiones.map(([gestion, count]) => {
                      const activa = gestionesActivas
                        ? gestionesActivas.has(gestion)
                        : true
                      return (
                        <button
                          key={gestion}
                          type="button"
                          onClick={() => toggleGestion(gestion)}
                          aria-pressed={activa}
                          className={`rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ${
                            activa
                              ? 'border-accent bg-accent/15 text-accent'
                              : 'border-neutral-800 text-neutral-500'
                          }`}
                        >
                          {gestion} ({count})
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-0 min-w-0 flex-1 border-t border-neutral-800/70 pt-2">
              {filtrados.length === 0 ? (
                <p className="p-3 text-sm text-neutral-500">Sin resultados.</p>
              ) : (
                <List
                  rowComponent={Fila}
                  rowCount={filtrados.length}
                  rowHeight={60}
                  rowProps={{
                    items: filtrados,
                    seleccionadoId: seleccionado?.id ?? null,
                    onSelect: (espacio) => setSeleccionadoId(espacio.id),
                  }}
                  style={{ height: '100%' } as CSSProperties}
                />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {seleccionado ? (
              <Ficha key={seleccionado.id} espacio={seleccionado} />
            ) : (
              <p className="text-sm text-neutral-500">
                Elegí un espacio de la lista para ver su ficha completa.
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export function ProvinceFullView() {
  const provinciaId = useMapStore((s) => s.provinciaSeleccionada)
  const vistaCompleta = useMapStore((s) => s.vistaCompleta)
  const espacioFocoId = useMapStore((s) => s.espacioFocoId)
  const localidadFocoId = useMapStore((s) => s.localidadFocoId)
  const setVistaCompleta = useMapStore((s) => s.setVistaCompleta)

  return (
    <AnimatePresence>
      {provinciaId && vistaCompleta && (
        <ProvinceFullViewContent
          key={provinciaId}
          provinciaId={provinciaId}
          espacioInicialId={espacioFocoId}
          localidadInicial={localidadFocoId}
          onCerrar={() => setVistaCompleta(false)}
        />
      )}
    </AnimatePresence>
  )
}
