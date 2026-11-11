import { ApiError } from '@/lib/api/client';
import { isAiAvailabilityMessage } from '@/lib/api/ai-availability';

function withAttemptNote(message: string): string {
  if (message.includes('no descontó un intento')) return message;
  return `${message} Este fallo no descontó un intento.`;
}

export function proposalGenerationMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = err.message.trim();

    if (detail && isAiAvailabilityMessage(detail)) {
      return withAttemptNote(detail);
    }

    if (err.status === 429) {
      return withAttemptNote(
        'Se agotó la cuota de la API de Gemini. No es un fallo de VERA: reintentá más tarde.',
      );
    }
    if (err.status === 502 || err.status === 503) {
      return withAttemptNote(
        'El servicio de IA (Gemini) está saturado o no disponible. No es un fallo de VERA: reintentá en unos minutos.',
      );
    }
    if (err.status === 408 || err.status === 504) {
      return withAttemptNote(
        'La IA no respondió a tiempo. No es un fallo de VERA: reintentá en unos minutos.',
      );
    }
    if (err.status >= 500) {
      return withAttemptNote(
        'No se pudo generar la propuesta por un error del servidor.',
      );
    }
    if (detail) {
      return withAttemptNote(detail);
    }
  }

  if (err instanceof TypeError) {
    return withAttemptNote(
      'No hubo conexión con el servidor. Revisá que la API esté en marcha.',
    );
  }

  if (err instanceof Error && err.message.trim()) {
    return withAttemptNote(err.message.trim());
  }

  return withAttemptNote('No se pudo generar la propuesta.');
}
