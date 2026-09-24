import { describe, expect, it } from 'vitest'
import {
  apagarConFondo,
  buildColorScales,
  colorForFeature,
  darken,
  desglosarEscala,
  highlightStroke,
  pasosActivos,
  SIN_DATOS_COLOR,
  type ConEstadisticas,
} from './colorScales'

function feature(
  totalEspacios: number,
  densidadPor100k: number | null,
): {
  properties: ConEstadisticas
} {
  return { properties: { totalEspacios, densidadPor100k } }
}

describe('darken', () => {
  it('con cantidad 0 no cambia el color', () => {
    expect(darken('#3182bd', 0)).toBe('#3182bd')
  })

  it('con cantidad 1 da negro', () => {
    expect(darken('#3182bd', 1)).toBe('#000000')
  })

  it('reduce cada canal proporcionalmente', () => {
    // rojo puro (255,0,0) al 50%: 255*0.5 = 127.5 -> redondea a 128 = 0x80
    expect(darken('#ff0000', 0.5)).toBe('#800000')
  })

  it('nunca aclara (cantidad negativa no es un uso soportado, pero un color ya oscuro sigue oscureciendo)', () => {
    // caso real de uso: oscurecer un color ya bien oscuro sigue dando un
    // resultado válido (no explota ni se sale del rango 00-ff)
    const resultado = darken('#08519c', 0.4)
    expect(resultado).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('highlightStroke', () => {
  it('es lo mismo que oscurecer un 40%', () => {
    expect(highlightStroke('#6baed6')).toBe(darken('#6baed6', 0.4))
  })
})

describe('apagarConFondo', () => {
  it('arma un color-mix con el porcentaje de fondo = 1 - opacidad', () => {
    expect(apagarConFondo('#3182bd', 0.7)).toBe(
      'color-mix(in srgb, var(--color-neutral-950) 30%, #3182bd)',
    )
  })

  it('opacidad 1 no mezcla nada de fondo (0%)', () => {
    expect(apagarConFondo('#3182bd', 1)).toBe(
      'color-mix(in srgb, var(--color-neutral-950) 0%, #3182bd)',
    )
  })

  it('opacidad 0 es 100% fondo', () => {
    expect(apagarConFondo('#3182bd', 0)).toBe(
      'color-mix(in srgb, var(--color-neutral-950) 100%, #3182bd)',
    )
  })
})

describe('pasosActivos', () => {
  it('devuelve los 5 escalones de la rampa, de más claro a más oscuro', () => {
    const pasos = pasosActivos()
    expect(pasos).toHaveLength(5)
    expect(pasos[0]).toBe('#eff3ff')
    expect(pasos[4]).toBe('#08519c')
  })
})

describe('buildColorScales + colorForFeature', () => {
  const features = [
    feature(10, 5),
    feature(20, 10),
    feature(30, 15),
    feature(40, 20),
    feature(1000, null), // CABA-like: mucho total, sin densidad (sin población)
  ]
  const scales = buildColorScales(features)

  it('a mayor total de espacios, un escalón de color igual o más oscuro (nunca más claro)', () => {
    const pasos = pasosActivos()
    let ultimoIndice = -1
    for (const f of [...features].sort(
      (a, b) => a.properties.totalEspacios - b.properties.totalEspacios,
    )) {
      const color = colorForFeature(f.properties, 'total', scales)
      const indice = pasos.indexOf(color)
      expect(indice).toBeGreaterThanOrEqual(ultimoIndice)
      ultimoIndice = indice
    }
  })

  it('capa "densidad": un feature sin densidadPor100k (sin población) siempre da el color "sin datos", pase lo que pase con totalEspacios', () => {
    const sinDatos = feature(1000, null)
    expect(colorForFeature(sinDatos.properties, 'densidad', scales)).toBe(
      SIN_DATOS_COLOR,
    )
  })

  it('capa "densidad": con densidad numérica, usa la escala de densidad (nunca el color "sin datos")', () => {
    const conDatos = feature(10, 5)
    expect(colorForFeature(conDatos.properties, 'densidad', scales)).not.toBe(
      SIN_DATOS_COLOR,
    )
  })

  it('capa "total" ignora la densidad por completo (un total alto nunca da "sin datos")', () => {
    expect(
      colorForFeature(feature(1000, null).properties, 'total', scales),
    ).not.toBe(SIN_DATOS_COLOR)
  })

  it('la densidad null se excluye del dominio de la escala de densidad (no corre los cuantiles)', () => {
    // Si el null entrara al dominio como 0, cambiaría dónde caen los cortes
    // para el resto de las provincias. Con 4 valores reales (5,10,15,20) y
    // un null descartado, el menor y el mayor deben ir a los escalones
    // extremos de la rampa.
    const pasos = pasosActivos()
    expect(
      colorForFeature(
        { totalEspacios: 0, densidadPor100k: 5 },
        'densidad',
        scales,
      ),
    ).toBe(pasos[0])
    expect(
      colorForFeature(
        { totalEspacios: 0, densidadPor100k: 20 },
        'densidad',
        scales,
      ),
    ).toBe(pasos[4])
  })
})

describe('desglosarEscala', () => {
  it('tiene un escalón por cada color de la rampa, con min/max crecientes', () => {
    const { totalScale } = buildColorScales([
      feature(1, null),
      feature(2, null),
      feature(3, null),
      feature(10, null),
      feature(50, null),
    ])
    const escalones = desglosarEscala(totalScale)
    expect(escalones).toHaveLength(5)
    expect(escalones.map((e) => e.color)).toEqual(pasosActivos())

    // el mínimo absoluto de los datos es el min del primer escalón, el
    // máximo absoluto es el max del último
    expect(escalones[0].min).toBe(1)
    expect(escalones[4].max).toBe(50)

    // cada escalón cubre un rango >= al anterior (no se superponen "hacia atrás")
    for (let i = 1; i < escalones.length; i++) {
      expect(escalones[i].min).toBeGreaterThanOrEqual(escalones[i - 1].min)
    }
  })
})
