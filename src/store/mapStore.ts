import { create } from 'zustand'

export type Capa = 'densidad' | 'total'

interface MapState {
  capaActiva: Capa
  setCapaActiva: (capa: Capa) => void
  provinciaSeleccionada: string | null
  seleccionarProvincia: (provinciaId: string | null) => void
  vistaCompleta: boolean
  setVistaCompleta: (valor: boolean) => void
  /** Espacio a preseleccionar la próxima vez que se abra la vista completa
   * (p. ej. al hacer clic en la foto o el título de un destacado). */
  espacioFocoId: string | null
  abrirVistaCompleta: (espacioId?: string | null) => void
  /** Localidad por la que arranca filtrada la vista completa (buscador
   * global). Se limpia sola: `abrirVistaCompleta` y
   * `abrirVistaCompletaPorLocalidad` se pisan mutuamente el foco del otro,
   * así no queda un filtro de una búsqueda anterior colgado en una
   * apertura sin relación (p. ej. "ver todos los espacios" del panel). */
  localidadFocoId: string | null
  abrirVistaCompletaPorLocalidad: (localidad: string) => void
  /** Rampa de color del mapa (Legend/NationalMap): violeta por defecto,
   * azul de ColorBrewer si está activado. Se guarda en localStorage —
   * mismo patrón que el tema — para que la elección persista entre
   * visitas. También se refleja en `data-daltonico` sobre `<html>` (ver
   * `index.css`) para que el color de acento de TODA la interfaz —no solo
   * el mapa— pase a azul: un acento violeta al lado de un mapa azul se leía
   * como dos paletas sueltas en vez de un solo modo coherente. */
  modoDaltonico: boolean
  toggleModoDaltonico: () => void
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
   * directamente. `SettingsMenu` es quien lo cambia. */
  tema: 'dark' | 'light'
  toggleTema: () => void
}

const MODO_DALTONICO_KEY = 'cca-daltonico'
const TEMA_KEY = 'cca-tema'

function modoDaltonicoInicial(): boolean {
  if (typeof localStorage === 'undefined') return false
  const activo = localStorage.getItem(MODO_DALTONICO_KEY) === '1'
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.daltonico = activo ? 'true' : 'false'
  }
  return activo
}

function temaInicial(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export const useMapStore = create<MapState>((set) => ({
  capaActiva: 'densidad',
  setCapaActiva: (capa) => set({ capaActiva: capa }),
  provinciaSeleccionada: null,
  seleccionarProvincia: (provinciaId) =>
    set({ provinciaSeleccionada: provinciaId, vistaCompleta: false }),
  vistaCompleta: false,
  setVistaCompleta: (valor) => set({ vistaCompleta: valor }),
  espacioFocoId: null,
  abrirVistaCompleta: (espacioId = null) =>
    set({
      vistaCompleta: true,
      espacioFocoId: espacioId,
      localidadFocoId: null,
    }),
  localidadFocoId: null,
  abrirVistaCompletaPorLocalidad: (localidad) =>
    set({
      vistaCompleta: true,
      espacioFocoId: null,
      localidadFocoId: localidad,
    }),
  modoDaltonico: modoDaltonicoInicial(),
  toggleModoDaltonico: () =>
    set((state) => {
      const siguiente = !state.modoDaltonico
      document.documentElement.dataset.daltonico = siguiente ? 'true' : 'false'
      localStorage.setItem(MODO_DALTONICO_KEY, siguiente ? '1' : '0')
      return { modoDaltonico: siguiente }
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
