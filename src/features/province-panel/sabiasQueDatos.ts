/** Pregunta tipo "¿Sabías que…?" y su fun fact, uno por provincia (clave: id
 * de provincia, el mismo de provincias-resumen.json). Se muestra arriba de
 * los destacados al abrir la provincia (ver SabiasQue.tsx). Los datos con
 * números salen del dataset de espacios (conteos por categoría); el resto son
 * datos históricos/culturales redactados a mano. */
export interface SabiasQue {
  pregunta: string
  dato: string
}

export const SABIAS_QUE_POR_PROVINCIA: Record<string, SabiasQue> = {
  '02': {
    pregunta: '¿Sabías que Ciudad de Buenos Aires tiene *349 salas de teatro*?',
    dato: 'Es más que cualquier provincia, incluida Buenos Aires, que tiene 346.',
  },
  '06': {
    pregunta:
      '¿Sabías que en Buenos Aires está la única obra de *Le Corbusier* en Sudamérica?',
    dato: 'La Casa Curutchet, en La Plata, es Patrimonio de la Humanidad de la UNESCO.',
  },
  '10': {
    pregunta: '¿Sabías que Argentina tiene su propia *Londres*?',
    dato: 'Londres, en Catamarca, se fundó en 1558 y se la bautizó en honor a la reina María Tudor.',
  },
  '14': {
    pregunta:
      '¿Sabías que en Córdoba está la *universidad más antigua* del país?',
    dato: 'La Universidad Nacional de Córdoba se fundó en 1613.',
  },
  '18': {
    pregunta:
      '¿Sabías que el *chamamé* es Patrimonio Cultural Inmaterial de la UNESCO?',
    dato: 'Nació en Corrientes y la UNESCO lo declaró patrimonio en 2020.',
  },
  '22': {
    pregunta: '¿Sabías que Resistencia es la *ciudad de las esculturas*?',
    dato: 'Tiene esculturas en calles y plazas, y una bienal que las reúne.',
  },
  '26': {
    pregunta: '¿Sabías que hay una *Gales* escondida en la Patagonia?',
    dato: 'Los colonos galeses llegaron en 1865, y en Gaiman todavía se sirve el té galés.',
  },
  '30': {
    pregunta: '¿Sabías que podés visitar el *palacio* donde vivió *Urquiza*?',
    dato: 'El Palacio San José, en Concepción del Uruguay, hoy es un museo.',
  },
  '34': {
    pregunta:
      '¿Sabías que en Formosa conviven comunidades *wichí, qom y pilagá*?',
    dato: 'Son tres de los pueblos originarios que habitan la provincia.',
  },
  '38': {
    pregunta:
      '¿Sabías que en Jujuy hay una *fortaleza preincaica* que se puede visitar?',
    dato: 'Es el Pucará de Tilcara, en la Quebrada de Humahuaca.',
  },
  '42': {
    pregunta:
      '¿Sabías que La Pampa es de las provincias con *más cultura por habitante*?',
    dato: 'Tiene 52 espacios culturales cada 100 mil habitantes.',
  },
  '46': {
    pregunta:
      '¿Sabías que en La Rioja hay *cañones rojos* de miles de años de antigüedad?',
    dato: 'El Parque Talampaya es Patrimonio de la Humanidad de la UNESCO y tiene petroglifos.',
  },
  '50': {
    pregunta:
      '¿Sabías que Mendoza es la *tercera provincia* con más monumentos y lugares históricos?',
    dato: 'Tiene 87, solo detrás de Buenos Aires y la Ciudad.',
  },
  '54': {
    pregunta:
      '¿Sabías que en el monte misionero hay ruinas de *misiones jesuíticas*?',
    dato: 'San Ignacio Miní es Patrimonio de la Humanidad de la UNESCO.',
  },
  '58': {
    pregunta:
      '¿Sabías que en Neuquén se encontró uno de los *dinosaurios más grandes del mundo*?',
    dato: 'El Argentinosaurus apareció en Plaza Huincul.',
  },
  '62': {
    pregunta:
      '¿Sabías que en los años 80 se pensó mudar la capital del país a *Viedma*?',
    dato: 'El proyecto de trasladar la Capital Federal a Viedma y Carmen de Patagones nunca se concretó.',
  },
  '66': {
    pregunta:
      '¿Sabías que en Salta se conservan *momias incas* a más de 6.700 metros de altura?',
    dato: 'Se las exhibe en el Museo de Arqueología de Alta Montaña (MAAM).',
  },
  '70': {
    pregunta: '¿Sabías que podés visitar la casa donde nació *Sarmiento*?',
    dato: 'La casa natal, en la ciudad de San Juan, hoy es un museo.',
  },
  '74': {
    pregunta:
      '¿Sabías que en San Luis hay una *cueva* que fue habitada hace miles de años?',
    dato: 'La cueva de Inti Huasi es un sitio arqueológico de la provincia.',
  },
  '78': {
    pregunta:
      '¿Sabías que en Santa Cruz hay *pinturas rupestres* de hace miles de años?',
    dato: 'Las de la Cueva de las Manos tienen más de 9.000 años.',
  },
  '82': {
    pregunta: '¿Sabías que Santa Fe tiene *22 Casas del Bicentenario*?',
    dato: 'Es la provincia con más de todo el país.',
  },
  '86': {
    pregunta:
      '¿Sabías que Santiago del Estero es la "*Madre de ciudades*" de Argentina?',
    dato: 'La ciudad se fundó en 1553.',
  },
  '90': {
    pregunta:
      '¿Sabías que en Tucumán vivió un pueblo que *resistió a los españoles más de 100 años*?',
    dato: 'Los quilmes, cuyas ruinas están cerca de Tafí del Valle.',
  },
  '94': {
    pregunta:
      '¿Sabías que en el fin del mundo hay una *cárcel convertida en museo*?',
    dato: 'El antiguo presidio de Ushuaia es hoy el Museo Marítimo y del Presidio.',
  },
}
