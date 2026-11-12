export const VERA_SOURCE = {
  mock: "mock",
  api: "api",
} as const;

export type VeraSource = (typeof VERA_SOURCE)[keyof typeof VERA_SOURCE];

const STORAGE_KEY = "vera-data-source";

export function isVeraSource(value: string): value is VeraSource {
  return value === VERA_SOURCE.mock || value === VERA_SOURCE.api;
}

export function readVeraSource(): VeraSource | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || !isVeraSource(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeVeraSource(source: VeraSource) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    // ignore
  }
}

export function clearVeraSource() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function veraSourceLabel(source: VeraSource): string {
  return source === VERA_SOURCE.api ? "API real" : "Demo (mock)";
}
