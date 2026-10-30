export const HOME_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/ayuda', label: 'Ayuda' },
  { href: '/configuracion', label: 'Configuración' },
] as const;

export const FLOW_STEPS = [
  { href: '/analisis/cargar', label: 'Cargar' },
  { href: '/analisis/analizar', label: 'Analizar' },
  { href: '/analisis/revisar', label: 'Revisar' },
  { href: '/analisis/adaptar', label: 'Adaptar' },
  { href: '/analisis/resultado', label: 'Obtener resultado' },
] as const;

export const DIMENSIONS = [
  'Comprensión',
  'Estructura',
  'Accesibilidad visual',
  'Alt. de representación',
  'Contenido multimedia',
  'Navegación',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export type Severity = 'alta' | 'media' | 'baja';

/** Intentos de IA por cada barrera (no se comparten entre barreras). */
export const AI_ATTEMPTS_PER_BARRIER = 5;

/** @deprecated Usar AI_ATTEMPTS_PER_BARRIER */
export const AI_ATTEMPTS_PER_DIMENSION = AI_ATTEMPTS_PER_BARRIER;

/** Tiempo fijo de “generación” mock antes de mostrar el detalle. */
export const GENERATE_TIMEOUT_MS = 2000;

/** Pausa breve al abrir Detalle desde “Volver a editar” en Adaptar. */
export const RESUME_EDIT_TIMEOUT_MS = 450;

export type BarrierGroup = {
  id: string;
  name: string;
  count: number;
  severity: Severity | 'ninguna';
  items: {
    title: string;
    why: string;
    where: string;
    recommendation: string;
  }[];
};

export const BARRIERS: BarrierGroup[] = [
  {
    id: 'comprension',
    name: 'Comprensión',
    count: 4,
    severity: 'alta',
    items: [
      {
        title: 'Definición de madera demasiado densa',
        why: 'Una sola oración larga mezcla definición, usos y origen sin pausas.',
        where: 'Tecnología de la madera · definición (pág. 1)',
        recommendation:
          'dividir en oraciones cortas y explicar el primer término técnico en un glosario lateral.',
      },
      {
        title: 'Término «rollizo» sin definición accesible',
        why: 'Aparece como concepto clave y no se explica con palabras de uso cotidiano.',
        where: 'Tecnología de la madera (pág. 1)',
        recommendation:
          'agregar una entrada breve de glosario en la primera aparición.',
      },
      {
        title: 'Partes del tronco encadenadas sin apoyo',
        why: 'Médula, duramen, albura, cambium y liber se presentan seguidos sin guía.',
        where: 'Estructura de la madera (págs. 1–2)',
        recommendation:
          'una idea por oración y definir al menos un término por bloque.',
      },
      {
        title: 'Consigna implícita sin andamiaje',
        why: 'Se asume que el estudiante relaciona cortes y usos sin un recordatorio previo.',
        where: 'Diferentes cortes de un tronco (pág. 2)',
        recommendation:
          'incluir un recordatorio breve del concepto antes de pedir ejemplos o usos.',
      },
    ],
  },
  {
    id: 'estructura',
    name: 'Estructura',
    count: 2,
    severity: 'media',
    items: [
      {
        title: 'Bloque de curado sin subtítulos claros',
        why: 'Natural, por lavado y artificial aparecen en un bloque denso difícil de recorrer.',
        where: 'Curado de la madera (pág. 3)',
        recommendation:
          'dividir en subsecciones con títulos breves por método de secado.',
      },
      {
        title: 'Propiedades mezcladas en un solo tramo',
        why: 'Dureza, densidad, trabajo y grietas se suceden sin jerarquía visible.',
        where: 'Propiedades y deformaciones (pág. 3)',
        recommendation:
          'reordenar: qué es cada propiedad, por qué importa y un ejemplo de taller.',
      },
    ],
  },
  {
    id: 'visual',
    name: 'Accesibilidad visual',
    count: 3,
    severity: 'alta',
    items: [
      {
        title: 'Esquema del tronco sin texto alternativo',
        why: 'Quien no ve la figura no accede a las partes del tronco que transmite.',
        where: 'Partes del tronco (pág. 1–2)',
        recommendation:
          'agregar un alt-text que nombre médula, duramen, albura, cambium, liber y corteza.',
      },
      {
        title: 'Contraste insuficiente en pie de página',
        why: 'El texto del pie (CFP N°7) en gris claro dificulta la lectura.',
        where: 'Pie de página (págs. 1–3)',
        recommendation: 'aumentar el contraste del texto según criterios WCAG.',
      },
      {
        title: 'Tabla de maderas sin encabezados claros',
        why: 'Sin encabezados explícitos, un lector de pantalla no asocia nombre, origen y usos.',
        where: 'Tipos de maderas · clasificación (Materiales II, pág. 1)',
        recommendation:
          'usar encabezados de columna claros (Nombre, Origen, Características, Precio, Usos).',
      },
    ],
  },
  {
    id: 'representacion',
    name: 'Alt. de representación',
    count: 1,
    severity: 'baja',
    items: [
      {
        title: 'Los cortes del tronco solo en prosa',
        why: 'Una única forma de mostrar aserrado plano, radial y de vigas deja afuera otros modos de comprender.',
        where: 'Diferentes cortes de un tronco (pág. 2)',
        recommendation:
          'sumar un esquema simple o una lista con el nombre del corte y su uso principal.',
      },
    ],
  },
  {
    id: 'multimedia',
    name: 'Contenido multimedia',
    count: 3,
    severity: 'media',
    items: [
      {
        title: 'Audio del taller sin transcripción',
        why: 'La explicación oral del curado no está disponible como texto.',
        where: 'Recurso de audio · Curado de la madera',
        recommendation: 'incorporar la transcripción junto al reproductor.',
      },
      {
        title: 'Video de aserrado sin subtítulos',
        why: 'El contenido hablado del corte del rollizo no está disponible para quien no puede escuchar.',
        where: 'Video · Diferentes cortes de un tronco',
        recommendation:
          'agregar subtítulos cerrados o transcripción sincronizada.',
      },
      {
        title: 'Controles del reproductor poco visibles',
        why: 'Botones pequeños o de bajo contraste dificultan pausar o ajustar volumen.',
        where: 'Reproductor del material multimedia',
        recommendation:
          'aumentar tamaño de controles y etiquetas accesibles para cada acción.',
      },
    ],
  },
  {
    id: 'navegacion',
    name: 'Navegación',
    count: 0,
    severity: 'ninguna',
    items: [],
  },
];

export type Suggestion = {
  id: string;
  title: string;
  dimension: Dimension;
  severity: Severity;
  criterion: string;
  detected: string;
  why: string;
  proposes: string;
  location: string;
  original: string;
  aiProposal: string;
  editedProposal: string;
  variants: {
    simple: string;
    breve: string;
    pasos: string;
    ejemplo: string;
    otra: string;
  };
};

export const SUGGESTIONS: Suggestion[] = [
  {
    id: 'intro',
    title: 'Simplificar definición de madera',
    dimension: 'Comprensión',
    severity: 'alta',
    criterion: 'Lenguaje claro',
    detected:
      'Definición en una sola oración larga, con términos técnicos (orgánica, fibrosa, manufactura) sin apoyo.',
    why: 'Las oraciones muy extensas y el vocabulario técnico aumentan la carga de lectura en un apunte de taller.',
    proposes:
      'Dividir en 2 oraciones breves, usar palabras de uso cotidiano y conservar la idea central.',
    location: 'Tecnología de la madera · Pág. 1',
    original:
      'Llamase madera a la sustancia orgánica vegetal mas o menos dura, compacta y fibrosa que se extrae de los árboles y con la cual el hombre fabrica los más variados objetos para la vivienda y el uso diario.',
    aiProposal:
      'La madera es la parte dura y fibrosa de los árboles. Con ella se fabrican objetos para la vivienda y el uso diario.',
    editedProposal:
      'La madera es la parte dura y fibrosa de los árboles. Con ella se fabrican objetos para la vivienda y el uso diario. En carpintería es el material predominante.',
    variants: {
      simple:
        'La madera sale de los árboles. Es dura y fibrosa. Sirve para fabricar muebles y objetos de uso diario.',
      breve: 'La madera es el material duro y fibroso que se saca de los árboles.',
      pasos:
        '1. Se obtiene de los árboles.\n2. Es dura, compacta y fibrosa.\n3. Se usa para objetos de vivienda y uso diario.',
      ejemplo:
        'La madera es el material del árbol que usamos en carpintería. Por ejemplo, tablas y tableros para muebles.',
      otra: 'En carpintería, madera es la sustancia fibrosa del árbol con la que fabricamos objetos útiles.',
    },
  },
  {
    id: 'seccion',
    title: 'Dividir curado en subtítulos',
    dimension: 'Estructura',
    severity: 'media',
    criterion: 'Estructura predecible',
    detected:
      '«Curado de la madera» junta tres métodos en un bloque sin subtítulos ni listas.',
    why: 'Sin cortes visibles cuesta anticipar cada método y volver a uno puntual en clase.',
    proposes: 'Crear tres subtítulos: secado natural, por lavado y artificial.',
    location: 'Curado de la madera · Pág. 3',
    original:
      'SECADO NATURAL: En este procedimientola madera aserradase expone al aire libre, cuidadosamente apiladapara que el secado sea uniforme. SECADO POR LAVADO: un método algo más rápidode cuardo, consiste en sumergir la madera en agua corriente durante un mes aproximadamente. SECADO ARTIFICIAL: Este es uno de los métodos más utilizados actualmente por su rapidez, se introduce el rollo ya trozada y aserrado con listones de separación entre tabla y tabla dentro de un horno.',
    aiProposal:
      'Curado de la madera\n\nSecado natural. La madera aserrada se apila al aire libre para que seque parejo.\n\nSecado por lavado. Se sumerge en agua corriente cerca de un mes y luego se seca al aire.\n\nSecado artificial. Se coloca en un horno con calor, humedad y ventilación; puede durar entre 10 y 30 horas.',
    editedProposal:
      'Curado de la madera\n\nSecado natural. La madera aserrada se apila al aire libre para que seque parejo.\n\nSecado por lavado. Se sumerge en agua corriente cerca de un mes y luego se seca al aire.\n\nSecado artificial. Se coloca en un horno con calor, humedad y ventilación; puede durar entre 10 y 30 horas.',
    variants: {
      simple:
        'Hay tres formas de curar la madera: al aire, lavándola con agua y después secándola, o en un horno.',
      breve:
        'Curado: secado natural, por lavado o artificial (horno).',
      pasos:
        '1. Natural: apilar al aire.\n2. Lavado: un mes en agua y luego aire.\n3. Artificial: horno 10–30 h.',
      ejemplo:
        'Si necesitás secar tablas rápido para el taller, el método artificial (horno) suele ser el más usado.',
      otra: 'El curado prepara la madera antes de usarla. Elegí el método según tiempo y calidad que necesites.',
    },
  },
  {
    id: 'alt',
    title: 'Agregar alt-text al esquema del tronco',
    dimension: 'Accesibilidad visual',
    severity: 'alta',
    criterion: 'Texto alternativo',
    detected:
      'La figura de partes del tronco no tiene descripción; solo se listan nombres en el texto.',
    why: 'Sin alternativa textual, la información visual del corte del tronco no está disponible con lector de pantalla.',
    proposes:
      'Describir las capas del tronco desde el centro hacia afuera, en una oración.',
    location: 'Partes del tronco · Págs. 1–2',
    original: '(sin descripción)',
    aiProposal:
      'Esquema de la sección de un tronco: en el centro la médula, luego duramen, albura, cambium, liber y corteza hacia afuera.',
    editedProposal:
      'Esquema de la sección de un tronco: en el centro la médula, luego duramen, albura, cambium, liber y corteza hacia afuera.',
    variants: {
      simple:
        'Dibujo del tronco cortado al medio, con capas desde el centro hasta la corteza.',
      breve:
        'Esquema: médula, duramen, albura, cambium, liber y corteza.',
      pasos:
        '1. Centro: médula.\n2. Luego duramen y albura.\n3. Afuera: cambium, liber y corteza.',
      ejemplo:
        'Como las capas de una cebolla: cada anillo del tronco tiene un nombre y una función.',
      otra: 'Figura del rollizo en corte transversal con las partes nombradas del centro a la corteza.',
    },
  },
  {
    id: 'glosario',
    title: 'Explicar «rollizo» en el glosario',
    dimension: 'Comprensión',
    severity: 'media',
    criterion: 'Lenguaje claro',
    detected:
      'El término aparece como pieza comercial clave y no se define con palabras simples.',
    why: 'Un término central del taller sin definición frena a quien no lo conoce de antes.',
    proposes:
      'Agregar una entrada breve de glosario lateral en la primera aparición.',
    location: 'Tecnología de la madera · Pág. 1',
    original: 'ROLLIZO o ROLLO',
    aiProposal:
      'Rollizo (o rollo): tronco abatido con los extremos cortados, listo para remitir al mercado de maderas.',
    editedProposal:
      'Rollizo (o rollo): tronco abatido con los extremos cortados, listo para remitir al mercado de maderas.',
    variants: {
      simple:
        'Rollizo: el tronco del árbol ya cortado en los extremos, como llega del monte.',
      breve: 'Rollizo: tronco cortado listo para vender o aserrar.',
      pasos:
        'Rollizo\n1. Se tala el árbol.\n2. Se cortan los extremos.\n3. Queda el tronco listo para el mercado.',
      ejemplo:
        'Rollizo: el tronco completo que llega al aserradero antes de convertirse en tablas.',
      otra: 'En carpintería, rollizo es el fuste del árbol preparado para aserrar.',
    },
  },
  {
    id: 'audio',
    title: 'Transcribir el audio de curado',
    dimension: 'Contenido multimedia',
    severity: 'media',
    criterion: 'Alternativa textual',
    detected: 'Hay un audio breve sobre curado sin transcripción ni resumen.',
    why: 'Quien no puede escuchar el audio pierde la explicación del taller.',
    proposes: 'Publicar la transcripción debajo del reproductor.',
    location: 'Curado de la madera · Audio',
    original: '(audio sin texto)',
    aiProposal:
      'Transcripción: la madera debe estar bien curada antes de usarla. Se puede secar al aire, lavarla en agua corriente y luego secarla, o usar un horno con calor, humedad y ventilación.',
    editedProposal:
      'Transcripción: la madera debe estar bien curada antes de usarla. Se puede secar al aire, lavarla en agua corriente y luego secarla, o usar un horno con calor, humedad y ventilación.',
    variants: {
      simple:
        'Antes de trabajarla, la madera se cura: al aire, con lavado o en horno.',
      breve:
        'El audio explica los tres métodos de curado o secado de la madera.',
      pasos:
        '1. Secado natural al aire.\n2. Lavado en agua y secado.\n3. Secado artificial en horno.',
      ejemplo:
        'Si las tablas llegan verdes al taller, primero hay que curarlas para que no se tuerzan.',
      otra: 'Texto del audio: el curado prepara la madera y evita problemas al trabajarla.',
    },
  },
];

export type DetailBarrier = Suggestion & {
  barrierId: string;
  dimensionId: string;
};

function mockVariants(
  aiProposal: string,
  recommendation: string,
  where: string
) {
  return {
    simple: aiProposal,
    breve: recommendation,
    pasos: `1. Revisar ${where}.\n2. ${recommendation}`,
    ejemplo: aiProposal,
    otra: aiProposal,
  };
}

const RICH_BY_BARRIER_ID: Record<string, Suggestion> = {
  'comprension-0': SUGGESTIONS.find((item) => item.id === 'intro')!,
  'comprension-1': SUGGESTIONS.find((item) => item.id === 'glosario')!,
  'estructura-0': SUGGESTIONS.find((item) => item.id === 'seccion')!,
  'visual-0': SUGGESTIONS.find((item) => item.id === 'alt')!,
  'multimedia-0': SUGGESTIONS.find((item) => item.id === 'audio')!,
};

/** Todas las barreras detectadas, en orden de dimensión, para el paso Detalle. */
export const DETAIL_BARRIERS: DetailBarrier[] = BARRIERS.filter(
  (group) => group.items.length > 0
).flatMap((group) =>
  group.items.map((item, index) => {
    const barrierId = `${group.id}-${index}`;
    const severity: Severity =
      group.severity === 'ninguna' ? 'baja' : group.severity;
    const dimension = group.name as Dimension;
    const rich = RICH_BY_BARRIER_ID[barrierId];

    if (rich) {
      return {
        ...rich,
        id: barrierId,
        barrierId,
        dimensionId: group.id,
        title: item.title,
        dimension,
        severity,
        why: item.why,
        proposes: item.recommendation,
        location: item.where,
      };
    }

    const aiProposal = `Propuesta: ${item.recommendation.charAt(0).toUpperCase()}${item.recommendation.slice(1)}`;
    return {
      id: barrierId,
      barrierId,
      dimensionId: group.id,
      title: item.title,
      dimension,
      severity,
      criterion: group.name,
      detected: item.why,
      why: item.why,
      proposes: item.recommendation,
      location: item.where,
      original: `(Fragmento en ${item.where})`,
      aiProposal,
      editedProposal: aiProposal,
      variants: mockVariants(aiProposal, item.recommendation, item.where),
    };
  })
);

export const RESULT_FILES = [
  {
    name: 'CARPINTERIA_I_TECNO_DE_MAT_adaptado.pdf',
    detail: 'Material con todas las adaptaciones aceptadas · 2.1 MB',
  },
  {
    name: 'Informe_barreras.pdf',
    detail: 'Diagnóstico completo y registro de cambios · 380 KB',
  },
  {
    name: 'CARPINTERIA_I_TECNO_DE_MAT_adaptado.docx',
    detail: 'Versión editable del material adaptado · 1.1 MB',
  },
] as const;

export const APPLIED_CHANGES = [
  'Comprensión — Definición de madera simplificada',
  'Accesibilidad visual — Alt-text del esquema del tronco',
  'Estructura — Curado dividido en subtítulos',
  'Comprensión — Término “rollizo” explicado en glosario',
] as const;

export function countWords(text: string) {
  const words = text.trim().match(/[\p{L}\p{N}]+/gu);
  return words?.length ?? 0;
}

export function countSentences(text: string) {
  const parts = text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return Math.max(parts.length, text.trim() ? 1 : 0);
}

export function readingLabel(text: string) {
  const words = countWords(text);
  const sentences = countSentences(text);
  const average = sentences === 0 ? words : words / sentences;
  if (average <= 16) return 'fácil';
  if (average <= 28) return 'media';
  return 'difícil';
}
