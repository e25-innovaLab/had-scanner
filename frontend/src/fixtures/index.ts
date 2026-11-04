export { ACTIVITY_TEXT, textDocument, pdfDocument, pdfWithoutText } from './documents';
export {
  findingLongSentence,
  findingManyActions,
  findingComplexLanguage,
  findingNoHeadings,
  findingMissingAltText,
  findingLowContrast,
  diagnosisComplete,
  diagnosisPartial,
  diagnosisNotAnalyzable,
} from './diagnoses';
export {
  adaptationPending,
  adaptationAccepted,
  adaptationEdited,
  adaptationRejected,
  adaptations,
  adaptationSummary,
} from './adaptations';
