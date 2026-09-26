import { Info } from 'lucide-react'
import { BotonAbrirModal, ModalInfoContent, Seccion } from './ModalInfo'
import { SugerenciasInline } from './SugerenciasInline'

// Cifras de docs/data-quality-report.md y de los comentarios de
// scripts/process-data.mjs (generado 2026-09-24, ver ahí el desglose por
// categoría) — se hardcodean acá porque son un hecho puntual sobre el corte
// de datos usado, no algo que la app recalcule en runtime.
const TOTAL_ESPACIOS = 11234
const PCT_SIN_ANIO = 58.4
const PCT_SIN_LOCALIDAD = 0.8
const FECHA_CORTE = '12 de septiembre de 2026'

function Fuente({
  nombre,
  descripcion,
  href,
}: {
  nombre: string
  descripcion: string
  href: string
}) {
  return (
    <li className="flex flex-col gap-0.5">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-accent hover:underline"
      >
        {nombre}
      </a>
      <span className="text-sm text-neutral-400">{descripcion}</span>
    </li>
  )
}

function Metrica({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
      <span className="font-mono text-2xl text-neutral-100">{valor}</span>
      <span className="text-xs text-neutral-500">{etiqueta}</span>
    </div>
  )
}

function ComoSeHizoContent({ onCerrar }: { onCerrar: () => void }) {
  return (
    <ModalInfoContent
      tituloId="como-se-hizo-titulo"
      titulo="¿Cómo se hizo?"
      onCerrar={onCerrar}
    >
      <SugerenciasInline />

      <Seccion titulo="Para qué es este mapa">
        <p>
          Argentina tiene {TOTAL_ESPACIOS.toLocaleString('es-AR')} espacios
          culturales documentados por el Estado en 11 categorías: museos,
          bibliotecas populares y especializadas, salas de teatro, centros
          culturales, cines, galerías, librerías, monumentos, sitios Patrimonio
          UNESCO y Casas del Bicentenario, repartidos en las 24 jurisdicciones
          de primer orden. Este mapa junta esos datos, hoy dispersos en
          planillas separadas por categoría, en un solo lugar navegable por
          provincia: la idea es que se pueda ver y comparar de un vistazo la
          oferta cultural de cada rincón del país.
        </p>
        <p>
          Este proyecto fue desarrollado para participar del Concurso Nacional
          de Visualización de Datos 2026 "Contar con Datos", organizado por la
          Secretaría de Innovación, Ciencia y Tecnología de la Nación y la
          Universidad de San Andrés.
        </p>
      </Seccion>

      <Seccion titulo="Fuentes de datos">
        <ul className="flex flex-col gap-3">
          <Fuente
            nombre="SInCA · Espacios Culturales de la Argentina"
            descripcion="Ministerio de Cultura de la Nación. Museos, bibliotecas populares, bibliotecas especializadas, salas de teatro, centros culturales, cines, galerías, librerías, monumentos, sitios Patrimonio UNESCO y Casas del Bicentenario."
            href="https://datos.cultura.gob.ar/"
          />
          <Fuente
            nombre="API Georef Argentina"
            descripcion="Geometría de provincias, usada para el mapa y para descartar pines con coordenadas fuera de su provincia."
            href="https://datosgobar.github.io/georef-ar-api/"
          />
          <Fuente
            nombre="INDEC · Censo Nacional 2022"
            descripcion="Población por provincia, usada para calcular la densidad de espacios cada 100 mil habitantes."
            href="https://censo.gob.ar/"
          />
        </ul>
        <p className="text-xs text-neutral-500">
          Corte de los datos de SInCA: {FECHA_CORTE}. La app no se actualiza
          sola con datos nuevos del dataset.
        </p>
      </Seccion>

      <Seccion titulo="Normalización">
        <p>
          SInCA distribuye los espacios culturales en 11 planillas separadas,
          una por categoría, y cada una nombra y da formato a los mismos datos
          de manera distinta. El primer paso fue traducir las 11 planillas a un
          mismo esquema, los mismos campos, con el mismo formato, para que
          cualquier registro se pueda tratar igual sin importar de qué categoría
          vino.
        </p>
      </Seccion>

      <Seccion titulo="Limpieza">
        <p>
          Con los datos ya en un esquema común, la limpieza fue el paso en el
          que se corrigieron y completaron los valores en sí. Se siguió un mismo
          criterio en todo el proceso, usar siempre el dato más confiable
          disponible, y no completar nada que no se pueda sostener con otro dato
          ya presente en el registro.
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-4 marker:text-neutral-600">
          <li>
            La provincia de cada espacio se calcula a partir de un código de
            localidad numérico, no de la columna de texto libre (mucho más
            propensa a errores de tipeo).
          </li>
          <li>
            Los marcadores de "sin dato" que trae la fuente (como "s/d") se
            tratan como campo vacío, no como si fueran un valor real.
          </li>
          <li>
            Las variantes de un mismo nombre de localidad, por acentos o
            mayúsculas inconsistentes, se unifican eligiendo la forma mejor
            escrita, no la más repetida.
          </li>
          <li>
            Los campos vacíos se completan solo cuando otro dato confiable del
            mismo registro o de un vecino geográfico muy cercano lo resuelve sin
            ambigüedad; si no hay esa certeza, queda como faltante.
          </li>
          <li>
            Un puñado de correcciones puntuales se aplicó a mano para errores de
            origen que no siguen ningún patrón general, verificadas cruzando
            otras columnas del mismo registro.
          </li>
        </ul>
        <p>
          El departamento de cada espacio surge de los mismos primeros 5 dígitos
          del código de localidad (2 de provincia + 3 de departamento). CABA es
          un caso aparte: la fuente no llega a nivel comuna y siempre trae el
          mismo código placeholder para toda la ciudad, así que su comuna se
          resuelve por geocodificación, ubicando cada coordenada dentro del
          polígono de una de las 15 comunas reales. Así se resolvieron 2625 de
          los 2653 espacios porteños; los 28 restantes, sin coordenadas
          confiables dentro de esos límites, quedan sin comuna asignada.
        </p>
      </Seccion>

      <Seccion titulo="Criterio de elección de visualización">
        <p>
          Se eligió un mapa coroplético, permitiendo comparar la oferta cultural
          entre provincias de un vistazo.
        </p>
        <p>
          Además, hay dos formas de ver ese color (Densidad y Total, alternables
          con el selector arriba del mapa) porque cada una responde una pregunta
          distinta. El Total muestra la cantidad bruta de espacios culturales de
          cada provincia. La Densidad divide ese total por cada 100 mil
          habitantes, para que una provincia chica no quede siempre opacada por
          una grande solo por tener menos población. Ninguna reemplaza a la
          otra, por eso conviven como dos vistas del mismo mapa en vez de
          mezclarse en una sola métrica.
        </p>
        <p>
          La rampa de color (celeste clarito a azul profundo, 5 escalones) es la
          paleta secuencial "Blues" de ColorBrewer, elegida por ser legible con
          cualquier tipo de daltonismo (protanopia, deuteranopia, tritanopia).
          Los espacios sin dato de densidad se muestran en gris, no en el
          escalón más claro de la rampa, para no confundir "sin datos" con
          "poco".
        </p>
        <ul className="flex flex-col gap-2 list-disc pl-4 marker:text-neutral-600">
          <li>
            Los escalones se arman por cuantiles de la propia distribución (la
            misma cantidad de provincias o departamentos en cada escalón), no
            dividiendo el rango de valores en partes iguales. El total de
            espacios está muy sesgado por CABA y Buenos Aires (miles) contra el
            resto (decenas a cientos): con una escala lineal casi todo caía en
            el primer escalón y el mapa se veía prácticamente de un solo color.
          </li>
          <li>
            Al hacer zoom a una provincia, el choropleth de sus departamentos
            usa la misma rampa pero calculada sobre los departamentos de todo el
            país, no solo los de esa provincia, así el mismo color significa lo
            mismo en cualquier provincia que se visite, sin depender de qué otra
            se miró antes.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Completitud de los datos">
        <div className="grid grid-cols-2 gap-3">
          <Metrica
            valor={TOTAL_ESPACIOS.toLocaleString('es-AR')}
            etiqueta="espacios culturales relevados en las 24 jurisdicciones"
          />
          <Metrica
            valor={`${PCT_SIN_ANIO}%`}
            etiqueta="de los espacios no tiene año de inauguración documentado"
          />
          <Metrica
            valor={`${PCT_SIN_LOCALIDAD}%`}
            etiqueta="de los espacios no tiene localidad documentada"
          />
        </div>
        <p className="text-xs text-neutral-500">
          El año varía mucho por categoría: cuatro categorías (bibliotecas
          especializadas, cines, galerías de arte y librerías) directamente no
          traen ese campo en la fuente.
        </p>
        <p className="text-xs text-neutral-500">
          Año y localidad no son los únicos con faltantes: web, mail, teléfono,
          gestión, subcategoría y departamento también tienen huecos, algunos
          grandes, en distinta medida por categoría.
        </p>
      </Seccion>

      <Seccion titulo="Destacados de cada provincia">
        <p>
          Se eligieron a mano, provincia por provincia. No reflejan un ranking
          de importancia, sino una selección que intenta mostrar variedad de
          categorías y de partes del territorio.
        </p>
      </Seccion>

      <Seccion titulo="Asistencia de inteligencia artificial">
        <p>
          El desarrollo se hizo con asistencia de Claude Code, bajo dirección y
          revisión humana en cada etapa. La curaduría de destacados y las
          decisiones de qué mostrar y cómo son editoriales, no generadas
          automáticamente.
        </p>
      </Seccion>
    </ModalInfoContent>
  )
}

export function ComoSeHizo() {
  return (
    <BotonAbrirModal icono={Info} label="¿Cómo se hizo?">
      {({ onCerrar }) => <ComoSeHizoContent onCerrar={onCerrar} />}
    </BotonAbrirModal>
  )
}
