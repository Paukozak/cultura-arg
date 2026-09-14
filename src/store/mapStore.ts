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
    set({ vistaCompleta: true, espacioFocoId: espacioId, localidadFocoId: null }),
  localidadFocoId: null,
  abrirVistaCompletaPorLocalidad: (localidad) =>
    set({ vistaCompleta: true, espacioFocoId: null, localidadFocoId: localidad }),
}))
