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
        title: 'Párrafo introductorio demasiado complejo',
        why: 'Oraciones muy extensas y vocabulario técnico sin definición.',
        where: 'Sección 1, párrafo 1 (pág. 1)',
        recommendation:
          'dividir en oraciones cortas y definir el primer término técnico en glosario lateral.',
      },
      {
        title: 'Término «homeostasis» sin definición',
        why: 'Aparece varias veces y nunca se explica con palabras de uso cotidiano.',
        where: 'Sección 1, párrafos 1–2 (pág. 1)',
        recommendation:
          'agregar una entrada breve de glosario en la primera aparición.',
      },
      {
        title: 'Términos técnicos encadenados',
        why: 'Varios conceptos especializados seguidos aumentan la carga de lectura.',
        where: 'Sección 1, párrafo 2 (pág. 1)',
        recommendation:
          'una idea por oración y definir al menos un término por bloque.',
      },
      {
        title: 'Consigna sin andamiaje previo',
        why: 'La actividad pide inferir sin recordatorio del concepto clave.',
        where: 'Actividad al final de la sección 1 (pág. 1)',
        recommendation:
          'incluir un recordatorio breve del concepto antes de la pregunta.',
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
        title: 'Sección 2 sin subtítulos',
        why: 'Un bloque extenso dificulta recorrer el contenido y encontrar un tema.',
        where: 'Sección 2 (pág. 2)',
        recommendation:
          'dividir en subsecciones con títulos breves y descriptivos.',
      },
      {
        title: 'Orden poco predecible de temas',
        why: 'Se nombra un sistema antes de introducir el contexto del medio interno.',
        where: 'Sección 2, primer párrafo (pág. 2)',
        recommendation:
          'reordenar: contexto general, sistemas involucrados y luego función de cada uno.',
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
        title: 'Imagen 1 sin texto alternativo',
        why: 'Quien no ve la imagen no accede a la información que transmite.',
        where: 'Sección 1, figura 1 (pág. 1)',
        recommendation:
          'agregar un alt-text que describa la relación entre órganos y equilibrio.',
      },
      {
        title: 'Contraste insuficiente en epígrafe',
        why: 'Texto gris claro sobre fondo claro dificulta la lectura.',
        where: 'Epígrafe de la figura 1 (pág. 1)',
        recommendation: 'aumentar el contraste del texto según criterios WCAG.',
      },
      {
        title: 'Tabla sin encabezados claros',
        why: 'Sin encabezados de fila y columna, un lector de pantalla no asocia las celdas.',
        where: 'Tabla de la sección 2 (pág. 2)',
        recommendation:
          'usar encabezados `<th>` con scope o simplificar la tabla con títulos explícitos.',
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
        title: 'El concepto se presenta solo como párrafo',
        why: 'Una única forma de mostrar la idea deja afuera otros modos de comprenderla.',
        where: 'Sección 1 (pág. 1)',
        recommendation:
          'sumar un esquema simple o una lista de los sistemas involucrados.',
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
        title: 'Audio sin transcripción',
        why: 'El relato oral no está disponible como texto.',
        where: 'Recurso de audio, sección 3',
        recommendation: 'incorporar la transcripción junto al reproductor.',
      },
      {
        title: 'Video sin subtítulos',
        why: 'El contenido hablado no está disponible para quien no puede escuchar.',
        where: 'Video de la sección 3 (pág. 3)',
        recommendation:
          'agregar subtítulos cerrados o transcripción sincronizada.',
      },
      {
        title: 'Controles del reproductor poco visibles',
        why: 'Botones pequeños o de bajo contraste dificultan pausar o ajustar volumen.',
        where: 'Reproductor de audio, sección 3',
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
    title: 'Simplificar párrafo introductorio',
    dimension: 'Comprensión',
    severity: 'alta',
    criterion: 'Lenguaje claro',
    detected:
      'Un párrafo de una sola oración, con 46 palabras y 6 términos técnicos sin definir (autorregulación, constancia, sinérgica...).',
    why: 'Las oraciones muy extensas y el vocabulario técnico aumentan la carga de lectura y dificultan la comprensión para quienes leen o procesan la información de distintas formas.',
    proposes:
      'Dividir en 2 oraciones breves, usar palabras de uso cotidiano y conservar el concepto central del contenido.',
    location: 'Sección 1 · Párrafo 1 · Pág. 1',
    original:
      'La homeostasis es el conjunto de fenómenos de autorregulación que llevan al mantenimiento de la constancia en la composición y propiedades del medio interno de un organismo, siendo un proceso dinámico que requiere la coordinación de múltiples sistemas fisiológicos que operan de manera simultánea y sinérgica.',
    aiProposal:
      'La homeostasis es la capacidad del cuerpo de mantener un equilibrio interno estable.',
    editedProposal:
      'La homeostasis es la capacidad del cuerpo de mantener un equilibrio interno estable. Para lograrlo, distintos órganos y sistemas trabajan juntos al mismo tiempo.',
    variants: {
      simple:
        'La homeostasis es el equilibrio interno del cuerpo. El cuerpo lo mantiene estable con ayuda de varios órganos.',
      breve: 'La homeostasis es el equilibrio interno estable del cuerpo.',
      pasos:
        '1. El cuerpo detecta un cambio interno.\n2. Distintos órganos responden juntos.\n3. El equilibrio se mantiene. Eso es la homeostasis.',
      ejemplo:
        'La homeostasis es la capacidad del cuerpo de mantener un equilibrio interno estable. Por ejemplo, cuando hace calor, transpiramos para no subir demasiado la temperatura.',
      otra: 'El cuerpo busca un equilibrio interno estable. Esa capacidad se llama homeostasis. Varios órganos trabajan al mismo tiempo para lograrlo.',
    },
  },
  {
    id: 'seccion',
    title: 'Dividir sección 2 en subsecciones',
    dimension: 'Estructura',
    severity: 'media',
    criterion: 'Estructura predecible',
    detected:
      'La sección 2 es un único bloque de texto, sin subtítulos ni listas.',
    why: 'Sin cortes visibles cuesta anticipar de qué trata cada parte y volver a un tema puntual.',
    proposes: 'Crear tres subtítulos breves que nombren el tema de cada tramo.',
    location: 'Sección 2 · Pág. 2',
    original:
      'Los sistemas nervioso, endocrino y excretor participan en la regulación del medio interno. El nervioso responde rápido, el endocrino sostiene respuestas más largas y el excretor elimina desechos que alterarían el equilibrio.',
    aiProposal:
      'Varios sistemas regulan el medio interno.\n\nRespuesta rápida. El sistema nervioso reacciona enseguida.\n\nRespuesta sostenida. El sistema endocrino mantiene el ajuste.\n\nEliminación. El sistema excretor saca lo que alteraría el equilibrio.',
    editedProposal:
      'Varios sistemas regulan el medio interno.\n\nRespuesta rápida. El sistema nervioso reacciona enseguida.\n\nRespuesta sostenida. El sistema endocrino mantiene el ajuste.\n\nEliminación. El sistema excretor saca lo que alteraría el equilibrio.',
    variants: {
      simple:
        'Tres sistemas cuidan el equilibrio del cuerpo: el nervioso (rápido), el endocrino (sostenido) y el excretor (elimina desechos).',
      breve:
        'El equilibrio interno lo regulan el sistema nervioso, el endocrino y el excretor.',
      pasos:
        '1. El sistema nervioso responde rápido.\n2. El endocrino sostiene esa respuesta.\n3. El excretor elimina lo que desequilibra.',
      ejemplo:
        'Si tomás mucha agua, el sistema excretor ayuda a eliminar el exceso para que el medio interno siga estable.',
      otra: 'El medio interno se regula entre tres sistemas. Cada uno tiene un rol distinto y los tres se necesitan.',
    },
  },
  {
    id: 'alt',
    title: 'Agregar alt-text a imagen 1',
    dimension: 'Accesibilidad visual',
    severity: 'alta',
    criterion: 'Texto alternativo',
    detected:
      'La figura 1 no tiene descripción. El epígrafe solo dice «Esquema».',
    why: 'Sin alternativa textual, la información del esquema no está disponible para quien usa lector de pantalla.',
    proposes:
      'Describir qué muestra el esquema y cuál es su idea central, en una oración.',
    location: 'Sección 1 · Figura 1 · Pág. 1',
    original: '(sin descripción)',
    aiProposal:
      'Esquema de tres sistemas —nervioso, endocrino y excretor— que actúan a la vez para mantener el equilibrio interno del cuerpo.',
    editedProposal:
      'Esquema de tres sistemas —nervioso, endocrino y excretor— que actúan a la vez para mantener el equilibrio interno del cuerpo.',
    variants: {
      simple:
        'Dibujo de tres sistemas del cuerpo trabajando juntos para mantener el equilibrio interno.',
      breve:
        'Esquema: sistemas nervioso, endocrino y excretor regulan el equilibrio interno.',
      pasos:
        'El esquema muestra tres partes: sistema nervioso, sistema endocrino y sistema excretor. Las flechas indican que actúan al mismo tiempo.',
      ejemplo:
        'Esquema del equilibrio interno: como un equipo en el que cada sistema cumple una tarea distinta al mismo tiempo.',
      otra: 'Figura con los sistemas nervioso, endocrino y excretor alrededor del medio interno, unidos por flechas.',
    },
  },
  {
    id: 'glosario',
    title: 'Explicar «homeostasis» en el glosario',
    dimension: 'Comprensión',
    severity: 'media',
    criterion: 'Lenguaje claro',
    detected:
      'El término aparece tres veces y nunca se define con palabras de uso cotidiano.',
    why: 'Un término central sin definición frena la lectura de quien no lo conoce de antes.',
    proposes:
      'Agregar una entrada breve de glosario lateral en la primera aparición.',
    location: 'Sección 1 · Párrafo 1 · Pág. 1',
    original: 'homeostasis',
    aiProposal: 'Homeostasis: equilibrio interno estable del cuerpo.',
    editedProposal: 'Homeostasis: equilibrio interno estable del cuerpo.',
    variants: {
      simple:
        'Homeostasis: cuando el cuerpo mantiene sus condiciones internas estables.',
      breve: 'Homeostasis: equilibrio interno del cuerpo.',
      pasos:
        'Homeostasis\n1. El cuerpo detecta un cambio.\n2. Responde.\n3. Vuelve a un equilibrio estable.',
      ejemplo:
        'Homeostasis: equilibrio interno. Ejemplo: mantener la temperatura aunque afuera haga frío o calor.',
      otra: 'Homeostasis es la capacidad del cuerpo de conservar un equilibrio interno estable.',
    },
  },
  {
    id: 'audio',
    title: 'Transcribir el audio de la sección 3',
    dimension: 'Contenido multimedia',
    severity: 'media',
    criterion: 'Alternativa textual',
    detected: 'Hay un audio de 45 segundos sin transcripción ni resumen.',
    why: 'Quien no puede escuchar el audio pierde ese contenido por completo.',
    proposes: 'Publicar la transcripción debajo del reproductor.',
    location: 'Sección 3 · Audio 1',
    original: '(audio sin texto)',
    aiProposal:
      'Transcripción: el medio interno cambia todo el tiempo. Los sistemas del cuerpo detectan esos cambios y responden para volver a un equilibrio estable.',
    editedProposal:
      'Transcripción: el medio interno cambia todo el tiempo. Los sistemas del cuerpo detectan esos cambios y responden para volver a un equilibrio estable.',
    variants: {
      simple:
        'El cuerpo nota los cambios internos y responde para seguir en equilibrio. Eso explica el audio.',
      breve:
        'El audio explica que el cuerpo responde a los cambios para mantener el equilibrio.',
      pasos:
        '1. El medio interno cambia.\n2. El cuerpo lo detecta.\n3. Los sistemas responden y vuelve el equilibrio.',
      ejemplo:
        'Como cuando corrés y el corazón se acelera: el cuerpo responde para seguir en equilibrio.',
      otra: 'Texto del audio: los cambios del medio interno activan respuestas que devuelven el equilibrio.',
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
    name: 'Unidad_3_adaptado.pdf',
    detail: 'Material con todas las adaptaciones aceptadas · 2.1 MB',
  },
  {
    name: 'Informe_barreras.pdf',
    detail: 'Diagnóstico completo y registro de cambios · 380 KB',
  },
  {
    name: 'Unidad_3_adaptado.docx',
    detail: 'Versión editable del material adaptado · 1.1 MB',
  },
] as const;

export const APPLIED_CHANGES = [
  'Comprensión — Párrafo introductorio simplificado',
  'Accesibilidad visual — Alt-text añadido (imagen 1)',
  'Estructura — Sección 2 dividida en subsecciones',
  'Comprensión — Término “homeostasis” explicado en glosario',
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
