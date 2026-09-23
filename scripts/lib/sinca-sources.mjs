/**
 * Fuente: dataset "Espacios Culturales de la Argentina" (SInCA, Ministerio de
 * Cultura) en datos.cultura.gob.ar, package id 37305de4-3cce-4d4b-9d9a-fec3ca61d09f.
 * URLs de recursos obtenidas vía la API CKAN del portal (package_show) el 2026-09-12.
 */
export const SINCA_RESOURCES = [
  {
    slug: 'museos',
    categoria: 'Museos',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/4207def0-2ff7-41d5-9095-d42ae8207a5d/download/museos_datosabiertos.csv',
  },
  {
    slug: 'bibliotecas-populares',
    categoria: 'Bibliotecas Populares',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/01c6c048-dbeb-44e0-8efa-6944f73715d7/download/bibliotecas-populares.csv',
  },
  {
    slug: 'bibliotecas-especializadas',
    categoria: 'Bibliotecas Especializadas',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/456d1087-87f9-4e27-9c9c-1d9734c7e51d/download/08_biblio_espec.xlsx-sheet2.csv',
  },
  {
    slug: 'salas-de-teatro',
    categoria: 'Salas de Teatro',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/87ebac9c-774c-4ef2-afa7-044c41ee4190/download/17_teatro.xlsx-datos-abiertos.csv',
  },
  {
    slug: 'centros-culturales',
    categoria: 'Centros Culturales',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/0e9a431c-b4f7-455b-aa1a-f419b5740900/download/centros_culturales.csv',
  },
  {
    slug: 'cines',
    categoria: 'Cines',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/f7a8edb8-9208-41b0-8f19-d72811dcea97/download/salas_cine.csv',
  },
  {
    slug: 'galerias-de-arte',
    categoria: 'Galerías de Arte',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/ed0555f9-073a-42bf-9965-1d66108645c5/download/galerias-de-arte.csv',
  },
  {
    slug: 'librerias',
    categoria: 'Librerías',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/ee6ec36e-e4f2-42a0-adb8-525f0cb93c87/download/libreria.csv',
  },
  {
    slug: 'monumentos-y-lugares-historicos',
    categoria: 'Monumentos y Lugares Históricos',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/5a03b397-a27a-4404-a2ec-d5cce6d1bff2/download/monumentos-y-lugares-historicos.csv',
  },
  {
    slug: 'sitios-patrimonio-unesco',
    categoria: 'Sitios Patrimonio UNESCO',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/67e091bd-2aff-4f8d-937b-003ebe2eecd2/download/sitiospatrimoniohumanidadunesco.csv',
  },
  {
    slug: 'casas-del-bicentenario',
    categoria: 'Casas del Bicentenario',
    url: 'https://datos.cultura.gob.ar/dataset/37305de4-3cce-4d4b-9d9a-fec3ca61d09f/resource/8d0b7f33-d570-4189-9961-9e907193aebc/download/casas-del-bicentenario.csv',
  },
]

export const GEOREF_PROVINCIAS_URL =
  'https://apis.datos.gob.ar/georef/api/provincias.geojson'

// Departamentos/partidos (segundo nivel administrativo, ~529 en todo el
// país) de la misma API Georef. `campos` recorta a lo que se usa (sin esto
// trae variantes de nombre e intersección de provincia que no hacen
// falta); `max=600` es necesario porque el default de la API es 10.
export const GEOREF_DEPARTAMENTOS_URL =
  'https://apis.datos.gob.ar/georef/api/departamentos.geojson?campos=id,nombre,nombre_completo,provincia,centroide&max=600'
