import { create } from 'zustand'

export type Capa = 'densidad' | 'total'

interface MapState {
  capaActiva: Capa
  setCapaActiva: (capa: Capa) => void
  provinciaSeleccionada: string | null
  seleccionarProvincia: (provinciaId: string | null) => void
  /** Provincia resaltada en el mapa desde FUERA de él: hoy, pasar el mouse
   * (o el foco de teclado) por su fila del ranking en el panel de información.
   * NationalMap la dibuja como si el cursor estuviera sobre ella. */
  provinciaResaltada: string | null
  resaltarProvincia: (provinciaId: string | null) => void
  /** Departamento resaltado en el choropleth desde FUERA de él: pasar el
   * mouse (o el foco de teclado) por su fila en la lista de departamentos del
   * panel de provincia (ver DepartamentosLista.tsx). DepartamentosChoropleth
   * la dibuja como si el cursor estuviera sobre ella — mismo patrón que
   * `provinciaResaltada`/`resaltarProvincia` para las provincias. */
  departamentoResaltado: string | null
  resaltarDepartamento: (departamentoId: string | null) => void
  vistaCompleta: boolean
  setVistaCompleta: (valor: boolean) => void
  /** Espacio a preseleccionar la próxima vez que se abra la vista completa
   * (p. ej. al hacer clic en la foto o el título de un destacado). */
  espacioFocoId: string | null
  abrirVistaCompleta: (espacioId?: string | null) => void
  /** Localidad por la que arranca filtrada la vista completa (buscador
   * global). Se limpia sola: `abrirVistaCompleta`,
   * `abrirVistaCompletaPorLocalidad` y `abrirVistaCompletaPorDepartamento`
   * se pisan mutuamente el foco del otro, así no queda un filtro de una
   * búsqueda anterior colgado en una apertura sin relación (p. ej. "ver
   * todos los espacios" del panel). */
  localidadFocoId: string | null
  abrirVistaCompletaPorLocalidad: (localidad: string) => void
  /** Departamento/partido por el que arranca filtrada la vista completa (clic
   * en una ficha del choropleth por departamento, Etapa 9 — ver
   * `DepartamentosChoropleth`). A diferencia de `localidadFocoId` (una sola
   * localidad puntual), un departamento suele contener varias localidades:
   * `ProvinceFullView` arranca con todas ELLAS tildadas en el filtro de
   * localidad, no con un filtro de departamento aparte. */
  departamentoFocoId: string | null
  abrirVistaCompletaPorDepartamento: (departamentoId: string) => void
  /** Cambia cada vez que hay que volver a hacer la animación de entrada del
   * mapa (las provincias "brotan"): NationalMap lo usa de `key` de ese
   * grupo. Hoy lo pide la bienvenida de mobile al cerrarse — la animación
   * de la carga inicial ocurre detrás de esa pantalla y nadie la vería. */
  entradaMapa: number
  reiniciarEntradaMapa: () => void
  /** Alto real del header en px, medido por el propio `Header` con
   * `ResizeObserver`. En desktop son siempre 64px, pero en mobile pasa a
   * dos filas (título+botones arriba, buscador abajo) y mide más — el
   * centrado vertical del zoom en NationalMap.tsx depende de este valor en
   * vez de una constante fija para no descentrarse en esa combinación. */
  headerHeight: number
  setHeaderHeight: (px: number) => void
  /** Tema visual actual — lo aplica de entrada el script bloqueante de
   * index.html (evita el flash del tema equivocado) escribiendo
   * `document.documentElement.dataset.theme`; esto solo lee ese valor para
   * que el resto de la app (p. ej. la sombra del mapa en NationalMap.tsx,
   * pensada para fondo oscuro) pueda reaccionar sin tener que leer el DOM
   * directamente. `ThemeToggle` es quien lo cambia. */
  tema: 'dark' | 'light'
  toggleTema: () => void
}

const TEMA_KEY = 'cca-tema'

function temaInicial(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export const useMapStore = create<MapState>((set) => ({
  capaActiva: 'densidad',
  setCapaActiva: (capa) => set({ capaActiva: capa }),
  provinciaSeleccionada: null,
  // Elegir una provincia limpia también el resaltado: la fila del ranking que
  // la resaltaba queda tapada por el panel de la provincia (o inerte) y el
  // navegador puede no mandar nunca el "mouse salió" — sin esto el resaltado
  // se quedaría pegado y reaparecería al volver al mapa.
  seleccionarProvincia: (provinciaId) =>
    set({
      provinciaSeleccionada: provinciaId,
      vistaCompleta: false,
      provinciaResaltada: null,
      departamentoResaltado: null,
    }),
  provinciaResaltada: null,
  resaltarProvincia: (provinciaId) => set({ provinciaResaltada: provinciaId }),
  departamentoResaltado: null,
  resaltarDepartamento: (departamentoId) =>
    set({ departamentoResaltado: departamentoId }),
  vistaCompleta: false,
  setVistaCompleta: (valor) => set({ vistaCompleta: valor }),
  espacioFocoId: null,
  abrirVistaCompleta: (espacioId = null) =>
    set({
      vistaCompleta: true,
      espacioFocoId: espacioId,
      localidadFocoId: null,
      departamentoFocoId: null,
    }),
  localidadFocoId: null,
  abrirVistaCompletaPorLocalidad: (localidad) =>
    set({
      vistaCompleta: true,
      espacioFocoId: null,
      localidadFocoId: localidad,
      departamentoFocoId: null,
    }),
  departamentoFocoId: null,
  abrirVistaCompletaPorDepartamento: (departamentoId) =>
    set({
      vistaCompleta: true,
      espacioFocoId: null,
      localidadFocoId: null,
      departamentoFocoId: departamentoId,
    }),
  entradaMapa: 0,
  reiniciarEntradaMapa: () =>
    set((state) => ({ entradaMapa: state.entradaMapa + 1 })),
  headerHeight: 64,
  setHeaderHeight: (px) => set({ headerHeight: px }),
  tema: temaInicial(),
  toggleTema: () =>
    set((state) => {
      const siguiente = state.tema === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = siguiente
      localStorage.setItem(TEMA_KEY, siguiente)
      return { tema: siguiente }
    }),
}))
