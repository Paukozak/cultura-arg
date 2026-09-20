# Notas fuera de alcance

Hallazgos que aparecieron trabajando en otra etapa y que no se arreglan ahí
mismo (regla del plan) — quedan anotados acá para una pasada dedicada.

## Coordenadas de espacios que no coinciden con su provincia (2026-09-14)

Al implementar los pines de la Etapa 6 (zoom + pines por espacio), varios
espacios mostraban su pin lejos de cualquier provincia o en la vecina. Se
investigó con un test punto-en-polígono contra la geometría real (sin
simplificar) de cada provincia — no es un bug del zoom ni de los pines: son
coordenadas del dataset de SInCA que no caen dentro de la provincia que el
propio registro dice tener.

**Mitigación ya aplicada** (`src/features/map/ProvincePins.tsx`): un pin no
se dibuja si su coordenada cae a más de ~3km del polígono real de su
provincia (margen pensado para no descartar casos legítimos cerca de la
costa, como un club náutico sobre un muelle). Evita pines mostrados en
cualquier lugar del mapa, pero no corrige el dato — el espacio sigue
existiendo igual en el listado completo y la ficha, solo no se pinea.

**Lo que queda pendiente de una limpieza real:**

1. **Buenos Aires (id 06): ~127 de 2500 espacios** — la mayoría categoría
   "Librerías", varias comparten exactamente la misma coordenada (p. ej.
   `-34.6036844, -58.3815591` se repite en registros de localidades
   totalmente distintas: 9 de Julio, Del Viso, Pilar, Tigre, San Miguel...).
   Parece un placeholder/fallback de geocodificación de la fuente, no un
   error puntual — requiere re-geocodificar contra la dirección real, no
   algo para adivinar.
2. **Resto de provincias: 1 a 11 casos cada una** (total ~70), mismo patrón
   que el caso ya corregido de INTI/San Martín (`aplicarCorreccionesPuntuales`
   en `scripts/process-data.mjs`): la localidad del registro identifica una
   provincia real distinta a la asignada (p. ej. en Córdoba: "Museo
   Arqueológico La Puerta" con localidad "La Puerta" da lat/lon en zona de
   Catamarca; "Molino de Reyes" con localidad "Jachal" da coordenadas de
   Jáchal, San Juan). Se podrían corregir uno por uno con el mismo mecanismo,
   pero son ~70 registros a verificar con criterio geográfico real, no algo
   para resolver en una sola pasada sin fuente.
3. **CABA (id 02): ~10 casos**, pero la mayoría son ubicaciones reales sobre
   muelles/dársenas del río (Club de Pescadores, Yacht Club Argentino,
   Dársena Norte) — quedan igual de "afuera" del polígono de tierra firme
   por ser, correctamente, casi sobre el agua; el margen de 3km ya los
   tolera. 1-2 sí parecen error de geocodificación real (Biblioteca - Museo
   Nacional de Arte Decorativo cae a ~40km de su ubicación real en Recoleta).
4. **Posible sobre-filtrado en `dropRemoteParts()`** (mismo script): algunos
   casos "afuera" en Tierra del Fuego (p. ej. Isla de los Estados) y
   Corrientes (Anfiteatro Salvador Sena, cerca de Ituzaingó) están dentro de
   la geometría _cruda_ de Georef pero el filtro de partes remotas/antárticas
   los descarta — vale la pena revisar si `MAX_DISTANCE_FROM_ANCHOR_DEG` (hoy
   5°) es demasiado estricto para islotes legítimos que sí tienen espacios
   culturales reales, en vez de asumir que todos son casos como el sector
   antártico o las islas del Atlántico Sur.

Reproducir: point-in-polygon de cada espacio contra
`src/data/provincias-detalle.json` (la geometría sin simplificar, no la del
mapa nacional).
