# Plan de construcción — Cartografía Cultural Argentina

> **Cómo usar este documento**: pegá este archivo como `PLAN.md` en la raíz del repo y decile a Claude Code que lo siga al pie de la letra. Está pensado para ejecutarse **una etapa por vez**, no de corrido.

## Instrucciones obligatorias para Claude Code (leer antes de tocar código)

1. **Nunca avances a la etapa siguiente sin aprobación explícita del usuario.** Al terminar cada etapa: mostrá un resumen de qué archivos creaste/modificaste, cómo se prueba localmente (comando y qué se espera ver), y un mensaje de commit sugerido. Después PARÁ y esperá que el usuario diga algo como "dale, seguí" o pida cambios.
2. **Un commit por etapa, atómico.** No mezcles trabajo de dos etapas en el mismo commit. No hagas commit vos mismo salvo que el usuario lo pida explícitamente — proponé el mensaje y dejá que el usuario decida cuándo commitear.
3. **Si un paso depende de un dato externo que no está disponible** (por ejemplo, no hay acceso de red a `datos.cultura.gob.ar`), no inventes datos de relleno silenciosamente. Frená, avisá el problema concretamente, y proponé una alternativa (por ejemplo, pedirle al usuario que descargue el CSV manualmente y lo coloque en `/data/raw/`).
4. **No te vayas de scope dentro de una etapa.** Si mientras hacés la Etapa 3 ves algo para mejorar de la Etapa 1, anotalo en un archivo `NOTES.md` y seguí — no lo arregles ahí mismo.
5. Todo el copy visible en la interfaz va en español rioplatense, tono directo y simple, sin relleno.

---

## Contexto del proyecto

Visualización interactiva de los espacios culturales de Argentina por provincia, para la categoría **Exploración interactiva** del concurso "Contar con Datos" 2026. Debe permitir filtrar y analizar datos en profundidad (no ser solo un catálogo estático), estar montada en un hosting con link público navegable (no de descarga), y venir acompañada de un video demo de máximo 1 minuto al momento de inscribir.

**Fuentes de datos reales a usar:**
- Espacios culturales: dataset "Espacios Culturales de la Argentina (SInCA)" en `datos.cultura.gob.ar` — CSVs separados por categoría (museos, bibliotecas populares, bibliotecas especializadas, salas de teatro, centros culturales, cines, galerías de arte, librerías, monumentos y lugares históricos, sitios Patrimonio UNESCO, Casas del Bicentenario).
- Geometría de provincias: API Georef Argentina — `https://apis.datos.gob.ar/georef/api/provincias.geojson`.
- Población por provincia: Censo 2022 (INDEC), para calcular densidad per cápita.

---

## Stack técnico (ya decidido, no rediscutir)

- **Build**: Vite + React + TypeScript
- **Estilos**: Tailwind CSS
- **Mapa**: SVG + `d3-geo` (proyección `geoMercator` o `geoAlbers` fiteada al viewport) — no usar Leaflet ni mapas de tiles, no lo necesitamos para un choropleth de 24 polígonos
- **Simplificación de geometría**: `topojson-simplify` o `@turf/simplify` sobre el GeoJSON real (para lograr el look "low-poly" sin inventar formas)
- **Gráficos de comparación**: Recharts
- **Estado global**: Zustand (liviano, evita prop-drilling entre mapa/panel/comparador)
- **Listas largas**: `react-window` para virtualizar
- **Animaciones**: `framer-motion` (paquete `motion`) para transiciones de paneles y micro-interacciones; para las propiedades del mapa (`fill`, `opacity`, `transform` de los `<path>`) usar transiciones CSS nativas, no JS — es más liviano con 24 elementos SVG
- **Hosting**: Vercel o Netlify (deploy estático desde el repo)

---

## Identidad visual de referencia

El usuario subió un mockup (`1789215588256_image.png`) que define la dirección visual. Tokens a extraer de ahí:

- **Fondo**: negro casi puro (~`#0a0a0a`), paneles en gris muy oscuro (~`#161616`) con bordes redondeados sutiles
- **Acento primario**: naranja/ámbar (~`#f5820d`) para elementos activos (tab seleccionado, botón play, año activo en la línea de tiempo, CTA "Ficha")
- **Escala del choropleth**: cálida y secuencial — rojo intenso (densidad muy alta) → naranja → durazno/tostado (media) → gris claro (baja)
- **Tipografía**: una sans-serif para texto general + una monoespaciada reservada específicamente para etiquetas de datos geográficos/técnicos (coordenadas, "ESPACIOS/100K", años) — no la uses en todos lados, solo donde comunica "esto es un dato preciso"
- **Layout**: header fijo con logo/título + buscador + acciones; mapa central con paneles flotantes (controles arriba-izquierda, leyenda arriba-derecha, ficha de provincia abajo-derecha); barra de cronología pegada abajo del mapa; grilla de tarjetas destacadas debajo de todo

**Nota de diseño**: el mockup usa varios recursos visuales muy transitados en dashboards oscuros generados por IA (fondo casi negro + un solo acento, etiquetas en mayúsculas, texto monoespaciado para métricas, separadores con punto medio). No está mal — es una estética legítima y coherente con el tema geodata — pero en la Etapa 9 conviene afinarla para que no se sienta genérica: elegir con más intención dónde usar mayúsculas y dónde no, y no monoespaciar texto que no sea estrictamente un dato.

---

## Principios de animación

El usuario pidió explícitamente que haya animación cuando se hace click en una provincia y se abren los paneles. Regla general: **animar solo lo que responde a una acción del usuario**, no agregar movimiento decorativo porque sí (nada de fade-in escalonado en cada tarjeta al cargar la página — eso es puro relleno visual). Interacciones que sí llevan animación, detalladas en la etapa donde se implementan:

- **Hover sobre una provincia** (Etapa 3): resalte sutil (leve brillo o elevación de sombra), transición corta (~150ms)
- **Cambio de capa** (Etapa 3): el color de cada provincia hace una transición suave al nuevo valor, no un salto abrupto
- **Click en una provincia** (Etapa 4): el resto del mapa se atenúa levemente, la provincia seleccionada se resalta, y el panel lateral entra con una transición de deslizamiento + opacidad (`AnimatePresence` de Framer Motion). Al cerrar, la salida es simétrica, no un corte seco
- **Selección en modo comparar** (Etapa 7): feedback visual claro al agregar una provincia (ej: un chip que aparece con una pequeña transición de escala), para que quede claro que la acción se registró
- **Reproducción de la línea de tiempo** (Etapa 8): acá la animación sí es apropiada como algo más que feedback de click, porque el contenido mismo es una secuencia real en el tiempo — los puntos van apareciendo con una transición corta a medida que se cumple su año, no de forma instantánea

En la Etapa 9 se consolidan todos los tiempos y curvas de easing en un único lugar (por ejemplo, una constante `TRANSITIONS` con duración y easing estándar) para que se sienta como un solo sistema y no animaciones sueltas con timings distintos. Ahí también se respeta `prefers-reduced-motion`: si el usuario tiene reducción de movimiento activada en su sistema, las transiciones bajan a solo cambios de opacidad instantáneos, sin desplazamientos ni escalados.

---

## Etapa 0 — Setup del repositorio y scaffolding

**Objetivo**: tener un proyecto que corre localmente, vacío pero configurado.

**Tareas**:
- Inicializar repo git + `npm create vite@latest` con template `react-ts`
- Instalar y configurar Tailwind CSS
- Instalar dependencias: `d3-geo`, `d3-scale`, `topojson-client`, `@turf/simplify`, `recharts`, `zustand`, `react-window`, `framer-motion`
- Configurar ESLint + Prettier
- Estructura de carpetas:
  ```
  /src
    /components
    /features (map, province-panel, compare, timeline, search, about)
    /store
    /hooks
    /data        <- JSON ya procesados, se sirven estáticos
  /scripts        <- scripts Node de procesamiento de datos (no van al bundle)
  /data/raw       <- CSVs originales descargados (gitignored si pesan mucho)
  /docs
  ```
- `README.md` inicial con el propósito del proyecto y fuentes de datos citadas
- `.gitignore` (node_modules, dist, .env)

**Cómo revisarlo**: `npm run dev` levanta una página en blanco sin errores en consola.

**Commit sugerido**: `chore: scaffold del proyecto (Vite + React + TS + Tailwind)`

---

## Etapa 1 — Pipeline de datos

**Objetivo**: tener los datos reales, limpios y en el formato que la app va a consumir. Esta etapa es la más importante de resolver bien antes de tocar una sola línea de UI.

**Tareas**:
1. Script `scripts/fetch-data.mjs`: descarga los CSV de cada categoría del dataset SInCA y el GeoJSON de provincias de Georef. Si el entorno no tiene salida de red a esos dominios, el script debe fallar con un mensaje claro pidiéndole al usuario que los coloque manualmente en `/data/raw/`.
2. Script `scripts/process-data.mjs`:
   - Normaliza columnas de todos los CSV a un esquema común: `{ id, nombre, categoria, subcategoria, provinciaId, departamento, localidad, lat, lon, anioInauguracion, gestion, direccion, telefono, mail, web }`
   - Cruza `provinciaId` (código INDEC) con la geometría de Georef
   - Simplifica la geometría de cada provincia con `@turf/simplify` (guardar el parámetro de tolerancia usado, documentarlo)
   - Calcula, por provincia: total de espacios, conteo por categoría, categoría(s) predominante(s)
   - Calcula densidad per cápita usando población del Censo 2022 (hardcodeada en un JSON `poblacion-provincias.json` con fuente citada en un comentario)
   - **Chequeo de completitud obligatorio**: calcula qué porcentaje de registros totales y por categoría tiene `anioInauguracion` vacío o inválido. Escribe el resultado en `docs/data-quality-report.md`. Este número decide cómo se diseña la Etapa 8 (línea de tiempo) — no seguir de largo sin mirarlo.
   - Emite `src/data/provincias-resumen.json` (liviano, para el mapa nacional) y `src/data/espacios/{provinciaId}.json` (uno por provincia, para el drill-down)
3. Correr el pipeline y commitear los JSON resultantes (no los CSV crudos si pesan mucho — esos quedan en `/data/raw` gitignorado, pero documentar en el README cómo regenerarlos)

**Cómo revisarlo**: abrir `docs/data-quality-report.md` y `src/data/provincias-resumen.json`, confirmar que los números tengan sentido (ej: Buenos Aires y CABA deberían concentrar la mayor proporción de espacios).

**Commit sugerido**: `feat(data): pipeline de ingesta y normalización de datos SInCA + Georef + población`

---

## Etapa 2 — Mapa nacional estático

**Objetivo**: ver las 24 jurisdicciones dibujadas en pantalla, sin interactividad todavía.

**Tareas**:
- Componente `NationalMap`: renderiza el GeoJSON simplificado con `d3-geo` (`geoMercator().fitSize(...)`) dentro de un `<svg>`
- Color fijo de relleno por ahora (sin lógica de capas todavía), solo para confirmar que las 24 formas aparecen bien proyectadas
- Layout base del header (logo/título, placeholder de buscador sin funcionalidad aún)

**Cómo revisarlo**: se ve un mapa de Argentina reconocible con las 24 provincias/CABA delineadas, sin huecos ni formas rotas.

**Commit sugerido**: `feat(map): mapa nacional estático con geometría real simplificada`

---

## Etapa 3 — Capas intercambiables + leyenda + tooltip

**Objetivo**: el mapa ya comunica información, no solo formas.

**Tareas**:
- Control "Densidad / Total / Tipología" (los tres toggles del mockup) que recalculan la escala de color (`d3-scale` con `scaleThreshold` o `scaleQuantize`)
- Componente `Legend` que se actualiza según la capa activa
- Tooltip on hover con nombre de provincia + métrica activa
- Store de Zustand con el estado `capaActiva`
- Transición CSS (`transition: fill 200ms`) al cambiar de capa, y resalte sutil (glow o elevación de sombra) en la provincia bajo el cursor

**Cómo revisarlo**: cambiar entre los tres toggles cambia visiblemente los colores del mapa con una transición suave (no un salto) y la leyenda se actualiza acorde. Pasar el mouse sobre una provincia la resalta con una transición corta.

**Commit sugerido**: `feat(map): capas intercambiables, leyenda dinámica y tooltip`

---

## Etapa 4 — Drill-down provincial: panel + destacados

**Objetivo**: clickear una provincia abre su detalle.

**Tareas**:
- Al click, cargar (lazy) `src/data/espacios/{provinciaId}.json`
- `ProvincePanel`: header con nombre, total de espacios, densidad
- Función pura `getDestacados(espacios)`: selecciona hasta 5 espacios, uno por cada una de las categorías más presentes en esa provincia, usando `anioInauguracion` más antiguo como criterio de desempate. Escribir esta función con un test unitario simple (2-3 casos) porque es la pieza más "editorial" del proyecto y conviene que no se rompa silenciosamente.
- Tarjetas de destacados (nombre, categoría, año, localidad — sin fotos reales todavía si no hay fuente confiable de imágenes; usar un ícono por categoría como en el mockup en vez de inventar fotos de lugares que no verificamos)
- Botón "volver al mapa nacional"
- **Animación de apertura/cierre**: al clickear una provincia, el resto del mapa se atenúa (opacity reducida) y la seleccionada se resalta; el panel entra con `AnimatePresence` de Framer Motion (deslizamiento + fade, ~250-300ms). Al cerrar el panel o volver al mapa nacional, la transición es simétrica, no un corte abrupto. Nada de animar cada tarjeta de destacados por separado con delay escalonado — entran junto con el panel, como una sola unidad

**Cómo revisarlo**: clickear Córdoba, Chaco y CABA muestra paneles distintos con datos reales y destacados coherentes (categorías distintas entre sí dentro de la misma provincia). El panel abre y cierra con una transición fluida, no aparece/desaparece de golpe.

**Commit sugerido**: `feat(panel): drill-down provincial con tarjetas de destacados`

---

## Etapa 5 — Listado completo filtrable/ordenable + ficha de detalle

**Objetivo**: acá es donde el proyecto deja de ser un catálogo y pasa a ser "exploración".

**Tareas**:
- Lista completa de espacios de la provincia seleccionada, virtualizada con `react-window` (importante para Buenos Aires/CABA que van a tener la mayor cantidad de registros)
- Filtros: por categoría (multi-select), por gestión (pública/privada)
- Orden: alfabético, por año (asc/desc), agrupado por categoría
- Buscador local (texto libre sobre nombre/localidad)
- Al clickear un ítem, expandir/mostrar ficha con los campos disponibles (dirección, localidad, año, contacto si existe)

**Cómo revisarlo**: en una provincia grande, filtrar por una sola categoría reduce la lista correctamente; cambiar el orden reordena sin recargar la página; buscar un nombre puntual lo encuentra.

**Commit sugerido**: `feat(panel): listado filtrable, ordenable y ficha de detalle`

---

## Etapa 6 — Buscador global

**Objetivo**: el buscador del header (hoy placeholder) funciona de verdad.

**Tareas**:
- Búsqueda sobre nombres de provincia y, si el usuario escribe algo más específico, sobre nombres de espacios culturales (esto último puede requerir un índice liviano precomputado en la Etapa 1 si buscar sobre todos los JSON de provincia en caliente es lento — evaluarlo)
- Al seleccionar un resultado, navega directo a esa provincia con el panel abierto

**Cómo revisarlo**: buscar "Teatro Colón" te lleva directo al panel de CABA.

**Commit sugerido**: `feat(search): buscador global de provincias y espacios`

---

## Etapa 7 — Modo comparar

**Objetivo**: cruzar información entre provincias, no solo mirar una por vez.

**Tareas**:
- Toggle "Modo Comparar" en el store; mientras está activo, clickear provincias las agrega a una selección (en vez de abrir el drill-down)
- Panel `ComparePanel` con gráfico de barras agrupadas (Recharts) de distribución por categoría entre las provincias seleccionadas, y un segundo gráfico o tabla de densidad per cápita comparada
- Límite razonable de provincias comparables a la vez (sugerido: 4) para que el gráfico siga siendo legible
- Feedback animado al seleccionar/deseleccionar una provincia en este modo (ej: chip con transición de escala al aparecer), para que la acción se sienta confirmada

**Cómo revisarlo**: activar modo comparar, seleccionar 3 provincias con perfiles distintos (ej: CABA, Chaco, Córdoba) y confirmar que el gráfico refleja proporciones coherentes con lo que ya vimos en el mapa nacional, y que cada selección da una confirmación visual clara.

**Commit sugerido**: `feat(comparar): modo comparación multi-provincia con gráficos`

---

## Etapa 8 — Línea de tiempo

**Objetivo**: mostrar la evolución histórica, resolviendo de entrada el problema de datos faltantes detectado en la Etapa 1.

**Tareas**:
- Revisar el `data-quality-report.md` de la Etapa 1 antes de diseñar esto. Si el porcentaje de registros sin `anioInauguracion` es alto (arriba de ~30-40%), **no** hacer un scrubber continuo año por año — usar en cambio un set fijo de hitos temporales (ej: décadas o períodos históricos relevantes) donde en cada hito se muestra el conteo acumulado real de espacios con año documentado hasta ese punto.
- Las etiquetas/captions de cada hito deben generarse a partir de los datos reales (ej: "Hacia 1980 había X espacios documentados, Y% del total actual"), **no inventar relatos históricos redactados a mano** — evitar el error del mockup de referencia, que atribuía una fecha incorrecta a la CONABIP.
- Declarar visiblemente en la UI (un texto chico cerca del slider) qué porcentaje de espacios no tiene año documentado y por lo tanto no aparece en la animación.
- Control play/pause + posibilidad de arrastrar manualmente al hito que se quiera

**Cómo revisarlo**: correr la animación completa y confirmar que los números mostrados en cada hito son consistentes con un conteo manual rápido sobre el JSON.

**Commit sugerido**: `feat(timeline): cronología de expansión cultural basada en datos reales`

---

## Etapa 9 — Sistema de diseño y responsive

**Objetivo**: pulir visualmente todo lo que ya funciona, sin agregar features nuevas.

**Tareas**:
- Aplicar los tokens de color/tipografía definidos arriba de forma consistente en toda la app (crear un archivo de tokens en Tailwind config, no hardcodear colores sueltos)
- Revisar mayúsculas y monoespaciado con criterio (ver nota de diseño más arriba) en vez de aplicarlo en todos lados
- Pasada de responsive: el layout de paneles flotantes del desktop necesita rearmarse para mobile (probablemente paneles a pantalla completa en vez de superpuestos)
- Foco de teclado visible en todos los controles interactivos (filtros, toggles, items de lista)

**Cómo revisarlo**: probar en un viewport de celular (375px) que todo sigue siendo usable, y navegar los controles principales solo con teclado (Tab + Enter).

**Commit sugerido**: `style: sistema de diseño consistente + responsive + accesibilidad de foco`

---

## Etapa 10 — Sección "Cómo se hizo"

**Objetivo**: dejar la metodología documentada y visible, porque es parte de lo que el jurado evalúa.

**Tareas**:
- Modal o página accesible desde el botón "¿Cómo se hizo?" del header
- Contenido: fuente de los datos (SInCA/Ministerio de Cultura, con link), fecha de corte de los datos, criterio de selección de los "destacados" (explicado en una oración), porcentaje de datos sin año documentado, y declaración de qué partes del desarrollo usaron asistencia de IA (para que coincida con lo que después se declare en el Formulario de Inscripción del concurso)

**Cómo revisarlo**: leer el texto en voz alta — tiene que explicarle la metodología a alguien que no vio el resto de la conversación.

**Commit sugerido**: `feat(about): sección metodológica "cómo se hizo"`

---

## Etapa 11 — QA, performance y deploy

**Objetivo**: que ande bien afuera del entorno de desarrollo.

**Tareas**:
- Lighthouse pass (performance, accesibilidad) y arreglar lo que salga rojo
- Confirmar que el lazy-loading de los JSON por provincia efectivamente evita bajar todo de una (revisar la pestaña Network)
- Configurar deploy en Vercel o Netlify
- `README.md` final: qué es el proyecto, fuentes de datos con links, cómo correr el pipeline de datos localmente, link al deploy

**Cómo revisarlo**: abrir el link de producción desde un celular con datos móviles y confirmar que carga en un tiempo razonable.

**Commit sugerido**: `chore: deploy config + README final`

---

## Al terminar todas las etapas

Recordale al usuario, no lo hagas vos automáticamente:
- Grabar el video demo de máximo 1 minuto para el Formulario de Inscripción
- Completar la descripción metodológica (máx. 200 palabras) citando fuente, fecha de corte, y declaración de uso de IA
- Presentar el proyecto con seudónimo, no con nombre real visible en ningún lado de la interfaz
