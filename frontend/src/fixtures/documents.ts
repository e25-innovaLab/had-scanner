import { DOCUMENT_TYPE, PDF_TAG_STATE, type PdfDocument, type TextDocument } from '@/types';

const LONG_INSTRUCTION =
  'Leé el texto de la página 12 del manual, subrayá las palabras que no conozcas, buscá su significado en el diccionario, escribí una oración con cada una y después dibujá en tu carpeta las cuatro etapas del ciclo del agua indicando con flechas el orden en que ocurren y explicando debajo de cada dibujo qué sucede en esa etapa.';

export const ACTIVITY_TEXT = `Actividad: el ciclo del agua. ${LONG_INSTRUCTION} Cuando termines, compará tu dibujo con el de un compañero y anoten juntos las diferencias que encuentren. Recordá que la actividad se entrega el viernes.`;

export const textDocument: TextDocument = {
  id: 'doc-text-1',
  name: 'Consigna: el ciclo del agua',
  type: DOCUMENT_TYPE.TEXT,
  extractedText: ACTIVITY_TEXT,
  language: 'es',
  uploadedAt: '2026-09-21T14:00:00.000Z',
  wordCount: 89,
};

export const pdfDocument: PdfDocument = {
  id: 'doc-pdf-1',
  name: 'guia-ecosistemas.pdf',
  type: DOCUMENT_TYPE.PDF,
  extractedText: ACTIVITY_TEXT,
  language: 'es',
  uploadedAt: '2026-09-21T14:05:00.000Z',
  pages: 3,
  hasTextLayer: true,
  tagState: PDF_TAG_STATE.TAGGED,
};

export const pdfWithoutText: PdfDocument = {
  id: 'doc-pdf-scanned',
  name: 'fotocopia-escaneada.pdf',
  type: DOCUMENT_TYPE.PDF,
  extractedText: '',
  language: 'es',
  uploadedAt: '2026-09-21T14:10:00.000Z',
  pages: 2,
  hasTextLayer: false,
  tagState: PDF_TAG_STATE.UNKNOWN,
};
