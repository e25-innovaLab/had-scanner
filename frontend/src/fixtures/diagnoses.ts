import {
  ANALYSIS_STATUS,
  DIMENSION,
  FINDING_ACTION,
  FINDING_SOURCE,
  SEVERITY_LEVEL,
  type Diagnosis,
  type Finding,
} from '@/types';
import { pdfDocument, pdfWithoutText, textDocument } from './documents';

const LONG_SENTENCE =
  'Leé el texto de la página 12 del manual, subrayá las palabras que no conozcas, buscá su significado en el diccionario, escribí una oración con cada una y después dibujá en tu carpeta las cuatro etapas del ciclo del agua indicando con flechas el orden en que ocurren y explicando debajo de cada dibujo qué sucede en esa etapa.';

const AI_UNAVAILABLE = 'El análisis con IA no estuvo disponible en esta corrida.';
const NO_SIGNAL_IN_TEXT = 'El texto pegado no trae información de este tipo.';

export const findingLongSentence: Finding = {
  id: 'finding-1',
  criterionId: 'comprehension.sentence_length',
  dimension: DIMENSION.COMPREHENSION,
  source: FINDING_SOURCE.RULE,
  severity: SEVERITY_LEVEL.BARRIER,
  fragment: LONG_SENTENCE,
  explanation: 'Una oración de 59 palabras exige retener demasiada información antes de llegar al punto.',
  recommendation: 'Dividir la consigna en pasos numerados, uno por acción.',
  action: FINDING_ACTION.SPLIT_STEPS,
  location: { paragraph: 1, range: [30, 330] },
  evidence: { measuredValue: 59, threshold: 30 },
};

export const findingManyActions: Finding = {
  id: 'finding-2',
  criterionId: 'comprehension.actions_per_instruction',
  dimension: DIMENSION.COMPREHENSION,
  source: FINDING_SOURCE.RULE,
  severity: SEVERITY_LEVEL.TO_REVIEW,
  fragment: LONG_SENTENCE,
  explanation: 'La misma instrucción pide cinco acciones distintas; es fácil perder alguna.',
  recommendation: 'Separar cada acción en un paso propio.',
  action: FINDING_ACTION.SPLIT_STEPS,
  location: { paragraph: 1, range: [30, 330] },
  evidence: { measuredValue: 5, threshold: 3 },
};

export const findingComplexLanguage: Finding = {
  id: 'finding-3',
  criterionId: 'comprehension.language_complexity',
  dimension: DIMENSION.COMPREHENSION,
  source: FINDING_SOURCE.AI,
  severity: SEVERITY_LEVEL.TO_REVIEW,
  fragment: 'indicando con flechas el orden en que ocurren y explicando debajo de cada dibujo qué sucede en esa etapa',
  explanation: 'Los gerundios encadenados ocultan que son dos tareas separadas.',
  recommendation: 'Reformular en oraciones cortas con un verbo principal cada una.',
  action: FINDING_ACTION.PLAIN_LANGUAGE,
  location: { paragraph: 1, range: [225, 330] },
};

export const findingNoHeadings: Finding = {
  id: 'finding-4',
  criterionId: 'structure.headings',
  dimension: DIMENSION.STRUCTURE,
  source: FINDING_SOURCE.RULE,
  severity: SEVERITY_LEVEL.TO_REVIEW,
  fragment: 'Actividad: el ciclo del agua.',
  explanation: 'El material no tiene títulos que separen consigna, desarrollo y entrega.',
  recommendation: 'Agregar un título por bloque: Consigna, Pasos, Entrega.',
  action: FINDING_ACTION.HEADING_STRUCTURE,
  location: { paragraph: 1, range: [0, 29] },
  evidence: { measuredValue: 0, threshold: 1 },
};

export const findingMissingAltText: Finding = {
  id: 'finding-5',
  criterionId: 'visual.alt_text',
  dimension: DIMENSION.VISUAL,
  source: FINDING_SOURCE.RULE,
  severity: SEVERITY_LEVEL.BARRIER,
  fragment: 'Figura 2: esquema del ecosistema (página 2)',
  explanation: 'Tres imágenes no tienen descripción; un lector de pantalla las omite.',
  recommendation: 'Escribir un texto alternativo que describa lo relevante de cada imagen.',
  action: FINDING_ACTION.ALT_TEXT,
  location: { page: 2 },
  evidence: { measuredValue: 3, threshold: 0 },
};

export const findingLowContrast: Finding = {
  id: 'finding-6',
  criterionId: 'visual.contrast',
  dimension: DIMENSION.VISUAL,
  source: FINDING_SOURCE.RULE,
  severity: SEVERITY_LEVEL.TO_REVIEW,
  fragment: 'Recuadro "Para pensar" (página 3)',
  explanation: 'El texto gris sobre fondo celeste queda por debajo del contraste mínimo.',
  recommendation: 'Usar texto oscuro sobre fondo claro en los recuadros.',
  action: FINDING_ACTION.MANUAL,
  location: { page: 3 },
  evidence: { measuredValue: '3.9:1', threshold: '4.5:1' },
};

export const diagnosisComplete: Diagnosis = {
  documentId: textDocument.id,
  status: ANALYSIS_STATUS.COMPLETE,
  score: 62,
  evaluatedCriteria: 7,
  totalCriteria: 14,
  dimensions: [
    { dimension: DIMENSION.COMPREHENSION, score: 40, findingsCount: 3, evaluatedCriteria: 3, totalCriteria: 3 },
    { dimension: DIMENSION.STRUCTURE, score: 70, findingsCount: 1, evaluatedCriteria: 2, totalCriteria: 2 },
    { dimension: DIMENSION.VISUAL, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 4 },
    { dimension: DIMENSION.ALTERNATIVES, score: 100, findingsCount: 0, evaluatedCriteria: 1, totalCriteria: 1 },
    { dimension: DIMENSION.MULTIMEDIA, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 2 },
    { dimension: DIMENSION.NAVIGATION, score: 100, findingsCount: 0, evaluatedCriteria: 1, totalCriteria: 2 },
  ],
  findings: [findingLongSentence, findingManyActions, findingComplexLanguage, findingNoHeadings],
  nonEvaluableCriteria: [
    { criterionId: 'visual.legibility', dimension: DIMENSION.VISUAL, reason: NO_SIGNAL_IN_TEXT },
    { criterionId: 'visual.contrast', dimension: DIMENSION.VISUAL, reason: NO_SIGNAL_IN_TEXT },
    { criterionId: 'visual.alt_text', dimension: DIMENSION.VISUAL, reason: NO_SIGNAL_IN_TEXT },
    { criterionId: 'visual.image_only_information', dimension: DIMENSION.VISUAL, reason: NO_SIGNAL_IN_TEXT },
    { criterionId: 'multimedia.video_captions', dimension: DIMENSION.MULTIMEDIA, reason: NO_SIGNAL_IN_TEXT },
    { criterionId: 'multimedia.audio_transcript', dimension: DIMENSION.MULTIMEDIA, reason: NO_SIGNAL_IN_TEXT },
    { criterionId: 'navigation.links', dimension: DIMENSION.NAVIGATION, reason: NO_SIGNAL_IN_TEXT },
  ],
};

export const diagnosisPartial: Diagnosis = {
  documentId: pdfDocument.id,
  status: ANALYSIS_STATUS.PARTIAL,
  score: 48,
  evaluatedCriteria: 6,
  totalCriteria: 14,
  dimensions: [
    { dimension: DIMENSION.COMPREHENSION, score: 35, findingsCount: 2, evaluatedCriteria: 2, totalCriteria: 3 },
    { dimension: DIMENSION.STRUCTURE, score: 70, findingsCount: 1, evaluatedCriteria: 1, totalCriteria: 2 },
    { dimension: DIMENSION.VISUAL, score: 30, findingsCount: 2, evaluatedCriteria: 2, totalCriteria: 4 },
    { dimension: DIMENSION.ALTERNATIVES, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 1 },
    { dimension: DIMENSION.MULTIMEDIA, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 2 },
    { dimension: DIMENSION.NAVIGATION, score: 100, findingsCount: 0, evaluatedCriteria: 1, totalCriteria: 2 },
  ],
  findings: [
    findingLongSentence,
    findingManyActions,
    findingNoHeadings,
    findingMissingAltText,
    findingLowContrast,
  ],
  nonEvaluableCriteria: [
    { criterionId: 'comprehension.language_complexity', dimension: DIMENSION.COMPREHENSION, reason: AI_UNAVAILABLE },
    { criterionId: 'structure.long_blocks', dimension: DIMENSION.STRUCTURE, reason: AI_UNAVAILABLE },
    { criterionId: 'alternatives.text_alternatives', dimension: DIMENSION.ALTERNATIVES, reason: AI_UNAVAILABLE },
    { criterionId: 'visual.legibility', dimension: DIMENSION.VISUAL, reason: 'El PDF no expone el tamaño de fuente.' },
    { criterionId: 'visual.image_only_information', dimension: DIMENSION.VISUAL, reason: AI_UNAVAILABLE },
    { criterionId: 'multimedia.video_captions', dimension: DIMENSION.MULTIMEDIA, reason: 'Un PDF no contiene video.' },
    { criterionId: 'multimedia.audio_transcript', dimension: DIMENSION.MULTIMEDIA, reason: 'Un PDF no contiene audio.' },
    { criterionId: 'navigation.links', dimension: DIMENSION.NAVIGATION, reason: 'El documento no tiene enlaces.' },
  ],
};

export const diagnosisNotAnalyzable: Diagnosis = {
  documentId: pdfWithoutText.id,
  status: ANALYSIS_STATUS.NOT_ANALYZABLE,
  evaluatedCriteria: 0,
  totalCriteria: 14,
  dimensions: [
    { dimension: DIMENSION.COMPREHENSION, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 3 },
    { dimension: DIMENSION.STRUCTURE, findingsCount: 1, evaluatedCriteria: 0, totalCriteria: 2 },
    { dimension: DIMENSION.VISUAL, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 4 },
    { dimension: DIMENSION.ALTERNATIVES, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 1 },
    { dimension: DIMENSION.MULTIMEDIA, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 2 },
    { dimension: DIMENSION.NAVIGATION, findingsCount: 0, evaluatedCriteria: 0, totalCriteria: 2 },
  ],
  findings: [
    {
      id: 'finding-no-text',
      criterionId: 'document.text_layer',
      dimension: DIMENSION.STRUCTURE,
      source: FINDING_SOURCE.RULE,
      severity: SEVERITY_LEVEL.BARRIER,
      fragment: pdfWithoutText.name,
      explanation: 'El PDF es una imagen escaneada: no tiene texto que se pueda leer ni analizar.',
      recommendation: 'Volver a exportar el documento desde el original o pegar el texto directamente.',
      action: FINDING_ACTION.MANUAL,
      location: { page: 1 },
    },
  ],
  nonEvaluableCriteria: [
    { criterionId: 'comprehension.sentence_length', dimension: DIMENSION.COMPREHENSION, reason: 'Sin texto extraíble.' },
    { criterionId: 'structure.headings', dimension: DIMENSION.STRUCTURE, reason: 'Sin texto extraíble.' },
    { criterionId: 'visual.alt_text', dimension: DIMENSION.VISUAL, reason: 'Sin texto extraíble.' },
  ],
};
