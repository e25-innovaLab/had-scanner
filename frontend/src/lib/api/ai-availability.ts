/** Detect and present Gemini / IA availability failures to the user. */

const GEMINI_HINTS = [
  'gemini',
  'servicio de ia',
  'cuota',
  'saturado',
  'no es un fallo de vera',
  'agotó',
  'high demand',
  'unavailable',
  'resource_exhausted',
];

export function isAiAvailabilityMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lowered = message.toLowerCase();
  return GEMINI_HINTS.some((token) => lowered.includes(token));
}

export function analysisFailureTitle(message: string | null | undefined): string {
  if (isAiAvailabilityMessage(message)) {
    return 'La IA no pudo completar el análisis';
  }
  return 'No se pudo completar el análisis';
}

export function analysisIncompleteHint(message: string | null | undefined): string | null {
  if (!message?.trim()) return null;
  return message.trim();
}
