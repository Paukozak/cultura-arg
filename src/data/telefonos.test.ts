import { describe, expect, it } from 'vitest'
import type { Espacio } from './espacios'

// Los CSV de origen traen teléfonos con coma ("49,012,932"): el separador de
// miles que le puso la planilla a un número que en realidad es un teléfono.
// La limpieza vive en scripts/process-data.mjs, que el CI no ejecuta, así que
// este test mira el resultado ya generado: si alguien regenera los datos con
// el script roto (o a mano) y vuelven las comas, falla acá.
const porProvincia = import.meta.glob<Espacio[]>('./espacios/*.json', {
  eager: true,
  import: 'default',
})
const espacios = Object.values(porProvincia).flat()

describe('teléfonos de los espacios', () => {
  it('hay datos cargados (el test no pasa en vacío)', () => {
    expect(espacios.length).toBeGreaterThan(10_000)
    expect(espacios.filter((e) => e.telefono).length).toBeGreaterThan(1_000)
  })

  it('ningún teléfono tiene comas', () => {
    const conComa = espacios
      .filter((e) => e.telefono?.includes(','))
      .map((e) => `${e.id}: ${e.telefono}`)
    expect(conComa).toEqual([])
  })
})
