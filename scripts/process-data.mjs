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
// Antes de simplificar, se descartan los polígonos sueltos (islas) de una
// misma jurisdicción cuya área relativa sea menor al 1% del polígono más
// grande de esa jurisdicción. Esto es necesario porque el GeoJSON de Georef
// para Tierra del Fuego incluye ~1500 islotes del sector antártico/Atlántico
// Sur que no aportan nada reconocible a un mapa a escala país y sí un enorme
// costo de puntos. No se descartan territorios de tamaño significativo (islas
// grandes, sector antártico, etc.), solo islotes menores.
const MIN_RELATIVE_PART_AREA = 0.01

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

function dropTinyParts(geometry) {
  if (geometry.type !== 'MultiPolygon') return geometry
  const parts = geometry.coordinates
  const areas = parts.map((p) => ringArea(p[0]))
  const maxArea = Math.max(...areas)
  const kept = parts.filter((_, i) => areas[i] >= maxArea * MIN_RELATIVE_PART_AREA)
  return {
    type: 'MultiPolygon',
    coordinates: kept.length ? kept : [parts[areas.indexOf(maxArea)]],
  }
}

// --- Normalización de gestión -----------------------------------------------
function normalizeGestion(raw) {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (!v || v === 's/d') return null
  const isPriv = /priv/.test(v)
  const isPub = /(p[uú]b[l]?[ií]c[oa]|municipal|provincial|nacional|comunal|gobierno)/.test(v)
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

function field(row, key) {
  if (!key) return null
  const v = row[key]
  return v && v.trim() ? v.trim() : null
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
      const provinciaId = codLocRaw ? codLocRaw.padStart(8, '0').slice(0, 2) : null
      const anio = config.anio ? parseYear(row[config.anio.key], config.anio.format) : null
      if (anio !== null) conAnio++

      espacios.push({
        id: `${resource.slug}-${i + 1}`,
        nombre: field(row, config.nombre),
        categoria: resource.categoria,
        subcategoria: field(row, config.subcategoria),
        provinciaId,
        departamento: field(row, config.departamento),
        localidad: field(row, config.localidad),
        lat: parseCoord(field(row, config.lat)),
        lon: parseCoord(field(row, config.lon)),
        anioInauguracion: anio,
        gestion: config.gestion ? normalizeGestion(field(row, config.gestion)) : null,
        direccion: field(row, config.direccion),
        telefono: field(row, config.telefono),
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
  lines.push(`Generado el ${new Date().toISOString().slice(0, 10)} a partir de los CSV de SInCA descargados de datos.cultura.gob.ar.`)
  lines.push('')
  lines.push('## Completitud de `anioInauguracion`')
  lines.push('')
  lines.push(
    `En total, **${totalConAnio} de ${totalEspacios}** registros (${((totalConAnio / totalEspacios) * 100).toFixed(1)}%) tienen un año documentado y válido (entre 1400 y ${CURRENT_YEAR}).`,
  )
  lines.push('')
  lines.push('| Categoría | Total | Con año válido | % | ¿El dataset trae ese campo? |')
  lines.push('|---|---:|---:|---:|:---:|')
  for (const c of completitud) {
    lines.push(
      `| ${c.categoria} | ${c.total} | ${c.conAnio} | ${c.porcentajeConAnio.toFixed(1)}% | ${c.tieneCampoAnio ? 'sí' : 'no'} |`,
    )
  }
  lines.push('')
  lines.push('## Notas importantes para el diseño de la línea de tiempo (Etapa 8)')
  lines.push('')
  const sinCampo = completitud.filter((c) => !c.tieneCampoAnio).map((c) => c.categoria)
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
  return lines.join('\n')
}

async function main() {
  console.log('Leyendo geometría de provincias (Georef)...')
  const geojsonRaw = JSON.parse(
    await readFile(path.join(RAW_DIR, 'provincias.geojson'), 'utf8'),
  )

  console.log('Leyendo población (Censo 2022)...')
  const { poblacion } = JSON.parse(
    await readFile(path.join(ROOT, 'data', 'poblacion-provincias.json'), 'utf8'),
  )

  console.log('Leyendo y normalizando CSV de SInCA...')
  const { espacios, completitud } = await loadEspacios()

  const totalEspacios = espacios.length
  const totalConAnio = espacios.filter((e) => e.anioInauguracion !== null).length

  // --- Agregados por provincia ----------------------------------------------
  const porProvincia = new Map()
  for (const e of espacios) {
    if (!e.provinciaId) continue
    if (!porProvincia.has(e.provinciaId)) {
      porProvincia.set(e.provinciaId, { total: 0, porCategoria: new Map() })
    }
    const agg = porProvincia.get(e.provinciaId)
    agg.total++
    agg.porCategoria.set(e.categoria, (agg.porCategoria.get(e.categoria) ?? 0) + 1)
  }

  // --- Geometría simplificada + propiedades ---------------------------------
  console.log(`Simplificando geometría (tolerancia ${SIMPLIFY_TOLERANCE}, descarte de islotes < ${MIN_RELATIVE_PART_AREA * 100}% de área relativa)...`)
  const features = geojsonRaw.features.map((f) => {
    const id = f.properties.id
    const agg = porProvincia.get(id) ?? { total: 0, porCategoria: new Map() }
    const porCategoriaObj = Object.fromEntries(agg.porCategoria)
    const maxCount = Math.max(0, ...Object.values(porCategoriaObj))
    const categoriasPredominantes = Object.entries(porCategoriaObj)
      .filter(([, count]) => count === maxCount && maxCount > 0)
      .map(([categoria]) => categoria)
    const pob = poblacion[id] ?? null

    const geometryFiltered = dropTinyParts(f.geometry)
    const simplifiedFeature = simplify(
      { type: 'Feature', properties: {}, geometry: geometryFiltered },
      { tolerance: SIMPLIFY_TOLERANCE, highQuality: true },
    )

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
        densidadPor100k: pob ? Number(((agg.total / pob) * 100000).toFixed(2)) : null,
      },
      geometry: simplifiedFeature.geometry,
    }
  })

  const provinciasResumen = { type: 'FeatureCollection', features }

  // --- Escritura de salidas --------------------------------------------------
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(path.join(DATA_DIR, 'espacios'), { recursive: true })
  await mkdir(DOCS_DIR, { recursive: true })

  await writeFile(
    path.join(DATA_DIR, 'provincias-resumen.json'),
    JSON.stringify(provinciasResumen),
  )
  console.log(`Escrito src/data/provincias-resumen.json (${features.length} provincias)`)

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
  console.log(`Escritos src/data/espacios/*.json (${porProvinciaEspacios.size} archivos)`)

  const report = buildDataQualityReport(completitud, totalEspacios, totalConAnio)
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
