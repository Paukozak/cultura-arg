import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { List, type RowComponentProps } from 'react-window'
import { departamentosResumen } from '../../data/departamentos'
import { cargarEspacios, type Espacio } from '../../data/espacios'
import { provinciasGeo } from '../../data/provincias'
import { useMapStore } from '../../store/mapStore'
import {
  espaciosDeAgrupador as espaciosDeAgrupadorPuro,
  opcionesAgrupador as opcionesAgrupadorPuro,
  opcionesMostradas as opcionesMostradasPuro,
  resumenAgrupador as resumenAgrupadorPuro,
  type ModoAgrupador,
} from './agruparEspacios'
import { ICONOS_POR_CATEGORIA, ICONO_POR_DEFECTO } from './categoriaIcons'
import { nombreMostradoPara } from './curaduriaDestacados'
import { EspacioFoto } from './EspacioFoto'
import {
  alternarTodos,
  alternarValorFiltro,
  etiquetaVerEspacios,
  filtrarYOrdenarEspacios,
  hayFiltrosAplicados,
  ORDEN_LABEL,
  type Orden,
} from './filtrarEspacios'
import { GoogleMapsEmbed } from './GoogleMapsEmbed'
import { IconoFlechaAtras } from './IconoFlechaAtras'

/** Nombre de comuna/departamento por id (p. ej. "02007" -> "Comuna 1") — para
 * CABA, donde el filtro de localidad se reemplaza por comuna (ver
 * `ProvinceFullViewContent`, `esCaba`). */
const NOMBRE_DEPARTAMENTO_POR_ID = new Map(
  departamentosResumen.map((d) => [d.id, d.nombre]),
)

/** Nombre a mostrar: el editorial curado (ver destacados-curados.json) si
 * existe, si no el de la fuente. Antes esto solo se aplicaba en el panel de
 * destacados; se usa acá también para que sea el mismo nombre en la ficha de
 * la vista completa. */
function nombreEfectivo(espacio: Espacio): string {
  return nombreMostradoPara(espacio.id) ?? espacio.nombre ?? ''
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
        nombreMapa={espacio.nombreMapa ?? espacio.categoria}
        direccionMapa={espacio.direccionMapa}
        localidad={espacio.localidad}
        lat={espacio.lat}
        lon={espacio.lon}
        className="mt-1"
        alto="h-72 lg:h-[28rem]"
      />
    </div>
  )
}

function ProvinceFullViewContent({
  provinciaId,
  espacioInicialId,
  localidadInicial,
  departamentoIdInicial,
  onCerrar,
}: {
  provinciaId: string
  espacioInicialId: string | null
  localidadInicial: string | null
  departamentoIdInicial: string | null
  onCerrar: () => void
}) {
  // CABA es un caso aparte: SInCA no distingue localidades ahí (todos sus
  // espacios comparten una sola, "Ciudad Autónoma de Buenos Aires" — ver
  // `forzarLocalidadCaba` en process-data.mjs), así que filtrar por
  // localidad no sirve para nada. Se reemplaza por comuna (`departamentoId`,
  // ya asignado por geocodificación real — ver `asignarComunasCaba`), que sí
  // distingue. El resto de las provincias sigue filtrando por localidad.
  const esCaba = provinciaId === '02'

  const [espacios, setEspacios] = useState<Espacio[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('alfabetico')
  // CABA arranca (y queda forzada) en 'departamento', sin selector — ver
  // `esCaba` arriba. El resto de las provincias arranca en 'localidad' y
  // puede cambiar a 'departamento' con el toggle de abajo.
  const [modoAgrupador, setModoAgrupador] = useState<ModoAgrupador>(
    esCaba ? 'departamento' : 'localidad',
  )
  const [categoriasActivas, setCategoriasActivas] =
    useState<Set<string> | null>(null)
  const [gestionesActivas, setGestionesActivas] = useState<Set<string> | null>(
    null,
  )
  // Igual que categoriasActivas/gestionesActivas: `null` = todas, un Set
  // (aunque vacío) filtra a esas localidades/comunas puntuales. Si se llega
  // acá desde el buscador global con una localidad puntual, arranca con esa
  // sola marcada en vez de "todas" — salvo en CABA, donde este filtro pasa a
  // ser por comuna y una localidad puntual (siempre la misma, ver arriba) no
  // tiene sentido como valor inicial.
  const [agrupadorActivo, setAgrupadorActivo] = useState<Set<string> | null>(
    localidadInicial && !esCaba ? new Set([localidadInicial]) : null,
  )
  // Filtra la propia lista de opciones del selector (no la lista de
  // espacios: eso lo hace `busqueda`) — con cientos de localidades por
  // provincia, tipear para encontrar la que se busca es más rápido que
  // scrollear una lista larga de checkboxes.
  const [busquedaAgrupador, setBusquedaAgrupador] = useState('')
  // El picker arranca plegado — es una lista que puede tener cientos de
  // filas, así que solo se arma/muestra al hacer clic en su gatillo (mismo
  // patrón de click-afuera-cierra que GlobalSearch.tsx).
  const [agrupadorAbierto, setAgrupadorAbierto] = useState(false)
  const agrupadorRef = useRef<HTMLDivElement>(null)
  const botonAgrupadorRef = useRef<HTMLButtonElement>(null)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    espacioInicialId,
  )
  // Arrancan plegados en todos los tamaños: en mobile los filtros ocupan la
  // pantalla entera al abrirse (ver el botón "Ver N espacios") y lo primero
  // que se quiere ver es la lista; en desktop lo primero que se quiere ver
  // es la lista de espacios de la provincia, no el panel de filtros.
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  // Mobile: lista y ficha no entran apiladas en una sola pantalla (los
  // chips de categoría solos pueden ocupar varias líneas), así que se
  // muestra una u otra — nunca las dos — y se navega entre ellas como dos
  // pantallas separadas. Desde `md:` en las clases de abajo esta variable
  // se ignora y todo convive lado a lado (dos columnas en `md`, tres —
  // filtros, espacios y ficha — desde `lg`). Arranca
  // en la ficha si se entró con un espacio puntual ya elegido (buscador
  // global): ahí lo que se quiere ver es esa ficha, no la lista.
  const [vistaMobil, setVistaMobil] = useState<'lista' | 'ficha'>(
    espacioInicialId ? 'ficha' : 'lista',
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

  // Clic en una ficha del choropleth por departamento (ver
  // DepartamentosChoropleth) o en la lista de departamentos (ver
  // DepartamentosLista): el departamento clickeado ES la propia clave del
  // filtro, así que alcanza con pasar el agrupador a modo 'departamento' y
  // tildarlo directo — sin esperar a que carguen los espacios ni traducirlo
  // a localidades. Se aplica UNA sola vez (con `aplicado`, no en
  // `[agrupadorActivo]`/`[modoAgrupador]` entre las dependencias): si no,
  // cada vez que el usuario cambiara de modo o destildara una opción a mano
  // el efecto la volvería a pisar.
  const departamentoInicialAplicado = useRef(false)
  useEffect(() => {
    if (!departamentoIdInicial) return
    if (departamentoInicialAplicado.current) return
    departamentoInicialAplicado.current = true
    setModoAgrupador('departamento')
    setAgrupadorActivo(new Set([departamentoIdInicial]))
  }, [departamentoIdInicial])

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

  useEffect(() => {
    if (!agrupadorAbierto) return
    function cerrar() {
      setAgrupadorAbierto(false)
      botonAgrupadorRef.current?.focus()
    }
    function onPointerDown(e: PointerEvent) {
      if (!agrupadorRef.current?.contains(e.target as Node)) cerrar()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [agrupadorAbierto])

  const provincia = provinciasGeo.features.find(
    (f) => f.properties.id === provinciaId,
  )

  // Base para los números de categoría/gestión: los espacios de la
  // provincia recortados por la(s) localidad(es)/comuna(s) elegida(s) (si
  // hay), para que esos conteos —y qué chips aparecen— correspondan a esa
  // selección en vez de a la provincia entera. Ojo: es la única otra cosa
  // que los recorta a propósito; categoría y gestión no se recortan entre sí
  // (si no, tildar una categoría achicaría la lista de gestiones y
  // viceversa). Lógica en agruparEspacios.ts (testeada ahí sin montar el
  // componente).
  const espaciosDeAgrupador = useMemo(
    () =>
      espaciosDeAgrupadorPuro(espacios ?? [], agrupadorActivo, modoAgrupador),
    [espacios, agrupadorActivo, modoAgrupador],
  )

  const categorias = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const e of espaciosDeAgrupador)
      conteo.set(e.categoria, (conteo.get(e.categoria) ?? 0) + 1)
    return [...conteo.entries()].sort((a, b) => b[1] - a[1])
  }, [espaciosDeAgrupador])

  const gestiones = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const e of espaciosDeAgrupador) {
      const clave = e.gestion ?? 'sin dato'
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
    }
    return [...conteo.entries()]
  }, [espaciosDeAgrupador])

  // La localidad/comuna puede tener cientos de valores distintos (Buenos
  // Aires) — a diferencia de categoría/gestión, no entra como chips sueltos:
  // va en una lista de checkboxes con buscador propio, con conteos. `clave`
  // es lo que se guarda en `agrupadorActivo` (id de comuna o nombre de
  // localidad); `etiqueta` es lo que se muestra — en CABA son distintos (id
  // -> "Comuna 1"), en el resto son el mismo string.
  // Todos los departamentos de la provincia según departamentos-resumen.json
  // (no solo los que tienen espacios cargados): sin esto, un departamento
  // con 0 espacios (p. ej. Ramón Lista en Formosa) no aparecería en el
  // picker aunque el choropleth sí lo pinte — ver `opcionesAgrupador` en
  // agruparEspacios.ts.
  const departamentosDeProvincia = useMemo(
    () =>
      departamentosResumen
        .filter((d) => d.provinciaId === provinciaId)
        .map((d) => d.id),
    [provinciaId],
  )

  const opcionesAgrupador = useMemo(
    () =>
      opcionesAgrupadorPuro(
        espacios ?? [],
        modoAgrupador,
        esCaba,
        NOMBRE_DEPARTAMENTO_POR_ID,
        departamentosDeProvincia,
      ),
    [espacios, modoAgrupador, esCaba, departamentosDeProvincia],
  )

  // Texto del gatillo del picker (plegado): qué está eligiendo sin tener
  // que abrirlo. Mismo criterio de "todas" que categoría/gestión — un Set
  // que terminó incluyendo a todas cuenta como "todas", no como "3 de 3".
  const resumenAgrupador = useMemo(
    () => resumenAgrupadorPuro(agrupadorActivo, opcionesAgrupador),
    [agrupadorActivo, opcionesAgrupador],
  )

  const opcionesMostradas = useMemo(
    () => opcionesMostradasPuro(opcionesAgrupador, busquedaAgrupador),
    [opcionesAgrupador, busquedaAgrupador],
  )

  const filtrosActuales =
    modoAgrupador === 'departamento'
      ? {
          busqueda,
          categoriasActivas,
          gestionesActivas,
          departamentosActivos: agrupadorActivo,
        }
      : {
          busqueda,
          categoriasActivas,
          gestionesActivas,
          localidadesActivas: agrupadorActivo,
        }

  const filtrados = useMemo(() => {
    if (!espacios) return []
    return filtrarYOrdenarEspacios(espacios, filtrosActuales, orden)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    espacios,
    busqueda,
    categoriasActivas,
    gestionesActivas,
    agrupadorActivo,
    modoAgrupador,
    orden,
  ])

  const conFiltrosAplicados = hayFiltrosAplicados(filtrosActuales)

  // Por default se muestra la ficha del primero de la lista filtrada; si el
  // usuario eligió uno que sigue en el filtro actual, se respeta esa elección.
  const seleccionado = useMemo(() => {
    if (filtrados.length === 0) return null
    return filtrados.find((e) => e.id === seleccionadoId) ?? filtrados[0]
  }, [filtrados, seleccionadoId])

  // "Todas" es su propio chip, excluyente con el resto (ver
  // alternarValorFiltro/alternarTodos en filtrarEspacios.ts, donde vive la
  // lógica de verdad — acá solo se cablea al estado de cada filtro).
  function toggleCategoria(categoria: string) {
    setCategoriasActivas((prev) => alternarValorFiltro(prev, categoria))
  }

  function toggleGestion(gestion: string) {
    setGestionesActivas((prev) => alternarValorFiltro(prev, gestion))
  }

  function toggleAgrupador(clave: string) {
    setAgrupadorActivo((prev) => alternarValorFiltro(prev, clave))
  }

  function toggleTodasCategoria() {
    setCategoriasActivas(alternarTodos)
  }

  function toggleTodasGestion() {
    setGestionesActivas(alternarTodos)
  }

  function toggleTodosAgrupador() {
    setAgrupadorActivo(alternarTodos)
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
          <IconoFlechaAtras />
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
          {/* Desktop (`lg:`): tres columnas — filtros, espacios y ficha. Este
              contenedor pasa a `contents` (deja de generar caja) para que
              filtros y lista sean hijos directos de la fila y cada uno sea
              su propia columna. Debajo de `lg` sigue siendo una sola caja
              con filtros arriba y lista abajo (dos columnas en `md`, una
              pantalla a la vez en mobile). */}
          <div
            className={`w-full min-w-0 min-h-0 flex-col max-md:flex-1 border-b border-neutral-800 md:flex md:w-[380px] md:flex-shrink-0 md:border-b-0 md:border-r lg:contents ${
              vistaMobil === 'lista' ? 'flex' : 'hidden'
            }`}
          >
            {/* Los filtros (buscador hasta Gestión) scrollean en su propio
                bloque, con techo propio: sin este límite, una provincia con
                muchas categorías (chips que se envuelven en varias líneas)
                podía empujar la lista de abajo hasta dejarla con 0px de
                alto (el `flex-1 min-h-0` de la lista se achica sin piso) —
                ahí no faltaban opciones, estaban ahí pero sin cómo verlas
                ni scrollear hasta ellas. En `lg:` ya no comparten columna
                con la lista, así que el techo se saca y ocupan todo el
                alto. */}
            <div
              className={`flex min-h-0 flex-col lg:shrink-0 lg:overflow-hidden lg:border-r lg:border-neutral-800 lg:transition-[width] lg:duration-200 ${
                filtrosAbiertos ? 'max-md:flex-1 lg:w-80' : 'lg:w-12'
              }`}
            >
              {/* Plegar los filtros: en `lg:` la columna se achica a un riel
                  angosto (solo el ícono y la flecha, apilados) y le deja el
                  lugar a la lista y la ficha; debajo de `lg` el bloque se
                  esconde y la lista sube. El punto sobre el ícono avisa que
                  hay filtros aplicados aunque no se los vea. */}
              <button
                type="button"
                onClick={() => setFiltrosAbiertos((abiertos) => !abiertos)}
                aria-expanded={filtrosAbiertos}
                aria-controls="filtros-espacios"
                aria-label={
                  filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros'
                }
                title={filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros'}
                className={`flex shrink-0 items-center gap-2 border-b border-neutral-800 px-4 py-2.5 text-left font-mono text-xs uppercase tracking-wide text-neutral-400 transition-colors hover:text-neutral-100 ${
                  filtrosAbiertos ? '' : 'lg:flex-col lg:gap-3 lg:px-0 lg:py-3'
                }`}
              >
                <span className="relative">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  {conFiltrosAplicados && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />
                  )}
                </span>
                <span
                  className={filtrosAbiertos ? 'flex-1' : 'flex-1 lg:hidden'}
                >
                  Filtros
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform ${
                    filtrosAbiertos
                      ? 'rotate-180 lg:rotate-90'
                      : 'lg:-rotate-90'
                  }`}
                />
              </button>
              <div
                id="filtros-espacios"
                className={`min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:max-h-[42vh] md:flex-none lg:max-h-none lg:w-80 lg:flex-1 ${
                  filtrosAbiertos ? 'flex' : 'hidden'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
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

                <div ref={agrupadorRef} className="relative">
                  {/* Solo fuera de CABA: ahí el agrupador queda forzado en
                      comuna (ver `esCaba` arriba), sin selector. Cambiar de
                      modo resetea `agrupadorActivo` para no dejar colgada
                      una selección del modo anterior (una localidad tildada
                      no significa nada al pasar a departamento, y viceversa). */}
                  {!esCaba && (
                    <div className="mb-1.5 flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setModoAgrupador('localidad')
                          setAgrupadorActivo(null)
                        }}
                        aria-pressed={modoAgrupador === 'localidad'}
                        className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                          modoAgrupador === 'localidad'
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-neutral-800 text-neutral-500'
                        }`}
                      >
                        Localidad
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModoAgrupador('departamento')
                          setAgrupadorActivo(null)
                        }}
                        aria-pressed={modoAgrupador === 'departamento'}
                        className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                          modoAgrupador === 'departamento'
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-neutral-800 text-neutral-500'
                        }`}
                      >
                        Departamento
                      </button>
                    </div>
                  )}
                  <span className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-neutral-500">
                    {esCaba
                      ? 'Comuna'
                      : modoAgrupador === 'departamento'
                        ? 'Departamento'
                        : 'Localidad'}
                  </span>
                  {/* Gatillo: la lista (buscador + checkboxes) solo se arma
                      y se muestra al abrirlo, no ocupa lugar de entrada. */}
                  <button
                    ref={botonAgrupadorRef}
                    type="button"
                    onClick={() => setAgrupadorAbierto((abierta) => !abierta)}
                    aria-expanded={agrupadorAbierto}
                    aria-controls="agrupador-picker"
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-200"
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {resumenAgrupador}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform ${
                        agrupadorAbierto ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {agrupadorAbierto && (
                    <div
                      id="agrupador-picker"
                      className="absolute left-0 right-0 top-full z-10 mt-1.5 rounded-md border border-neutral-800 bg-neutral-950 p-1.5 shadow-lg shadow-black/40"
                    >
                      <input
                        type="search"
                        autoFocus
                        value={busquedaAgrupador}
                        onChange={(e) => setBusquedaAgrupador(e.target.value)}
                        placeholder={
                          esCaba
                            ? 'Buscar comuna…'
                            : modoAgrupador === 'departamento'
                              ? 'Buscar departamento…'
                              : 'Buscar localidad…'
                        }
                        className="mb-1.5 w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600"
                      />
                      <div className="max-h-52 overflow-y-auto rounded-md border border-neutral-800">
                        {/* "Todas" fija arriba de la lista (no se filtra con
                            el buscador): excluyente con el resto, igual que
                            en Categoría/Gestión — ver toggleAgrupador. */}
                        <label className="flex cursor-pointer items-center gap-2 border-b border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900">
                          <input
                            type="checkbox"
                            checked={agrupadorActivo === null}
                            onChange={toggleTodosAgrupador}
                            className="accent-accent"
                          />
                          <span className="min-w-0 flex-1 truncate">Todas</span>
                          <span className="shrink-0 text-neutral-500">
                            {espacios.length}
                          </span>
                        </label>
                        {opcionesMostradas.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs text-neutral-500">
                            Sin resultados.
                          </p>
                        ) : (
                          opcionesMostradas.map(
                            ({ clave, etiqueta, count }) => {
                              const activa = agrupadorActivo
                                ? agrupadorActivo.has(clave)
                                : false
                              return (
                                <label
                                  key={clave}
                                  className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
                                >
                                  <input
                                    type="checkbox"
                                    checked={activa}
                                    onChange={() => toggleAgrupador(clave)}
                                    className="accent-accent"
                                  />
                                  <span className="min-w-0 flex-1 truncate">
                                    {etiqueta}
                                  </span>
                                  <span className="shrink-0 text-neutral-500">
                                    {count}
                                  </span>
                                </label>
                              )
                            },
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <span className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-neutral-500">
                    Categoría
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {/* "Todas" es un chip más, excluyente con el resto: no
                        puede convivir marcado con una categoría puntual (ver
                        toggleCategoria). */}
                    <button
                      type="button"
                      onClick={toggleTodasCategoria}
                      aria-pressed={categoriasActivas === null}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        categoriasActivas === null
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-neutral-800 text-neutral-500'
                      }`}
                    >
                      Todas ({espaciosDeAgrupador.length})
                    </button>
                    {categorias.map(([categoria, count]) => {
                      const activa = categoriasActivas
                        ? categoriasActivas.has(categoria)
                        : false
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
                    <span className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-neutral-500">
                      Gestión
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={toggleTodasGestion}
                        aria-pressed={gestionesActivas === null}
                        className={`rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ${
                          gestionesActivas === null
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-neutral-800 text-neutral-500'
                        }`}
                      >
                        Todas ({espaciosDeAgrupador.length})
                      </button>
                      {gestiones.map(([gestion, count]) => {
                        const activa = gestionesActivas
                          ? gestionesActivas.has(gestion)
                          : false
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
              {/* Solo mobile: con los filtros abiertos ocupan toda la pantalla
                  (la lista se esconde), así que hace falta una salida clara
                  que además diga cuánto quedó filtrado. */}
              {filtrosAbiertos && (
                <div className="shrink-0 border-t border-neutral-800 p-3 md:hidden">
                  <button
                    type="button"
                    onClick={() => setFiltrosAbiertos(false)}
                    className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
                  >
                    {etiquetaVerEspacios(filtrados.length)}
                  </button>
                </div>
              )}
            </div>

            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col border-t border-neutral-800/70 lg:w-85 lg:flex-none lg:border-r lg:border-t-0 lg:border-neutral-800 ${
                filtrosAbiertos ? 'max-md:hidden' : ''
              }`}
            >
              {/* El buscador va con la lista de espacios (no con los demás
                  filtros): es lo primero que se usa al entrar a la vista
                  completa, y acá queda a la vista sin depender de que el
                  panel de filtros esté desplegado. */}
              <div className="shrink-0 px-3 pb-2 pt-3">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o localidad…"
                  className="w-full rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-600"
                />
              </div>
              <div className="min-h-0 flex-1">
                {filtrados.length === 0 ? (
                  <p className="p-3 text-sm text-neutral-500">
                    Sin resultados.
                  </p>
                ) : (
                  <List
                    rowComponent={Fila}
                    rowCount={filtrados.length}
                    rowHeight={60}
                    rowProps={{
                      items: filtrados,
                      seleccionadoId: seleccionado?.id ?? null,
                      onSelect: (espacio) => {
                        setSeleccionadoId(espacio.id)
                        setVistaMobil('ficha')
                      },
                    }}
                    style={{ height: '100%' } as CSSProperties}
                  />
                )}
              </div>
            </div>
          </div>

          <div
            className={`min-w-0 flex-1 flex-col overflow-y-auto p-6 md:flex lg:px-10 xl:px-14 ${
              vistaMobil === 'ficha' ? 'flex' : 'hidden'
            }`}
          >
            <button
              type="button"
              onClick={() => setVistaMobil('lista')}
              className="mb-4 flex items-center gap-1.5 self-start text-sm text-neutral-400 transition-colors hover:text-neutral-100 md:hidden"
            >
              <IconoFlechaAtras />
              Volver a la lista
            </button>
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
  const departamentoFocoId = useMapStore((s) => s.departamentoFocoId)
  const setVistaCompleta = useMapStore((s) => s.setVistaCompleta)

  return (
    <AnimatePresence>
      {provinciaId && vistaCompleta && (
        <ProvinceFullViewContent
          key={provinciaId}
          provinciaId={provinciaId}
          espacioInicialId={espacioFocoId}
          localidadInicial={localidadFocoId}
          departamentoIdInicial={departamentoFocoId}
          onCerrar={() => setVistaCompleta(false)}
        />
      )}
    </AnimatePresence>
  )
}
