import { create } from 'zustand'

export type Capa = 'densidad' | 'total'

interface MapState {
  capaActiva: Capa
  setCapaActiva: (capa: Capa) => void
}

export const useMapStore = create<MapState>((set) => ({
  capaActiva: 'densidad',
  setCapaActiva: (capa) => set({ capaActiva: capa }),
}))
