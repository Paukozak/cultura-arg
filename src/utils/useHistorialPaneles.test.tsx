import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMapStore } from '../store/mapStore'
import { useHistorialPaneles } from './useHistorialPaneles'

// Córdoba (id '14' en el store, ver provincias-resumen.json) — cualquier
// provincia real sirve, esta no tiene nada especial.
const PROVINCIA_ID = '14'
const PROVINCIA_SLUG = 'cordoba'

function irA(pathname: string) {
  window.history.replaceState(null, '', pathname)
}

beforeEach(() => {
  useMapStore.setState({
    provinciaSeleccionada: null,
    vistaCompleta: false,
    espacioFocoId: null,
    localidadFocoId: null,
    departamentoFocoId: null,
    paginaNoEncontrada: false,
  })
})

afterEach(() => {
  cleanup()
})

describe('useHistorialPaneles', () => {
  it('URL inicial "/" no dispara ninguna restauración', () => {
    irA('/')

    renderHook(() => useHistorialPaneles())

    const estado = useMapStore.getState()
    expect(estado.provinciaSeleccionada).toBeNull()
    expect(estado.vistaCompleta).toBe(false)
    expect(estado.paginaNoEncontrada).toBe(false)
  })

  it('URL inicial "/provincia/:slug" restaura la provincia seleccionada con replaceState (sin agregar entrada)', () => {
    irA(`/provincia/${PROVINCIA_SLUG}`)
    const lengthAntes = window.history.length

    renderHook(() => useHistorialPaneles())

    const estado = useMapStore.getState()
    expect(estado.provinciaSeleccionada).toBe(PROVINCIA_ID)
    expect(estado.vistaCompleta).toBe(false)
    expect(window.history.length).toBe(lengthAntes)
    expect(window.history.state).toEqual({ ccaPanel: 1 })
  })

  it('URL inicial "/provincia/:slug/espacios" restaura provincia + vista completa', () => {
    irA(`/provincia/${PROVINCIA_SLUG}/espacios`)
    const lengthAntes = window.history.length

    renderHook(() => useHistorialPaneles())

    const estado = useMapStore.getState()
    expect(estado.provinciaSeleccionada).toBe(PROVINCIA_ID)
    expect(estado.vistaCompleta).toBe(true)
    expect(window.history.length).toBe(lengthAntes)
    expect(window.history.state).toEqual({ ccaPanel: 2 })
  })

  it('URL inicial con un slug inválido marca la página como no encontrada', () => {
    irA('/provincia/no-existe')

    renderHook(() => useHistorialPaneles())

    const estado = useMapStore.getState()
    expect(estado.paginaNoEncontrada).toBe(true)
    expect(estado.provinciaSeleccionada).toBeNull()
  })

  it('elegir una provincia con el panel cerrado empuja UNA entrada de historial', () => {
    irA('/')
    renderHook(() => useHistorialPaneles())
    const lengthAntes = window.history.length

    act(() => {
      useMapStore.getState().seleccionarProvincia(PROVINCIA_ID)
    })

    expect(window.history.length).toBe(lengthAntes + 1)
    expect(window.location.pathname).toBe(`/provincia/${PROVINCIA_SLUG}`)
  })

  it('abrir la vista completa con la provincia ya elegida empuja OTRA entrada (dos niveles de profundidad)', () => {
    irA('/')
    renderHook(() => useHistorialPaneles())

    act(() => {
      useMapStore.getState().seleccionarProvincia(PROVINCIA_ID)
    })
    const lengthTrasElegir = window.history.length

    act(() => {
      useMapStore.getState().abrirVistaCompleta()
    })

    expect(window.history.length).toBe(lengthTrasElegir + 1)
    expect(window.location.pathname).toBe(
      `/provincia/${PROVINCIA_SLUG}/espacios`,
    )
  })

  it('un popstate simulado con vista completa abierta la cierra pero deja la provincia seleccionada', () => {
    irA('/')
    renderHook(() => useHistorialPaneles())

    act(() => {
      useMapStore.getState().seleccionarProvincia(PROVINCIA_ID)
    })
    act(() => {
      useMapStore.getState().abrirVistaCompleta()
    })

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    const estado = useMapStore.getState()
    expect(estado.vistaCompleta).toBe(false)
    expect(estado.provinciaSeleccionada).toBe(PROVINCIA_ID)
  })

  it('cerrar la vista completa con el botón "volver" no deja una entrada fantasma: un atrás real después cierra el nivel siguiente, no uno de más', async () => {
    irA('/')
    renderHook(() => useHistorialPaneles())

    act(() => {
      useMapStore.getState().seleccionarProvincia(PROVINCIA_ID)
    })
    act(() => {
      useMapStore.getState().abrirVistaCompleta()
    })

    // El botón "volver" de ProvinceFullView cierra la vista completa directo
    // por el store, no con un gesto de atrás: el hook corrige el historial a
    // mano (`history.go`, asíncrono en el navegador) para no dejar una
    // entrada fantasma que se coma un "atrás" real más adelante.
    await act(async () => {
      useMapStore.getState().setVistaCompleta(false)
      await vi.waitFor(() => {
        expect(window.location.pathname).toBe(`/provincia/${PROVINCIA_SLUG}`)
      })
    })
    expect(useMapStore.getState().provinciaSeleccionada).toBe(PROVINCIA_ID)
    expect(useMapStore.getState().vistaCompleta).toBe(false)

    // Un atrás real desde acá tiene que cerrar el nivel siguiente (la
    // provincia) en un solo paso, no quedar "comido" por la entrada que el
    // hook ya corrigió arriba.
    await act(async () => {
      window.history.back()
      await vi.waitFor(() => {
        expect(useMapStore.getState().provinciaSeleccionada).toBeNull()
      })
    })
    expect(useMapStore.getState().vistaCompleta).toBe(false)
  })
})
