import { describe, expect, it } from 'vitest'

// Los CSV de origen traen teléfonos con coma ("49,012,932"): el separador de
// miles que le puso la planilla a un número que en realidad es un teléfono.
// La limpieza vive en scripts/process-data.mjs, que el CI no ejecuta, así que
// este test mira el resultado ya generado: si alguien regenera los datos con
// el script roto (o a mano) y vuelven las comas, falla acá.
//
// Lee el JSON crudo (tuplas posicionales, ver `cargarEspacios` en
// espacios.ts) en vez de pasar por el decoder de la app a propósito: el
// objetivo es auditar el archivo que efectivamente generó el script, no la
// reconstrucción que hace la app a partir de él.
const ID = 0
const TELEFONO = 12
interface EspaciosProvinciaJSON {
  espacios: [id: string, ...resto: unknown[]][]
}
const porProvincia = import.meta.glob<EspaciosProvinciaJSON>(
  './espacios/*.json',
  { eager: true, import: 'default' },
)
const filas = Object.values(porProvincia).flatMap((mod) => mod.espacios)
const telefonos = filas.map((fila) => ({
  id: fila[ID],
  telefono: fila[TELEFONO] as string | null,
}))

describe('teléfonos de los espacios', () => {
  it('hay datos cargados (el test no pasa en vacío)', () => {
    expect(telefonos.length).toBeGreaterThan(10_000)
    expect(telefonos.filter((e) => e.telefono).length).toBeGreaterThan(1_000)
  })

  it('ningún teléfono tiene comas', () => {
    const conComa = telefonos
      .filter((e) => e.telefono?.includes(','))
      .map((e) => `${e.id}: ${e.telefono}`)
    expect(conComa).toEqual([])
  })
})
