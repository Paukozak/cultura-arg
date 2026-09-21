import { beforeEach, describe, expect, it } from 'vitest'
import { useMapStore } from './mapStore'

describe('resaltado de provincia desde el ranking', () => {
  beforeEach(() => {
    useMapStore.setState({
      provinciaSeleccionada: null,
      provinciaResaltada: null,
    })
  })

  it('resaltar guarda la provincia y null la quita', () => {
    useMapStore.getState().resaltarProvincia('14')
    expect(useMapStore.getState().provinciaResaltada).toBe('14')
    useMapStore.getState().resaltarProvincia(null)
    expect(useMapStore.getState().provinciaResaltada).toBeNull()
  })

  it('elegir una provincia limpia el resaltado: la fila que lo resaltaba queda tapada y puede no mandar nunca el "mouse salió"', () => {
    useMapStore.getState().resaltarProvincia('14')
    useMapStore.getState().seleccionarProvincia('14')

    const estado = useMapStore.getState()
    expect(estado.provinciaSeleccionada).toBe('14')
    expect(estado.provinciaResaltada).toBeNull()
  })

  it('volver al mapa (deseleccionar) tampoco deja un resaltado colgado', () => {
    useMapStore.getState().seleccionarProvincia('14')
    useMapStore.getState().resaltarProvincia('06')
    useMapStore.getState().seleccionarProvincia(null)

    expect(useMapStore.getState().provinciaResaltada).toBeNull()
  })
})
