// Correcciones puntuales para que la búsqueda en Google Maps encuentre el
// lugar real: a veces la dirección de SInCA está mal (número equivocado,
// calle vieja) y a veces el nombre oficial/administrativo no es el que
// aparece en Google Maps. Cada entrada corrige solo lo que haga falta —
// nombreMapa y direccionNueva son independientes y opcionales.
export const CORRECCIONES_MAPA = [
  {
    id: 'sitios-patrimonio-unesco-8',
    nombre: 'Quebrada de Humahuaca',
    direccionNueva: 'Hondonada',
    motivo: 'No tenía dirección (es un sitio natural extenso, no un edificio).',
  },
  {
    id: 'monumentos-y-lugares-historicos-1122',
    nombre: 'Casa que habito el Gral. Martín Miguel de Güemes',
    nombreMapa: 'Museo Güemes',
    motivo:
      'La dirección ya era correcta; el nombre oficial no es el que usa Google Maps.',
  },
  {
    id: 'bibliotecas-especializadas-1433',
    nombre: 'Biblioteca Central Prof. Miguel D. Ivancovich',
    nombreMapa: 'Biblioteca UNaF',
    motivo:
      'La dirección ya era correcta; el nombre oficial no es el que usa Google Maps.',
  },
  {
    id: 'museos-201',
    nombre: 'Museo De Las Esculturas Urbanas Del Mundo (Museum)',
    nombreMapa: 'Fundación Urunday - MusEUM',
    motivo:
      'La dirección ya era correcta; el nombre oficial no es el que usa Google Maps.',
  },
  {
    id: 'monumentos-y-lugares-historicos-687',
    nombre: 'Catedral (Catamarca)',
    nombreMapa: 'Catedral Basílica de Nuestra Señora del Valle',
    direccionNueva: 'Sarmiento 655',
    motivo: 'SInCA trae "Sarmiento 631"; la dirección real es 655.',
  },
  {
    id: 'centros-culturales-1036',
    nombre: 'Centro Cultural Del Bicentenario',
    direccionNueva: 'Av. Libertad 439',
    motivo:
      'SInCA trae "Pellegrini 149"; la dirección real es Av. Libertad 439.',
  },
  {
    id: 'museos-1134',
    nombre: 'Museo Histórico De La Provincia Dr. Orestes Di Lullo',
    nombreMapa: 'Museo Histórico Dr. Orestes Di Lullo',
    direccionNueva: 'Av. Libertad 439',
    motivo:
      'SInCA trae "Urquiza 354"; funciona en el mismo complejo que el Centro Cultural del Bicentenario, en Av. Libertad 439.',
  },
  {
    id: 'museos-1133',
    nombre:
      'Museo De Ciencias Antropológicas Y Naturales Emilio Y Duncan Wagner',
    direccionNueva: 'Av. Libertad 439',
    motivo:
      'SInCA trae "Avellaneda 355 b° centro"; funciona en el mismo complejo que el Centro Cultural del Bicentenario, en Av. Libertad 439.',
  },
  {
    id: 'sitios-patrimonio-unesco-9',
    nombre: 'Parque Nacional Talampaya',
    direccionNueva: '445W+QJ El Jumeal, La Rioja, Argentina',
    motivo:
      'SInCA solo traía "Villa Unión" (la ciudad más cercana, no el parque); se usa un Plus Code de Google para ubicar el parque real.',
  },
  {
    id: 'monumentos-y-lugares-historicos-1223',
    nombre: 'Monumento Nacional a la Bandera',
    nombreMapa: 'Monumento Histórico Nacional a la Bandera',
    direccionNueva: 'Sta Fe 581',
    motivo:
      'SInCA trae una lista de calles ("Av Belgrano, Santa Fe, Córdoba, Brig Gral. J. M. de Rosas") en vez de una dirección puntual.',
  },
  {
    id: 'museos-910',
    nombre: 'Museo Histórico Provincial Agustín V. Gnecco',
    direccionNueva: 'B. Mitre 864',
    motivo:
      'SInCA trae "Avda. Rawson 621 (Sur)"; la dirección real es B. Mitre 864.',
  },
  {
    id: 'salas-de-teatro-592',
    nombre: 'Teatro Colón',
    direccionNueva: 'Cerrito 628',
    motivo:
      'SInCA trae "Cerrito 618"; la dirección real es 628 (confirmado en teatrocolon.org.ar y varias guías turísticas) — probable error de tipeo en la fuente, dígitos invertidos.',
  },
]
