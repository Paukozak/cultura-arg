import { describe, expect, it } from 'vitest'
import { clusterizarPuntos, type PuntoProyectado } from './clusterizarPuntos'

function punto(id: string, x: number, y: number): PuntoProyectado {
  return { id, nombre: id, x, y }
}

describe('clusterizarPuntos', () => {
  it('sin puntos devuelve una lista vacía', () => {
    expect(clusterizarPuntos([], 10)).toEqual([])
  })

  it('un punto solo queda en su propia posición real, sin clustear', () => {
    const resultado = clusterizarPuntos([punto('a', 5, 5)], 10)
    expect(resultado).toEqual([{ x: 5, y: 5, items: [punto('a', 5, 5)] }])
  })

  it('dos puntos en la misma celda se agrupan en un cluster', () => {
    const resultado = clusterizarPuntos([punto('a', 1, 1), punto('b', 2, 2)], 10)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].items.map((p) => p.id).sort()).toEqual(['a', 'b'])
  })

  it('un cluster se ancla al centro de su celda, no al promedio de sus puntos', () => {
    // celda 10: puntos (1,1) y (9,9) caen en la misma celda [0,10)x[0,10),
    // el centro de esa celda es (5,5) — el promedio real sería (5,5) también
    // acá, así que se fuerza una asimetría para diferenciar los dos criterios.
    const resultado = clusterizarPuntos([punto('a', 0.5, 0.5), punto('b', 1.5, 1.5)], 10)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].x).toBe(5)
    expect(resultado[0].y).toBe(5)
  })

  it('puntos en celdas distintas quedan en clusters separados', () => {
    const resultado = clusterizarPuntos([punto('a', 1, 1), punto('b', 100, 100)], 10)
    expect(resultado).toHaveLength(2)
  })

  it('dos puntos justo a ambos lados de un límite de celda no se agrupan', () => {
    // celda de tamaño 10: x=9.9 cae en la celda 0, x=10.1 cae en la celda 1.
    const resultado = clusterizarPuntos([punto('a', 9.9, 5), punto('b', 10.1, 5)], 10)
    expect(resultado).toHaveLength(2)
  })

  it('una celda más chica (más zoom) separa puntos que antes clusteraban juntos', () => {
    const puntos = [punto('a', 1, 1), punto('b', 8, 8)]
    expect(clusterizarPuntos(puntos, 10)).toHaveLength(1)
    expect(clusterizarPuntos(puntos, 2)).toHaveLength(2)
  })
})
