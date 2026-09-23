#!/usr/bin/env node
/**
 * Normaliza los CSV de SInCA a un esquema común, cruza con la geometría de
 * provincias (Georef) y la población (Censo 2022), simplifica la geometría,
 * calcula estadísticas por provincia y emite los JSON que consume la app.
 *
 * Entrada:  /data/raw/sinca/*.csv, /data/raw/provincias.geojson, /data/poblacion-provincias.json
 * Salida:   /src/data/provincias-resumen.json, /src/data/espacios/{provinciaId}.json,
 *           /docs/data-quality-report.md
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import simplify from '@turf/simplify'
import { parseCsv } from './lib/csv-parser.mjs'
import { SINCA_RESOURCES } from './lib/sinca-sources.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const RAW_DIR = path.join(ROOT, 'data', 'raw')
const DATA_DIR = path.join(ROOT, 'src', 'data')
const DOCS_DIR = path.join(ROOT, 'docs')

const CURRENT_YEAR = new Date().getFullYear()

// --- Simplificación de geometría -------------------------------------------
// Tolerancia de @turf/simplify (grados de lon/lat, algoritmo Douglas-Peucker
// con highQuality:true). 0.05 da un look "low-poly" reconociendo las 24
// jurisdicciones sin que el peso del GeoJSON sea excesivo.
const SIMPLIFY_TOLERANCE = 0.05
// Esta tolerancia da un borde varios km más ancho que la frontera real:
// imperceptible a escala país, pero al hacer zoom a una sola provincia
// (Etapa 6) un pin con su lat/lon real termina visualmente "afuera" de un
// borde que en realidad está mal dibujado, no porque el dato esté mal. Por
// eso el zoom por provincia usa una geometría de detalle sin simplificar
// (más abajo, `detalleFeature`) — el mapa nacional sigue usando esta.

// El GeoJSON de Georef para "Tierra del Fuego, Antártida e Islas del
// Atlántico Sur" incluye, además de la Isla Grande (la parte poblada, con
// espacios culturales reales), el sector antártico reclamado por Argentina
// (llega hasta -90° de latitud) y archipiélagos muy alejados en el Atlántico
// Sur. Ninguno de esos tiene espacios culturales en el dataset de SInCA, y el
// sector antártico directamente rompe la proyección Mercator para TODO el
// mapa (una proyección de área finita no puede fitear una geometría que
// llega al polo). No es una decisión sobre soberanía: para este mapa
// interactivo de espacios culturales se renderiza solo el cuerpo principal de
// cada jurisdicción (Isla Grande y los islotes inmediatamente adyacentes),
// igual que se haría con cualquier archipiélago lejano de otra provincia.
//
// Filtro en dos pasos, aplicado a todas las jurisdicciones (no solo Tierra
// del Fuego): 1) se descartan partes cuyo punto más al norte ya está más al
// sur de ANTARCTIC_LAT_CUTOFF (elimina el sector antártico); 2) entre las
// partes restantes se toma la de mayor área como "ancla" (el cuerpo
// principal) y se descarta cualquier otra parte a más de
// MAX_DISTANCE_FROM_ANCHOR_DEG grados de esa ancla (elimina archipiélagos
// lejanos, conserva islotes realmente adyacentes).
const ANTARCTIC_LAT_CUTOFF = -58
const MAX_DISTANCE_FROM_ANCHOR_DEG = 5
// Cualquier parte cuyo lado más largo del bounding box sea menor a esto (en
// grados) se descarta antes de simplificar. Son islotes de unos pocos cientos
// de metros que, al pasar por @turf/simplify con tolerancia 0.05, quedan
// reducidos a un triángulo de 3 puntos casi degenerado. Se confirmó
// empíricamente que esos triángulos rotos confunden el cálculo de límites
// esférico de d3-geo (interpreta el anillo como "todo el planeta menos un
// triángulo" en vez de "un triángulo chiquito"), rompiendo la proyección para
// toda la feature (reproducido en Buenos Aires y Corrientes). Un islote de
// este tamaño tampoco se vería como más que un punto en un mapa a escala país.
const MIN_PART_SPAN_DEG = 0.1

/** Área aproximada de un anillo (shoelace, en unidades de grado²; solo sirve
 * para comparar tamaños relativos entre partes de una misma feature). */
function ringArea(ring) {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum / 2)
}

function ringBounds(ring) {
  let minLat = 90
  let maxLat = -90
  let minLon = 180
  let maxLon = -180
  for (const [lon, lat] of ring) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
  }
  return {
    maxLat,
    centerLat: (minLat + maxLat) / 2,
    centerLon: (minLon + maxLon) / 2,
    span: Math.max(maxLat - minLat, maxLon - minLon),
  }
}

function dropRemoteParts(geometry) {
  if (geometry.type !== 'MultiPolygon') return geometry
  const parts = geometry.coordinates
  const info = parts.map((p) => ({
    area: ringArea(p[0]),
    bounds: ringBounds(p[0]),
  }))

  const northOfCutoff = info.filter(
    (c) => c.bounds.maxLat > ANTARCTIC_LAT_CUTOFF,
  )
  const anchorPool = northOfCutoff.length ? northOfCutoff : info
  const anchor = anchorPool.reduce((a, b) => (b.area > a.area ? b : a))

  const kept = parts.filter((_, i) => {
    const c = info[i]
    if (c.bounds.maxLat <= ANTARCTIC_LAT_CUTOFF) return false
    if (c.bounds.span < MIN_PART_SPAN_DEG) return false
    const dist = Math.hypot(
      c.bounds.centerLat - anchor.bounds.centerLat,
      c.bounds.centerLon - anchor.bounds.centerLon,
    )
    return dist <= MAX_DISTANCE_FROM_ANCHOR_DEG
  })

  return {
    type: 'MultiPolygon',
    coordinates: kept.length ? kept : [parts[info.indexOf(anchor)]],
  }
}

// Un anillo de 4 puntos (3 vértices + cierre) es un triángulo casi
// degenerado — ver el comentario largo junto a `MIN_PART_SPAN_DEG` de más
// arriba: confunde el cálculo de límites esférico de d3-geo y rompe la
// proyección de TODA la feature, no solo esa parte. `dropRemoteParts` ya
// filtra por span en grados ANTES de simplificar, pero un islote que pasa
// ese filtro puede terminar igual como triángulo después de simplificar
// (confirmado en scripts/extract-malvinas.mjs) — este filtro va DESPUÉS,
// sobre el resultado ya simplificado.
function sinTriangulosDegenerados(geometry) {
  if (geometry.type !== 'MultiPolygon') return geometry
  return {
    type: 'MultiPolygon',
    coordinates: geometry.coordinates.filter((part) => part[0].length > 4),
  }
}

// --- Unificación de localidades ----------------------------------------------
// El campo `localidad` viene de tipeo manual en los CSV fuente y trae varias
// variantes del mismo lugar por acentos faltantes o mayúsculas inconsistentes
// en conectores ("De" vs "de"): "Vicente López" / "Vicente Lopez", "9 de
// Julio" / "9 De julio", "Ciudad Autónoma de Buenos Aires" / "...Autonoma...",
// etc. (confirmado: 126 grupos de variantes duplicadas en 265 valores
// distintos, en 24 provincias). Sin unificar, el filtro por localidad de la
// app mostraba la misma ciudad repetida varias veces.
//
// Se agrupan (por provincia) por una clave sin acentos/mayúsculas/espacios
// dobles y, dentro de cada grupo, se elige como forma canónica la de mejor
// "calidad" ortográfica (con acentos, con los conectores en minúscula) — NO
// la más frecuente: en varios casos la variante mal tipeada es mayoría (p.
// ej. "Vicente Lopez" aparece más veces que "Vicente López" en los datos
// fuente) y la frecuencia no es un criterio de corrección ortográfica. La
// cantidad de ocurrencias solo se usa como desempate entre formas de igual
// calidad.
const CONECTORES_TOPONIMOS = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'en',
])

function normalizeKeyLocalidad(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function calidadLocalidad(s) {
  let score = 0
  if (/[áéíóúñÁÉÍÓÚÑ]/.test(s)) score += 100
  const palabras = s.split(/\s+/)
  const casingOk = palabras.every((p) => {
    if (/^\d/.test(p)) return true // "9" y "25" de "9 de Julio"/"25 de Mayo"
    if (CONECTORES_TOPONIMOS.has(p.toLowerCase())) return p === p.toLowerCase()
    return (
      p[0] === p[0].toUpperCase() && p.slice(1) === p.slice(1).toLowerCase()
    )
  })
  if (casingOk) score += 50
  if (s.length > 1 && s === s.toUpperCase()) score -= 50
  return score
}

function unifyLocalidades(espacios) {
  const variantesPorProvincia = new Map() // provinciaId -> normKey -> Map<variante, count>
  for (const e of espacios) {
    if (!e.localidad || !e.provinciaId) continue
    const limpio = e.localidad.replace(/\s+/g, ' ').trim()
    const key = normalizeKeyLocalidad(limpio)
    if (!variantesPorProvincia.has(e.provinciaId))
      variantesPorProvincia.set(e.provinciaId, new Map())
    const grupos = variantesPorProvincia.get(e.provinciaId)
    if (!grupos.has(key)) grupos.set(key, new Map())
    const variantes = grupos.get(key)
    variantes.set(limpio, (variantes.get(limpio) ?? 0) + 1)
  }

  const canonicoPorProvincia = new Map() // provinciaId -> normKey -> forma elegida
  for (const [provinciaId, grupos] of variantesPorProvincia) {
    const canonico = new Map()
    for (const [key, variantes] of grupos) {
      const [mejorForma] = [...variantes.entries()].sort(
        ([formaA, countA], [formaB, countB]) => {
          const diffCalidad =
            calidadLocalidad(formaB) - calidadLocalidad(formaA)
          if (diffCalidad !== 0) return diffCalidad
          if (countB !== countA) return countB - countA
          return formaA.localeCompare(formaB, 'es')
        },
      )[0]
      canonico.set(key, mejorForma)
    }
    canonicoPorProvincia.set(provinciaId, canonico)
  }

  for (const e of espacios) {
    if (!e.localidad || !e.provinciaId) continue
    const limpio = e.localidad.replace(/\s+/g, ' ').trim()
    const key = normalizeKeyLocalidad(limpio)
    e.localidad = canonicoPorProvincia.get(e.provinciaId)?.get(key) ?? limpio
  }
}

// --- Códigos de departamento vencidos ----------------------------------------
// `departamentoId` (Etapa 9, ver `loadEspacios`) se deriva de `Cod_Loc`, el
// código de localidad INDEC embebido en el propio CSV de SInCA. Para la
// enorme mayoría de los ~11 mil registros ese código coincide exactamente
// con el id de departamento que usa Georef hoy — pero se encontraron dos
// bolsones donde SInCA trae un código de una nomenclatura vieja, previa a
// una redivisión administrativa posterior, y Georef (y el Censo 2022) ya
// usan el nuevo:
//
// - Tierra del Fuego: el departamento "Río Grande" se dividió en 2017 (ley
//   provincial 1186) para crear "Tolhuin" — Georef ya tiene 3 ids (Río
//   Grande=94008, Tolhuin=94011, Ushuaia=94015) donde SInCA sigue usando 2
//   (94007, 94014, el esquema previo a la división). No hay forma de saber,
//   de los registros bajo el viejo 94007, cuáles caerían hoy en Tolhuin —
//   se remapean todos a Río Grande (94008), el departamento del que
//   Tolhuin se separó, en vez de inventar una distribución.
// - Buenos Aires: los 12 registros de Chascomús traen `06217`; el id real
//   de Georef es `06218`.
//
// Verificado 2026-09-23 comparando cada `departamentoId` derivado contra
// los ids de `data/raw/departamentos.geojson` (Georef) — estos fueron los
// únicos casos sistemáticos (no puntuales) de códigos que no matchean
// ningún departamento real. CABA (siempre `02000`) es aparte: no es un
// código vencido, es que SInCA no llega a nivel comuna para CABA (ver el
// comentario junto a `porDepartamento` en `main()`).
const DEPARTAMENTO_ID_LEGACY = {
  94007: '94008', // Río Grande (pre-división de Tolhuin)
  94014: '94015', // Ushuaia
  '06217': '06218', // Chascomús
}

// --- Correcciones puntuales ---------------------------------------------------
// Casos individuales, verificados a mano, donde la fila fuente tiene un dato
// objetivamente erróneo (no es una variante de tipeo — es la provincia
// equivocada). Se corrigen acá, por nombre exacto, para que sobrevivan a un
// re-run del pipeline.
function aplicarCorreccionesPuntuales(espacios) {
  for (const e of espacios) {
    // La fila fuente (bibliotecas-especializadas.csv) trae
    // Provincia/Departamento = "Ciudad Autónoma de Buenos Aires" pero su
    // propio campo Localidad ya decía "San Martín" — contradicción interna
    // que delata el error. La dirección real ("Av. General Paz 5445, e/ Av.
    // Albarellos y Av. de los Constituyentes") y las coordenadas
    // (-34.5759413, -58.5130596) son el Parque Tecnológico Miguelete del
    // INTI, que está del lado de la provincia de Buenos Aires: Av. General
    // Paz es justamente la avenida límite con CABA.
    if (
      e.nombre === 'INTI - Tecnologías de Gestión, Biblioteca' &&
      e.provinciaId === '02'
    ) {
      e.provinciaId = '06'
      e.departamento = 'General San Martín'
      e.localidad = 'General San Martín' // mismo partido que las otras 24 entradas ya cargadas como "General San Martín"
      e.departamentoId = '06371' // id real de Georef para General San Martín (ver DEPARTAMENTO_ID_LEGACY)
    }

    // Único registro de todo el dataset sin localidad (bibliotecas-populares.csv,
    // columna vacía en la fuente). Sus coordenadas (-36.879523, -60.304617)
    // caen a menos de 3km del resto de las ~20 bibliotecas ya cargadas con
    // localidad "Olavarría" en el mismo departamento ("Olavarria"), un radio
    // muy por debajo de la distancia a cualquier otra localidad del partido.
    if (e.nombre === 'BP Del Otro Lado del Arbol' && e.localidad === null) {
      e.localidad = 'Olavarría'
    }
  }
}

// --- Localidad faltante en "Monumentos y Lugares Históricos" -----------------
// Las 148 filas de esta categoría con localidad="s/d" en la fuente son en su
// mayoría monumentos aislados (faros, sitios arqueológicos, tramos de rutas
// históricas) sin un pueblo asociado — no es un dato que falte por descuido,
// es que el monumento realmente no está "en" una localidad puntual. Antes de
// resolver por proximidad geográfica (más abajo, genérico y con radio
// acotado), dos fuentes de información ya presentes en el propio registro
// resuelven la mayoría de los casos con precisión real, sin inventar nada:
//
// 1) Las estaciones de "La Trochita" (el histórico ferrocarril de trocha
//    angosta de Chubut/Río Negro) llevan el nombre del paraje en su propio
//    `nombre` ("Traza del Ferrocarril La Trochita - Estación <paraje>") — se
//    extrae de ahí.
// 2) Un puñado de faros/monumentos en Buenos Aires y Chubut traen en
//    `direccion` directamente el nombre de una localidad real y sin
//    ambigüedad (verificado a mano, uno por uno — no todos los `direccion`
//    de esta categoría sirven: varios son descripciones de ruta o de una
//    zona/departamento, no el nombre de un pueblo, y esos quedan afuera a
//    propósito para no asignar una localidad puntual que la fuente no da).
const LOCALIDAD_DESDE_DIRECCION_MONUMENTOS = {
  'monumentos-y-lugares-historicos-264': 'Carmen de Patagones', // Faro Segunda Barranca
  'monumentos-y-lugares-historicos-265': 'Monte Hermoso', // Faro Recalada a Bahía Blanca
  'monumentos-y-lugares-historicos-266': 'Mar del Plata', // Faro Punta Mogotes
  'monumentos-y-lugares-historicos-267': 'Villa Gesell', // Faro Querandí
  'monumentos-y-lugares-historicos-735': 'Punta Delgada', // Faro Punta Delgada
}

function inferirLocalidadesMonumentos(espacios) {
  for (const e of espacios) {
    if (
      e.categoria !== 'Monumentos y Lugares Históricos' ||
      e.localidad !== null
    )
      continue

    const mapeada = LOCALIDAD_DESDE_DIRECCION_MONUMENTOS[e.id]
    if (mapeada) {
      e.localidad = mapeada
      continue
    }

    const estacion = e.nombre.match(/Estaci[oó]n\s*[-–]?\s*(.+)$/i)
    if (estacion) e.localidad = estacion[1].trim()
  }
}

// --- Localidad faltante, último recurso: proximidad geográfica --------------
// Para lo que sigue sin localidad después de lo anterior (mayormente sitios
// realmente aislados: faros en islas, cumbres, yacimientos en despoblado):
// se busca, dentro de la misma provincia, el espacio más cercano que sí tiene
// localidad confirmada. Solo se adopta si queda a MAX_RADIO_KM o menos —
// bastante por debajo de la distancia típica entre pueblos rurales — porque
// más allá de eso adivinar la localidad por cercanía deja de ser confiable y
// es preferible dejarlo como "sin dato" real antes que inventar precisión.
const MAX_RADIO_INFERENCIA_KM = 5

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function inferirLocalidadPorProximidad(espacios) {
  const referenciasPorProvincia = new Map()
  for (const e of espacios) {
    if (!e.provinciaId || !e.localidad || e.lat === null || e.lon === null)
      continue
    if (!referenciasPorProvincia.has(e.provinciaId))
      referenciasPorProvincia.set(e.provinciaId, [])
    referenciasPorProvincia
      .get(e.provinciaId)
      .push({ lat: e.lat, lon: e.lon, localidad: e.localidad })
  }

  let inferidos = 0
  for (const e of espacios) {
    if (
      e.localidad !== null ||
      !e.provinciaId ||
      e.lat === null ||
      e.lon === null
    )
      continue
    const referencias = referenciasPorProvincia.get(e.provinciaId)
    if (!referencias) continue
    let mejor = null
    let mejorDistancia = Infinity
    for (const r of referencias) {
      const d = distanciaKm(e.lat, e.lon, r.lat, r.lon)
      if (d < mejorDistancia) {
        mejorDistancia = d
        mejor = r
      }
    }
    if (mejor && mejorDistancia <= MAX_RADIO_INFERENCIA_KM) {
      e.localidad = mejor.localidad
      inferidos++
    }
  }
  return inferidos
}

// CABA es una ciudad, no un conjunto de localidades: a diferencia del resto
// de las provincias, no tiene sentido un filtro por "localidad" ahí. Un
// puñado de filas del CSV fuente traen en cambio el barrio (p. ej. "San
// Nicolás", el microcentro) en ese campo. Se fuerza a un valor único para
// que el filtro de localidad de la app no muestre barrios sueltos como si
// fueran la única alternativa a la ciudad entera.
function forzarLocalidadCaba(espacios) {
  for (const e of espacios) {
    if (e.provinciaId === '02') e.localidad = 'Ciudad Autónoma de Buenos Aires'
  }
}

// --- Normalización de gestión -----------------------------------------------
function normalizeGestion(raw) {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (!v || v === 's/d') return null
  const isPriv = /priv/.test(v)
  const isPub =
    /(p[uú]b[l]?[ií]c[oa]|municipal|provincial|nacional|comunal|gobierno)/.test(
      v,
    )
  if (isPriv && isPub) return 'mixta'
  if (isPriv) return 'privada'
  if (isPub) return 'pública'
  return null
}

// --- Extracción de año -------------------------------------------------------
function parseYear(raw, format) {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  let year = null
  if (format === 'bare') {
    if (/^\d{4}$/.test(v)) year = Number(v)
  } else if (format === 'iso') {
    const m = v.match(/^(\d{4})-\d{2}-\d{2}/)
    if (m) year = Number(m[1])
  } else if (format === 'dmy') {
    const m = v.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/)
    if (m) year = Number(m[1])
  }
  if (year === null) return null
  if (year < 1400 || year > CURRENT_YEAR) return null
  return year
}

// "s/d" (y variantes de mayúscula/espaciado: "S/D", "S/d", "s.d.") es el
// placeholder que usa la fuente para "sin dato" en varias columnas
// (localidad, dirección, teléfono, mail, web — no solo gestión, que ya lo
// manejaba en normalizeGestion). Sin este filtro quedaba colado como si
// fuera un valor real: se veía literalmente "☎ s/d" o un link a "s/d" en la
// ficha. Se trata como campo vacío en cualquier columna, no como un dato.
function esMarcadorSinDato(v) {
  return /^s\.?\s*\/?\s*d\.?$/i.test(v)
}

function field(row, key) {
  if (!key) return null
  const v = row[key]
  if (!v || !v.trim()) return null
  const limpio = v.trim()
  return esMarcadorSinDato(limpio) ? null : limpio
}

// La fuente trae varios teléfonos con coma ("49,012,932"): es el separador de
// miles que le puso la planilla a un número que en realidad es un teléfono
// (4901-2932). Se saca la coma y quedan los dígitos originales.
function limpiarTelefono(v) {
  return v ? v.replace(/,/g, '') : v
}

function parseCoord(raw) {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

// --- Configuración por categoría --------------------------------------------
// Mapea cada CSV de SInCA (con sus nombres de columna reales, que varían
// bastante entre categorías) al esquema común. `anio` y `gestion` quedan en
// null cuando el CSV de esa categoría directamente no trae esa información
// (no se inventa un valor).
//
// `codLoc` es la columna con el código de localidad INDEC (2 dígitos de
// provincia + departamento + localidad). Se usa esa en vez de la columna
// "id_provincia"/"IdProvincia" de cada CSV porque, al comparar ambas contra
// las 24 provincias reales, la columna de provincia trae errores de tipeo en
// varias filas (confirmado en `galerias-de-arte.csv` y `salas-de-teatro.csv`)
// mientras que el código de localidad es consistente. Ver docs/data-quality-report.md.
const CATEGORY_CONFIG = {
  museos: {
    codLoc: 'Cod_Loc',
    departamento: null,
    localidad: 'localidad',
    nombre: 'nombre',
    direccion: 'direccion',
    telefono: 'telefono',
    mail: 'Mail',
    web: 'Web',
    lat: 'Latitud',
    lon: 'Longitud',
    subcategoria: 'subcategoria',
    anio: { key: 'año_inauguracion', format: 'bare' },
    gestion: 'jurisdiccion',
  },
  'bibliotecas-populares': {
    codLoc: 'cod_localidad',
    departamento: 'departamento',
    localidad: 'localidad',
    nombre: 'nombre',
    direccion: 'domicilio',
    telefono: 'telefono',
    mail: 'mail',
    web: 'web',
    lat: 'latitud',
    lon: 'longitud',
    subcategoria: 'subcategoria',
    anio: { key: 'fecha_fundacion', format: 'iso' },
    gestion: null,
  },
  'bibliotecas-especializadas': {
    codLoc: 'cod_localidad',
    departamento: 'Departamento',
    localidad: 'Localidad',
    nombre: 'Nombre',
    direccion: 'Dirección',
    telefono: 'telefono',
    mail: 'Mail',
    web: 'Web',
    lat: 'Latitud',
    lon: 'Longitud',
    subcategoria: 'SubCategoria',
    anio: null,
    gestion: 'tipo_gestion',
  },
  'salas-de-teatro': {
    codLoc: 'cod_loc',
    departamento: 'departamento',
    localidad: 'localidad',
    nombre: 'nombre',
    direccion: 'domicilio',
    telefono: 'telefono',
    mail: 'mail',
    web: 'web',
    lat: 'latitud',
    lon: 'longitud',
    subcategoria: 'subcategoria',
    anio: { key: 'inicio_act', format: 'bare' },
    gestion: 'tipo_gestion',
  },
  'centros-culturales': {
    codLoc: 'Cod_Loc',
    departamento: 'Departamento',
    localidad: 'Localidad',
    nombre: 'Nombre',
    direccion: 'Domicilio',
    telefono: 'Telefóno',
    mail: 'Mail',
    web: 'Web',
    lat: 'Latitud',
    lon: 'Longitud',
    subcategoria: null,
    anio: { key: 'año_inicio', format: 'bare' },
    gestion: null,
  },
  cines: {
    codLoc: 'cod_localidad',
    departamento: 'departamento',
    localidad: 'localidad',
    nombre: 'nombre',
    direccion: 'direccion',
    telefono: null,
    mail: null,
    web: 'web',
    lat: 'latitud',
    lon: 'longitud',
    subcategoria: null,
    anio: null,
    gestion: 'tipo_de_gestion',
  },
  'galerias-de-arte': {
    codLoc: 'cod_loc',
    departamento: 'departamento',
    localidad: 'localidad',
    nombre: 'nombre',
    direccion: 'domicilio',
    telefono: 'telefono',
    mail: 'mail',
    web: 'web',
    lat: 'latitud',
    lon: 'longitud',
    subcategoria: null,
    anio: null,
    gestion: 'tipo_gestion',
  },
  librerias: {
    codLoc: 'localidad_id',
    departamento: 'departamento_nombre',
    localidad: 'localidad_nombre',
    nombre: 'nombre',
    direccion: 'domicilio',
    telefono: 'telefono',
    mail: 'mail',
    web: 'web',
    lat: 'Latitud',
    lon: 'Longitud',
    subcategoria: null,
    anio: null,
    gestion: 'tipo_gestion',
  },
  'monumentos-y-lugares-historicos': {
    codLoc: 'localidad_id',
    departamento: null,
    localidad: 'localidad',
    nombre: 'nombre',
    direccion: 'direccion',
    telefono: null,
    mail: null,
    web: null,
    lat: 'latitud',
    lon: 'longitud',
    subcategoria: null,
    // fecha_de_inauguracion tal como la nombra la fuente; en la práctica es
    // la fecha de declaración/protección del bien, no siempre la fecha física
    // de construcción. Se documenta en el reporte de calidad de datos.
    anio: { key: 'fecha_de_inauguracion', format: 'dmy' },
    gestion: null,
  },
  'sitios-patrimonio-unesco': {
    codLoc: 'Cod_Loc',
    departamento: 'Departamento',
    localidad: 'Localidad',
    nombre: 'Nombre',
    direccion: 'Dirección',
    telefono: 'Teléfono',
    mail: 'Mail',
    web: 'Web',
    lat: 'Latitud',
    lon: 'Longitud',
    subcategoria: 'SubCategoria',
    // declaracion_año es el año en que UNESCO declaró el sitio, no un año de
    // "inauguración" (estos sitios son accidentes geográficos o conjuntos
    // históricos preexistentes). Se documenta en el reporte de calidad de datos.
    anio: { key: 'declaracion_año', format: 'bare' },
    gestion: null,
  },
  'casas-del-bicentenario': {
    codLoc: 'cod_loc',
    departamento: 'departamento',
    localidad: 'localidad',
    nombre: 'nombre',
    direccion: 'domicilio',
    telefono: 'telefono',
    mail: 'mail',
    web: 'web',
    lat: 'latitud',
    lon: 'longitud',
    subcategoria: null,
    anio: { key: 'inicio', format: 'bare' },
    gestion: 'tipo_gest',
  },
}

async function loadEspacios() {
  const espacios = []
  const completitud = []

  for (const resource of SINCA_RESOURCES) {
    const config = CATEGORY_CONFIG[resource.slug]
    const csvPath = path.join(RAW_DIR, 'sinca', `${resource.slug}.csv`)
    const text = await readFile(csvPath, 'utf8')
    const rows = parseCsv(text)

    let conAnio = 0

    rows.forEach((row, i) => {
      const codLocRaw = field(row, config.codLoc)
      const codLocPadded = codLocRaw ? codLocRaw.padStart(8, '0') : null
      const provinciaId = codLocPadded ? codLocPadded.slice(0, 2) : null
      // Mismo código de 8 dígitos (2 provincia + 3 departamento + 3
      // localidad) del que ya se deriva `provinciaId` — los primeros 5
      // dígitos son el id de departamento estándar INDEC, el mismo que usa
      // Georef para `departamentos.geojson`. Se usa el código en vez del
      // nombre de columna `departamento` (correspondiente a `config.departamento`,
      // que ni siquiera existe para todas las categorías) porque es
      // consistente entre categorías y no depende de tipeo/acentos.
      const departamentoIdCrudo = codLocPadded ? codLocPadded.slice(0, 5) : null
      const departamentoId = departamentoIdCrudo
        ? (DEPARTAMENTO_ID_LEGACY[departamentoIdCrudo] ?? departamentoIdCrudo)
        : null
      const anio = config.anio
        ? parseYear(row[config.anio.key], config.anio.format)
        : null
      if (anio !== null) conAnio++

      espacios.push({
        id: `${resource.slug}-${i + 1}`,
        nombre: field(row, config.nombre),
        categoria: resource.categoria,
        subcategoria: field(row, config.subcategoria),
        provinciaId,
        departamentoId,
        departamento: field(row, config.departamento),
        localidad: field(row, config.localidad),
        lat: parseCoord(field(row, config.lat)),
        lon: parseCoord(field(row, config.lon)),
        anioInauguracion: anio,
        gestion: config.gestion
          ? normalizeGestion(field(row, config.gestion))
          : null,
        direccion: field(row, config.direccion),
        telefono: limpiarTelefono(field(row, config.telefono)),
        mail: field(row, config.mail),
        web: field(row, config.web),
      })
    })

    completitud.push({
      categoria: resource.categoria,
      slug: resource.slug,
      total: rows.length,
      conAnio,
      porcentajeConAnio: rows.length ? (conAnio / rows.length) * 100 : 0,
      tieneCampoAnio: Boolean(config.anio),
    })
  }

  return { espacios, completitud }
}

function buildDataQualityReport(completitud, totalEspacios, totalConAnio) {
  const lines = []
  lines.push('# Reporte de calidad de datos')
  lines.push('')
  lines.push(
    `Generado el ${new Date().toISOString().slice(0, 10)} a partir de los CSV de SInCA descargados de datos.cultura.gob.ar.`,
  )
  lines.push('')
  lines.push('## Completitud de `anioInauguracion`')
  lines.push('')
  lines.push(
    `En total, **${totalConAnio} de ${totalEspacios}** registros (${((totalConAnio / totalEspacios) * 100).toFixed(1)}%) tienen un año documentado y válido (entre 1400 y ${CURRENT_YEAR}).`,
  )
  lines.push('')
  lines.push(
    '| Categoría | Total | Con año válido | % | ¿El dataset trae ese campo? |',
  )
  lines.push('|---|---:|---:|---:|:---:|')
  for (const c of completitud) {
    lines.push(
      `| ${c.categoria} | ${c.total} | ${c.conAnio} | ${c.porcentajeConAnio.toFixed(1)}% | ${c.tieneCampoAnio ? 'sí' : 'no'} |`,
    )
  }
  lines.push('')
  lines.push(
    '## Notas importantes para el diseño de la línea de tiempo (Etapa 8)',
  )
  lines.push('')
  const sinCampo = completitud
    .filter((c) => !c.tieneCampoAnio)
    .map((c) => c.categoria)
  lines.push(
    `- Las categorías **${sinCampo.join(', ')}** no traen ningún campo de año en el CSV de origen: para esos registros \`anioInauguracion\` es siempre \`null\`, no es un dato faltante por casualidad.`,
  )
  lines.push(
    '- **Monumentos y Lugares Históricos**: el campo fuente se llama `fecha_de_inauguracion`, pero en la práctica corresponde a la fecha de declaración/protección legal del bien (100% de completitud, sospechosamente alta comparada con el resto), no necesariamente a la fecha física de construcción. Aclarar esto en la UI si se usa.',
  )
  lines.push(
    '- **Sitios Patrimonio UNESCO**: el campo fuente es `declaracion_año` (año en que UNESCO declaró el sitio), no un año de inauguración — son accidentes geográficos o conjuntos históricos preexistentes a su declaración.',
  )
  lines.push(
    '- **Salas de Teatro**: el campo `inicio_act` trae el valor `0` en varios registros como placeholder de dato faltante; se descartó como inválido (no se cuenta como año real).',
  )
  const pctCompleto = (totalConAnio / totalEspacios) * 100
  const pctFaltante = 100 - pctCompleto
  if (pctFaltante > 30) {
    lines.push('')
    lines.push(
      `- **${pctFaltante.toFixed(1)}% de los registros no tiene año documentado, por arriba del umbral de ~30-40% del plan. La Etapa 8 NO debería armar un scrubber continuo año por año: conviene un set fijo de hitos (décadas/períodos) con conteo acumulado real hasta cada hito, y declarar visiblemente ese porcentaje sin año documentado.**`,
    )
  }
  lines.push('')
  lines.push('## Asignación de provincia por registro')
  lines.push('')
  lines.push(
    '`provinciaId` se deriva del código de localidad INDEC (`cod_loc`/`cod_localidad`/`localidad_id` según el CSV) y no de la columna explícita de provincia: al comparar ambas fuentes fila por fila, la columna de provincia trae errores de tipeo puntuales (confirmado en `galerias-de-arte.csv`, 3 filas, y `salas-de-teatro.csv`, 1 fila) mientras que el código de localidad es consistente en la enorme mayoría de los casos. Se detectó una única excepción en sentido inverso en `librerias.csv` (1 fila de 1623) donde el código de localidad parece ser el erróneo. Impacto total: menos de 5 registros de 11234 (<0.05%) podrían estar en la provincia equivocada.',
  )
  lines.push('')
  lines.push('## Asignación de departamento por registro (Etapa 9)')
  lines.push('')
  lines.push(
    '`departamentoId` toma los primeros 5 dígitos del mismo código de localidad (2 de provincia + 3 de departamento), el mismo id que usa Georef para `departamentos.geojson`. Dos bolsones de códigos vencidos (nomenclatura vieja, previa a una redivisión administrativa) se remapean a mano — ver `DEPARTAMENTO_ID_LEGACY` en este script: Tierra del Fuego (102 registros bajo los códigos previos a la creación de Tolhuin en 2017) y Chascomús, Buenos Aires (12 registros). **CABA es aparte y no tiene arreglo posible con este dataset**: sus 2653 registros siempre traen el código placeholder `02000` (la ciudad entera, no una comuna) — SInCA no llega a nivel comuna para CABA, así que el choropleth por comuna de CABA (Etapa 9) queda sin datos en las 15.',
  )
  lines.push('')
  return lines.join('\n')
}

async function main() {
  console.log('Leyendo geometría de provincias (Georef)...')
  const geojsonRaw = JSON.parse(
    await readFile(path.join(RAW_DIR, 'provincias.geojson'), 'utf8'),
  )

  console.log('Leyendo población (Censo 2022)...')
  const { poblacion } = JSON.parse(
    await readFile(
      path.join(ROOT, 'data', 'poblacion-provincias.json'),
      'utf8',
    ),
  )

  console.log('Leyendo geometría de departamentos (Georef)...')
  const departamentosGeojsonRaw = JSON.parse(
    await readFile(path.join(RAW_DIR, 'departamentos.geojson'), 'utf8'),
  )

  console.log('Leyendo población por departamento (Censo 2022)...')
  const { poblacion: poblacionDepartamentos } = JSON.parse(
    await readFile(
      path.join(ROOT, 'data', 'poblacion-departamentos.json'),
      'utf8',
    ),
  )

  console.log('Leyendo y normalizando CSV de SInCA...')
  const { espacios, completitud } = await loadEspacios()

  console.log('Aplicando correcciones puntuales...')
  aplicarCorreccionesPuntuales(espacios)

  console.log(
    'Infiriendo localidad faltante en Monumentos y Lugares Históricos...',
  )
  inferirLocalidadesMonumentos(espacios)

  console.log(
    'CABA: unificando a una sola localidad (es una ciudad, no un conjunto de localidades)...',
  )
  forzarLocalidadCaba(espacios)

  console.log('Unificando variantes de localidad (acentos, mayúsculas)...')
  unifyLocalidades(espacios)

  const inferidosPorProximidad = inferirLocalidadPorProximidad(espacios)
  console.log(
    `Localidad inferida por proximidad geográfica (radio ${MAX_RADIO_INFERENCIA_KM}km): ${inferidosPorProximidad} registros`,
  )
  const sinLocalidad = espacios.filter((e) => e.localidad === null).length
  console.log(
    `Quedan sin localidad (genuinamente sin dato en la fuente y sin ubicación cercana confiable): ${sinLocalidad}`,
  )

  const totalEspacios = espacios.length
  const totalConAnio = espacios.filter(
    (e) => e.anioInauguracion !== null,
  ).length

  // --- Agregados por provincia ----------------------------------------------
  const porProvincia = new Map()
  for (const e of espacios) {
    if (!e.provinciaId) continue
    if (!porProvincia.has(e.provinciaId)) {
      porProvincia.set(e.provinciaId, { total: 0, porCategoria: new Map() })
    }
    const agg = porProvincia.get(e.provinciaId)
    agg.total++
    agg.porCategoria.set(
      e.categoria,
      (agg.porCategoria.get(e.categoria) ?? 0) + 1,
    )
  }

  // --- Agregados por departamento --------------------------------------------
  // Mismo cálculo que `porProvincia`, a nivel departamento (ver
  // `departamentoId` en `loadEspacios`). Nota: en CABA el dataset de SInCA
  // no llega a nivel comuna — todos sus registros traen el mismo código
  // placeholder `02000` (no una comuna real de las 15 que tiene Georef), así
  // que el choropleth por comuna de CABA queda sin datos en todas — es una
  // limitación de la fuente, no un bug de este agregado.
  const porDepartamento = new Map()
  for (const e of espacios) {
    if (!e.departamentoId) continue
    if (!porDepartamento.has(e.departamentoId)) {
      porDepartamento.set(e.departamentoId, {
        total: 0,
        porCategoria: new Map(),
      })
    }
    const agg = porDepartamento.get(e.departamentoId)
    agg.total++
    agg.porCategoria.set(
      e.categoria,
      (agg.porCategoria.get(e.categoria) ?? 0) + 1,
    )
  }

  // --- Geometría simplificada + propiedades ---------------------------------
  console.log(
    `Simplificando geometría (tolerancia ${SIMPLIFY_TOLERANCE}, descarte de partes antárticas/remotas)...`,
  )
  const features = geojsonRaw.features.map((f) => {
    const id = f.properties.id
    const agg = porProvincia.get(id) ?? { total: 0, porCategoria: new Map() }
    const porCategoriaObj = Object.fromEntries(agg.porCategoria)
    const maxCount = Math.max(0, ...Object.values(porCategoriaObj))
    const categoriasPredominantes = Object.entries(porCategoriaObj)
      .filter(([, count]) => count === maxCount && maxCount > 0)
      .map(([categoria]) => categoria)
    const pob = poblacion[id] ?? null

    const geometryFiltered = dropRemoteParts(f.geometry)
    const simplifiedFeature = simplify(
      { type: 'Feature', properties: {}, geometry: geometryFiltered },
      { tolerance: SIMPLIFY_TOLERANCE, highQuality: true },
    )
    // Sin simplificar: se probó con tolerancia 0.005 y, aunque mucho mejor
    // que la del mapa nacional, seguía dejando pines (con lat/lon real,
    // confirmados dentro del límite real por point-in-polygon) del lado
    // "de afuera" de un borde con recovecos que la simplificación seguía
    // recortando. El peso (~600KB en total para las 24 provincias) es
    // aceptable para algo que se carga una sola vez y solo importa cuando
    // se zoomea a una provincia.
    const detalleFeature = { geometry: geometryFiltered }

    return {
      type: 'Feature',
      properties: {
        id,
        nombre: f.properties.nombre,
        nombreCompleto: f.properties.nombre_completo,
        poblacion: pob,
        totalEspacios: agg.total,
        porCategoria: porCategoriaObj,
        categoriasPredominantes,
        densidadPor100k: pob
          ? Number(((agg.total / pob) * 100000).toFixed(2))
          : null,
      },
      geometry: simplifiedFeature.geometry,
      geometryDetalle: detalleFeature.geometry,
    }
  })

  const provinciasResumen = {
    type: 'FeatureCollection',
    features: features.map(({ geometryDetalle, ...f }) => f),
  }
  // Geometría de detalle aparte (no la necesita el mapa nacional, solo el
  // zoom por provincia): id -> geometry, para no duplicar el resto de las
  // propiedades que ya están en provincias-resumen.json.
  const provinciasDetalle = {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      properties: { id: f.properties.id },
      geometry: f.geometryDetalle,
    })),
  }

  // --- Departamentos: geometría + propiedades --------------------------------
  // Sin `simplify()` (a diferencia del mapa nacional): un departamento solo
  // se ve cuando ya se hizo zoom a SU provincia, a una escala donde el low-
  // poly de país se notaría groseramente desalineado — mismo criterio que
  // `provinciasDetalle`. El peso total (ver log más abajo) es comparable al
  // de esa geometría de detalle, así que no hace falta.
  //
  // Se descartan enteros los departamentos que no lleguen a
  // ANTARCTIC_LAT_CUTOFF (el "Antártida Argentina" de Tierra del Fuego, que
  // por sí solo llega a -90°, igual que el sector antártico a nivel
  // provincia) y se les aplica `dropRemoteParts` a los demás (el
  // departamento "Islas del Atlántico Sur" trae, en un solo MultiPolygon,
  // las Malvinas Y las Georgias/Sandwich del Sur — a miles de km de
  // distancia; sin este filtro, encuadrar Tierra del Fuego incluiría ese
  // archipiélago lejano y el zoom a la provincia quedaría alejadísimo).
  console.log('Procesando geometría de departamentos...')
  const departamentosPorProvincia = new Map()
  let departamentosDescartados = 0
  for (const f of departamentosGeojsonRaw.features) {
    const maxLat = Math.max(
      ...(f.geometry.type === 'MultiPolygon'
        ? f.geometry.coordinates
        : [f.geometry.coordinates]
      ).map((poly) => ringBounds(poly[0]).maxLat),
    )
    if (maxLat <= ANTARCTIC_LAT_CUTOFF) {
      departamentosDescartados++
      continue
    }

    const id = f.properties.id
    const provinciaId = f.properties.provincia.id
    const agg = porDepartamento.get(id) ?? { total: 0, porCategoria: new Map() }
    const porCategoriaObj = Object.fromEntries(agg.porCategoria)
    const maxCount = Math.max(0, ...Object.values(porCategoriaObj))
    const categoriasPredominantes = Object.entries(porCategoriaObj)
      .filter(([, count]) => count === maxCount && maxCount > 0)
      .map(([categoria]) => categoria)
    const pob = poblacionDepartamentos[id] ?? null

    const geometry = sinTriangulosDegenerados(dropRemoteParts(f.geometry))

    const feature = {
      type: 'Feature',
      properties: {
        id,
        provinciaId,
        nombre: f.properties.nombre,
        poblacion: pob,
        totalEspacios: agg.total,
        porCategoria: porCategoriaObj,
        categoriasPredominantes,
        densidadPor100k: pob
          ? Number(((agg.total / pob) * 100000).toFixed(2))
          : null,
      },
      geometry,
    }

    if (!departamentosPorProvincia.has(provinciaId)) {
      departamentosPorProvincia.set(provinciaId, [])
    }
    departamentosPorProvincia.get(provinciaId).push(feature)
  }
  console.log(
    `${departamentosGeojsonRaw.features.length - departamentosDescartados} departamentos (${departamentosDescartados} descartados por antárticos)`,
  )

  // --- Escritura de salidas --------------------------------------------------
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(path.join(DATA_DIR, 'espacios'), { recursive: true })
  await mkdir(DOCS_DIR, { recursive: true })

  await writeFile(
    path.join(DATA_DIR, 'provincias-resumen.json'),
    JSON.stringify(provinciasResumen),
  )
  console.log(
    `Escrito src/data/provincias-resumen.json (${features.length} provincias)`,
  )

  await writeFile(
    path.join(DATA_DIR, 'provincias-detalle.json'),
    JSON.stringify(provinciasDetalle),
  )
  console.log(
    `Escrito src/data/provincias-detalle.json (${features.length} provincias)`,
  )

  // Un archivo por provincia (igual que `espacios/*.json`): la geometría de
  // departamento solo hace falta una vez que se hizo zoom a ESA provincia,
  // nunca a las 24 a la vez — cargarla lazy evita bajar de entrada el peso
  // completo de las ~529 geometrías.
  await mkdir(path.join(DATA_DIR, 'departamentos'), { recursive: true })
  let totalDepartamentos = 0
  const departamentosLivianos = []
  for (const [provinciaId, feats] of departamentosPorProvincia) {
    await writeFile(
      path.join(DATA_DIR, 'departamentos', `${provinciaId}.json`),
      JSON.stringify({ type: 'FeatureCollection', features: feats }),
    )
    totalDepartamentos += feats.length
    for (const f of feats) departamentosLivianos.push(f.properties)
  }
  console.log(
    `Escritos src/data/departamentos/*.json (${totalDepartamentos} departamentos, ${departamentosPorProvincia.size} provincias)`,
  )

  // Versión liviana (solo propiedades, sin geometría) de TODOS los
  // departamentos del país: la escala de color del choropleth por
  // departamento (Etapa 9) necesita conocer la distribución completa de
  // totalEspacios/densidadPor100k ANTES de que se zoomee a ninguna
  // provincia en particular, para que el color de un departamento no
  // cambie según qué otra provincia se visitó antes.
  await writeFile(
    path.join(DATA_DIR, 'departamentos-resumen.json'),
    JSON.stringify(departamentosLivianos),
  )
  console.log(
    `Escrito src/data/departamentos-resumen.json (${departamentosLivianos.length} departamentos)`,
  )

  const porProvinciaEspacios = new Map()
  for (const e of espacios) {
    const key = e.provinciaId ?? 'sin-provincia'
    if (!porProvinciaEspacios.has(key)) porProvinciaEspacios.set(key, [])
    porProvinciaEspacios.get(key).push(e)
  }
  for (const [provinciaId, lista] of porProvinciaEspacios) {
    await writeFile(
      path.join(DATA_DIR, 'espacios', `${provinciaId}.json`),
      JSON.stringify(lista),
    )
  }
  console.log(
    `Escritos src/data/espacios/*.json (${porProvinciaEspacios.size} archivos)`,
  )

  // Índice liviano para el buscador global (Etapa 7): buscar sobre nombre de
  // espacio requeriría, si no, bajar los 24 JSON de /espacios (4+MB) enteros
  // con cada tipeo. Este índice solo lleva los campos que el buscador
  // necesita para mostrar resultados y navegar — el resto de la ficha se
  // carga recién al seleccionar uno, con el mecanismo que ya existe
  // (cargarEspacios por provincia).
  const indiceBusqueda = espacios
    .filter((e) => e.provinciaId && (e.nombre || e.categoria))
    .map((e) => ({
      id: e.id,
      nombre: e.nombre ?? e.categoria,
      categoria: e.categoria,
      localidad: e.localidad,
      provinciaId: e.provinciaId,
    }))
  await writeFile(
    path.join(DATA_DIR, 'indice-busqueda.json'),
    JSON.stringify(indiceBusqueda),
  )
  console.log(
    `Escrito src/data/indice-busqueda.json (${indiceBusqueda.length} espacios)`,
  )

  // Índice de localidades para el buscador global: buscar "Villa Carlos Paz"
  // debe encontrar la localidad como resultado propio (no solo aparecer
  // salpicada como subtítulo de espacios sueltos), y llevar a la vista
  // completa de su provincia ya filtrada por esa localidad. Misma localidad
  // en dos provincias distintas son dos entradas separadas — el filtro de la
  // vista completa es por provincia, así que la ambigüedad se resuelve ahí.
  // Map anidado (no una clave de texto combinada) porque una localidad
  // puede tener espacios en el nombre ("Villa Carlos Paz") — partir un
  // string combinado por un separador se presta a cortar justo esos
  // nombres compuestos.
  const conteoLocalidades = new Map()
  for (const e of espacios) {
    if (!e.provinciaId || !e.localidad) continue
    if (!conteoLocalidades.has(e.provinciaId))
      conteoLocalidades.set(e.provinciaId, new Map())
    const porLocalidad = conteoLocalidades.get(e.provinciaId)
    porLocalidad.set(e.localidad, (porLocalidad.get(e.localidad) ?? 0) + 1)
  }
  const indiceLocalidades = [...conteoLocalidades.entries()].flatMap(
    ([provinciaId, porLocalidad]) =>
      [...porLocalidad.entries()].map(([localidad, cantidadEspacios]) => ({
        localidad,
        provinciaId,
        cantidadEspacios,
      })),
  )
  await writeFile(
    path.join(DATA_DIR, 'indice-localidades.json'),
    JSON.stringify(indiceLocalidades),
  )
  console.log(
    `Escrito src/data/indice-localidades.json (${indiceLocalidades.length} localidades)`,
  )

  const report = buildDataQualityReport(
    completitud,
    totalEspacios,
    totalConAnio,
  )
  await writeFile(path.join(DOCS_DIR, 'data-quality-report.md'), report)
  console.log('Escrito docs/data-quality-report.md')

  console.log(`\nTotal de espacios procesados: ${totalEspacios}`)
}

main().catch((err) => {
  console.error('\nEl pipeline falló:', err.message)
  console.error(
    'Si el error es "ENOENT" sobre un archivo en /data/raw, corré primero: node scripts/fetch-data.mjs',
  )
  process.exit(1)
})
