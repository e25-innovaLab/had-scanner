import { ApiError } from "@/lib/api/client";
import {
  AI_UNAVAILABLE_USER_MESSAGE,
  isAiAvailabilityMessage,
  isAiHttpStatus,
  toUserFacingErrorMessage,
} from "@/lib/api/ai-availability";

function withAttemptNote(message: string): string {
  if (message.includes("no descontó un intento")) return message;
  return `${message} Este fallo no descontó un intento.`;
}

export function proposalGenerationMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (isAiHttpStatus(err.status) || isAiAvailabilityMessage(err.message)) {
      return withAttemptNote(AI_UNAVAILABLE_USER_MESSAGE);
    }

    if (err.status >= 500) {
      return withAttemptNote(
        "No se pudo generar la propuesta. Reintentá en unos minutos.",
      );
    }

    const detail = err.message.trim();
    if (detail) {
      return withAttemptNote(
        toUserFacingErrorMessage(detail, {
          status: err.status,
          fallback: "No se pudo generar la propuesta.",
        }),
      );
    }
  }

  if (err instanceof TypeError) {
    return withAttemptNote(
      "No hubo conexión con el servidor. Revisá tu conexión e intentá de nuevo.",
    );
  }

  if (err instanceof Error && err.message.trim()) {
    return withAttemptNote(
      toUserFacingErrorMessage(err.message, {
        fallback: "No se pudo generar la propuesta.",
      }),
    );
  }

  return withAttemptNote("No se pudo generar la propuesta.");
}
