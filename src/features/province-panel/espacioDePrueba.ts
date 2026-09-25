import type { Espacio } from '../../data/espacios'

export function espacio(
  overrides: Partial<Espacio> & Pick<Espacio, 'id' | 'categoria'>,
): Espacio {
  return {
    nombre: overrides.id,
    subcategoria: null,
    provinciaId: '99',
    departamentoId: null,
    departamento: null,
    localidad: null,
    lat: null,
    lon: null,
    anioInauguracion: null,
    gestion: null,
    direccion: null,
    telefono: null,
    mail: null,
    web: null,
    ...overrides,
  }
}
