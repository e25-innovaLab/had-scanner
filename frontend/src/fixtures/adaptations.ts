import { ADAPTATION_STATUS, ADAPTATION_TYPE, type Adaptation, type AdaptationSummary } from '@/types';
import {
  findingComplexLanguage,
  findingLongSentence,
  findingManyActions,
  findingNoHeadings,
} from './diagnoses';

export const adaptationPending: Adaptation = {
  id: 'adaptation-1',
  findingId: findingLongSentence.id,
  type: ADAPTATION_TYPE.SPLIT_STEPS,
  status: ADAPTATION_STATUS.PENDING,
  original: findingLongSentence.fragment,
  proposed:
    '1. Leé el texto de la página 12 del manual.\n2. Subrayá las palabras que no conozcas.\n3. Buscá su significado en el diccionario.\n4. Escribí una oración con cada una.\n5. Dibujá en tu carpeta las cuatro etapas del ciclo del agua, en orden, con flechas.\n6. Debajo de cada dibujo, explicá qué sucede en esa etapa.',
};

export const adaptationAccepted: Adaptation = {
  id: 'adaptation-2',
  findingId: findingComplexLanguage.id,
  type: ADAPTATION_TYPE.PLAIN_LANGUAGE,
  status: ADAPTATION_STATUS.ACCEPTED,
  original: findingComplexLanguage.fragment,
  proposed: 'Marcá con flechas el orden de las etapas. Debajo de cada dibujo, explicá qué pasa en esa etapa.',
};

export const adaptationEdited: Adaptation = {
  id: 'adaptation-3',
  findingId: findingNoHeadings.id,
  type: ADAPTATION_TYPE.HEADING_STRUCTURE,
  status: ADAPTATION_STATUS.EDITED,
  original: findingNoHeadings.fragment,
  proposed: '# Actividad: el ciclo del agua\n## Consigna\n## Pasos\n## Entrega',
  finalContent: '# El ciclo del agua\n## Qué tenés que hacer\n## Paso a paso\n## Cuándo se entrega',
};

export const adaptationRejected: Adaptation = {
  id: 'adaptation-4',
  findingId: findingManyActions.id,
  type: ADAPTATION_TYPE.SPLIT_STEPS,
  status: ADAPTATION_STATUS.REJECTED,
  original: findingManyActions.fragment,
  proposed: 'Hacé estas tareas: leer, subrayar, buscar, escribir y dibujar.',
};

export const adaptations: Adaptation[] = [
  adaptationPending,
  adaptationAccepted,
  adaptationEdited,
  adaptationRejected,
];

export const adaptationSummary: AdaptationSummary = {
  total: 4,
  pending: 1,
  accepted: 1,
  edited: 1,
  rejected: 1,
};
