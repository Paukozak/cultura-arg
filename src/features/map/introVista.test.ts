import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INTRO_VISTA_KEY, marcarVista, yaVista } from './introVista'

// El entorno de tests es `node` (sin DOM): `window` y `localStorage` se
// reemplazan por dobles mínimos.
function almacenamientoEnMemoria() {
  const datos = new Map<string, string>()
  return {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  }
}

function simularUrl(search: string) {
  vi.stubGlobal('window', { location: { search } })
}

describe('bienvenida de mobile: una sola vez por dispositivo', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', almacenamientoEnMemoria())
    simularUrl('')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('en la primera visita todavía no se vio', () => {
    expect(yaVista()).toBe(false)
  })

  it('después de marcarla como vista, no vuelve a mostrarse', () => {
    marcarVista()
    expect(yaVista()).toBe(true)
  })

  it('la marca sobrevive entre visitas (queda en localStorage, no en memoria de la página)', () => {
    marcarVista()
    // Otra "visita": la página arranca de cero pero el almacenamiento sigue.
    simularUrl('')
    expect(localStorage.getItem(INTRO_VISTA_KEY)).toBe('1')
    expect(yaVista()).toBe(true)
  })

  it('con ?intro en la URL se muestra igual, aunque ya se haya visto', () => {
    marcarVista()
    simularUrl('?intro')
    expect(yaVista()).toBe(false)
    simularUrl('?foo=1&intro=1')
    expect(yaVista()).toBe(false)
  })

  it('un valor guardado que no sea la marca no cuenta como visto', () => {
    localStorage.setItem(INTRO_VISTA_KEY, 'cualquier-cosa')
    expect(yaVista()).toBe(false)
  })
})

describe('bienvenida de mobile: localStorage bloqueado', () => {
  beforeEach(() => {
    simularUrl('')
    // Navegación privada de Safari y similares: leer o escribir lanza.
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('yaVista no lanza y responde que no se vio (se muestra)', () => {
    expect(() => yaVista()).not.toThrow()
    expect(yaVista()).toBe(false)
  })

  it('marcarVista no lanza', () => {
    expect(() => marcarVista()).not.toThrow()
  })
})
