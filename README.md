# Cartografía Cultural Argentina

Visualización interactiva de los espacios culturales de Argentina por provincia. Proyecto presentado a la categoría **Exploración interactiva** del concurso ["Contar con Datos" 2026](https://datos.cultura.gob.ar).

Permite filtrar y analizar en profundidad los espacios culturales del país (museos, bibliotecas, salas de teatro, centros culturales, cines, galerías de arte, librerías, monumentos y sitios patrimoniales, entre otros), cruzando su distribución geográfica con densidad poblacional y evolución histórica.

## Fuentes de datos

- **Espacios culturales**: dataset ["Espacios Culturales de la Argentina" (SInCA)](https://datos.cultura.gob.ar), Sistema de Información Cultural de la Argentina - Ministerio de Cultura de la Nación.
- **Geometría de provincias**: [API Georef Argentina](https://apis.datos.gob.ar/georef/api/provincias.geojson), Ministerio de Economía.
- **Población por provincia**: Censo Nacional de Población, Hogares y Viviendas 2022 (INDEC).

## Stack técnico

Vite + React + TypeScript, Tailwind CSS, `d3-geo` para el mapa (SVG, sin librerías de tiles), Recharts para gráficos comparativos, Zustand para estado global, `react-window` para listas virtualizadas y Motion (Framer Motion) para animaciones.

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

## Pipeline de datos

Los datos ya procesados viven en `src/data/`. Para regenerarlos desde las fuentes originales:

```bash
node scripts/fetch-data.mjs    # descarga CSVs (SInCA) y GeoJSON (Georef) a /data/raw
node scripts/process-data.mjs  # normaliza, cruza geometría/población y emite src/data/*.json
```

Si el entorno no tiene salida de red a `datos.cultura.gob.ar`, `fetch-data.mjs` va a pedir que se coloquen los CSV manualmente en `/data/raw/`.

## Estado del proyecto

En construcción
