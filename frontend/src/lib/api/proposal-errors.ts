import { ApiError } from '@/lib/api/client';

export function proposalGenerationMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 502 || err.status === 503) {
      return 'El servicio de IA está saturado o no respondió. Probá de nuevo en unos minutos. Este fallo no descontó un intento.';
    }
    if (err.status === 408 || err.status === 504) {
      return 'La IA no respondió a tiempo. Este fallo no descontó un intento.';
    }
    if (err.status >= 500) {
      return 'No se pudo generar la propuesta por un error del servidor. Este fallo no descontó un intento.';
    }
    if (err.message.trim()) {
      return `${err.message} Este fallo no descontó un intento.`;
    }
  }

  if (err instanceof TypeError) {
    return 'No hubo conexión con el servidor. Revisá que la API esté en marcha. Este fallo no descontó un intento.';
  }

  if (err instanceof Error && err.message.trim()) {
    return `${err.message} Este fallo no descontó un intento.`;
  }

  return 'No se pudo generar la propuesta. Este fallo no descontó un intento.';
}
