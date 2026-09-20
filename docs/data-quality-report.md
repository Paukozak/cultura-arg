# Reporte de calidad de datos

Generado el 2026-09-14 a partir de los CSV de SInCA descargados de datos.cultura.gob.ar.

## Completitud de `anioInauguracion`

En total, **4669 de 11234** registros (41.6%) tienen un año documentado y válido (entre 1400 y 2026).

| Categoría                       | Total | Con año válido |      % | ¿El dataset trae ese campo? |
| ------------------------------- | ----: | -------------: | -----: | :-------------------------: |
| Museos                          |  1182 |            572 |  48.4% |             sí              |
| Bibliotecas Populares           |  1902 |           1862 |  97.9% |             sí              |
| Bibliotecas Especializadas      |  1949 |              0 |   0.0% |             no              |
| Salas de Teatro                 |  1364 |            439 |  32.2% |             sí              |
| Centros Culturales              |  1067 |            225 |  21.1% |             sí              |
| Cines                           |   316 |              0 |   0.0% |             no              |
| Galerías de Arte                |   238 |              0 |   0.0% |             no              |
| Librerías                       |  1623 |              0 |   0.0% |             no              |
| Monumentos y Lugares Históricos |  1436 |           1433 |  99.8% |             sí              |
| Sitios Patrimonio UNESCO        |    24 |             24 | 100.0% |             sí              |
| Casas del Bicentenario          |   133 |            114 |  85.7% |             sí              |

## Notas importantes para el diseño de la línea de tiempo (Etapa 8)

- Las categorías **Bibliotecas Especializadas, Cines, Galerías de Arte, Librerías** no traen ningún campo de año en el CSV de origen: para esos registros `anioInauguracion` es siempre `null`, no es un dato faltante por casualidad.
- **Monumentos y Lugares Históricos**: el campo fuente se llama `fecha_de_inauguracion`, pero en la práctica corresponde a la fecha de declaración/protección legal del bien (100% de completitud, sospechosamente alta comparada con el resto), no necesariamente a la fecha física de construcción. Aclarar esto en la UI si se usa.
- **Sitios Patrimonio UNESCO**: el campo fuente es `declaracion_año` (año en que UNESCO declaró el sitio), no un año de inauguración — son accidentes geográficos o conjuntos históricos preexistentes a su declaración.
- **Salas de Teatro**: el campo `inicio_act` trae el valor `0` en varios registros como placeholder de dato faltante; se descartó como inválido (no se cuenta como año real).

- **58.4% de los registros no tiene año documentado, por arriba del umbral de ~30-40% del plan. La Etapa 8 NO debería armar un scrubber continuo año por año: conviene un set fijo de hitos (décadas/períodos) con conteo acumulado real hasta cada hito, y declarar visiblemente ese porcentaje sin año documentado.**

## Asignación de provincia por registro

`provinciaId` se deriva del código de localidad INDEC (`cod_loc`/`cod_localidad`/`localidad_id` según el CSV) y no de la columna explícita de provincia: al comparar ambas fuentes fila por fila, la columna de provincia trae errores de tipeo puntuales (confirmado en `galerias-de-arte.csv`, 3 filas, y `salas-de-teatro.csv`, 1 fila) mientras que el código de localidad es consistente en la enorme mayoría de los casos. Se detectó una única excepción en sentido inverso en `librerias.csv` (1 fila de 1623) donde el código de localidad parece ser el erróneo. Impacto total: menos de 5 registros de 11234 (<0.05%) podrían estar en la provincia equivocada.
