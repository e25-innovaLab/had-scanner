export const DOCUMENT_TYPE = {
  PDF: 'pdf',
  TEXT: 'text',
} as const;

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

export const PDF_TAG_STATE = {
  TAGGED: 'tagged',
  UNTAGGED: 'untagged',
  UNKNOWN: 'unknown',
} as const;

export type PdfTagState = (typeof PDF_TAG_STATE)[keyof typeof PDF_TAG_STATE];

interface DocumentBase {
  id: string;
  name: string;
  extractedText: string;
  language: string;
  uploadedAt: string;
}

export interface TextDocument extends DocumentBase {
  type: typeof DOCUMENT_TYPE.TEXT;
  wordCount: number;
}

export interface PdfDocument extends DocumentBase {
  type: typeof DOCUMENT_TYPE.PDF;
  pages: number;
  hasTextLayer: boolean;
  tagState: PdfTagState;
}

export type Document = TextDocument | PdfDocument;
