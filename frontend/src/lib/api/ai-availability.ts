/** Detect and present Gemini / IA availability failures to the user. */

export const AI_UNAVAILABLE_USER_MESSAGE =
  "El servicio de inteligencia artificial está con mucha demanda o no está disponible por ahora. No es un problema de VERA: probá de nuevo en unos minutos.";

const GEMINI_HINTS = [
  "gemini",
  "servicio de ia",
  "inteligencia artificial",
  "cuota",
  "saturado",
  "no es un fallo de vera",
  "no es un problema de vera",
  "agotó",
  "high demand",
  "unavailable",
  "resource_exhausted",
  "overloaded",
  "api key",
  "api_key",
  "gemini_api_key",
  "plan free",
  "quota",
  "rate limit",
  "rate_limit",
  "permission_denied",
  "deadline",
];

const AI_HTTP_STATUSES = new Set([402, 408, 429, 500, 502, 503, 504]);

export function isAiAvailabilityMessage(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  const lowered = message.toLowerCase();
  if (/^error http\s*\d+/i.test(message.trim())) return true;
  return GEMINI_HINTS.some((token) => lowered.includes(token));
}

export function isAiHttpStatus(status: number | null | undefined): boolean {
  if (status == null || !Number.isFinite(status)) return false;
  return AI_HTTP_STATUSES.has(status);
}

/**
 * Rewrite technical Gemini / HTTP failures into a coherent user-facing line.
 * Leaves already clear Spanish product messages untouched when they are not AI noise.
 */
export function toUserFacingErrorMessage(
  message: string | null | undefined,
  opts?: { status?: number; fallback?: string },
): string {
  const fallback =
    opts?.fallback ??
    "No se pudo completar la operación. Reintentá en unos minutos.";
  const raw = message?.trim() ?? "";
  const status = opts?.status;

  if (isAiHttpStatus(status) || isAiAvailabilityMessage(raw)) {
    return AI_UNAVAILABLE_USER_MESSAGE;
  }

  if (!raw) return fallback;

  if (/^error http\s*\d+/i.test(raw)) {
    return AI_UNAVAILABLE_USER_MESSAGE;
  }

  // English FastAPI-style leaks that should not reach the teacher UI.
  if (
    /\b(not found|only pending|unprocessable|internal server|bad request|unauthorized|forbidden)\b/i.test(
      raw,
    )
  ) {
    return fallback;
  }

  return raw;
}

export function analysisFailureTitle(
  message: string | null | undefined,
): string {
  if (isAiAvailabilityMessage(message)) {
    return "La IA no pudo completar el análisis";
  }
  return "No se pudo completar el análisis";
}

export function analysisIncompleteHint(
  message: string | null | undefined,
): string | null {
  if (!message?.trim()) return null;
  return toUserFacingErrorMessage(message, {
    fallback: AI_UNAVAILABLE_USER_MESSAGE,
  });
}
