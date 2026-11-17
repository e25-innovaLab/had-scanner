const STORAGE_KEY = "vera-guest-session";

export function hasGuestSession(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function startGuestSession() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Ignore private-mode / blocked storage.
  }
}

export function clearGuestSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore private-mode / blocked storage.
  }
}
